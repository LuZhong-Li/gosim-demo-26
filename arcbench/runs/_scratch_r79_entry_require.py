"""r78 lost three tasks to a crash *while a module was being required*.

Stage-2 stdout:
    TypeError: repos.find is not a function
        at Object.<anonymous> (/workspace/template/backend/src/seed.js:34:20)
        at Object.<anonymous> (/workspace/template/backend/src/index.js:7:1)
Stage-3 stdout:
    TypeError: Cannot read properties of undefined (reading 'alice-dev')
        at ensureUser (/workspace/template/backend/src/pulls.js:17:24)
        at Object.<anonymous> (.../pulls.js:207:1)

All three died before app.listen(), so the runner saw "template application
server exited before becoming ready" and every scenario scored zero. This probe
builds that shape (entry requires a seed module that throws at import), runs the
real guard against it, and checks that the port is bound afterwards.
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

RUNS = Path(__file__).resolve().parent
REPO = RUNS.parent.parent
AGENT = REPO / "arcbench" / "agent"
PROBE_ROOT = RUNS / "_r79_entry_require"
PROBE = PROBE_ROOT / "app"
DEPS_ZIP = REPO / "arcbench" / "dist" / "selftest-r71-ghstage1-served.zip"

sys.path.insert(0, str(AGENT))

from guard import guard_entry_requires  # noqa: E402

SEED_JS = """// The generated seed does its work at import time (r78 Stage-2 / Sheet shape).
const repos = store.collection('repos');
const owner = repos.find((entry) => entry.name === 'acme-docs');

function seed() {
  console.log('seed ran');
}

module.exports = { seed };
"""

INDEX_JS = """const app = require('./app');
const { seed } = require('./seed');

seed();

const port = Number(process.env.PORT || 3231);
app.listen(port, () => console.log('Backend listening on ' + port));
"""

APP_JS = """const express = require('express');
const app = express();

app.get('/api/health', (req, res) => res.json({ ok: true }));

module.exports = app;
"""

#: The store the seed reads: ``collection('repos')`` answers something that has no
#: ``find`` - exactly what "repos.find is not a function" means.
STORE_JS = """const state = {};

function collection(name) {
  // r78's store answered an object here, so `.find` blew up instead of the
  // collection being undefined.
  return state[name] || {};
}

module.exports = { collection };
"""


def write_probe() -> None:
    src = PROBE / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "app.js").write_text(APP_JS, encoding="utf-8")
    (src / "store.js").write_text(STORE_JS, encoding="utf-8")
    seed = SEED_JS.replace("store.collection", "require('./store').collection")
    (src / "seed.js").write_text(seed, encoding="utf-8")
    (src / "index.js").write_text(INDEX_JS, encoding="utf-8")
    manifest = PROBE / "backend" / "node_modules" / "express" / "package.json"
    if not manifest.is_file() and DEPS_ZIP.is_file():
        with zipfile.ZipFile(DEPS_ZIP) as archive:
            archive.extractall(PROBE, members=[name for name in archive.namelist()
                                              if name.startswith("backend/node_modules/")])


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def boot(port: int, timeout: float = 20.0) -> tuple[int, str, str]:
    env = dict(os.environ)
    env["PORT"] = str(port)
    proc = subprocess.Popen(["node", "backend/src/index.js"], cwd=str(PROBE), env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                            encoding="utf-8", errors="replace")
    deadline = time.time() + timeout
    answered = False
    while time.time() < deadline:
        if proc.poll() is not None:
            break
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=1):
                answered = True
                break
        except urllib.error.HTTPError:
            answered = True
            break
        except Exception:
            time.sleep(0.4)
    if proc.poll() is None:
        proc.terminate()
    try:
        out, err = proc.communicate(timeout=15)
    except subprocess.TimeoutExpired:
        proc.kill()
        out, err = proc.communicate(timeout=15)
    if answered and "Backend listening" in out:
        return 0, out, err
    return (proc.returncode if proc.returncode is not None else 1), out, err


def main() -> int:
    write_probe()
    failures: list[str] = []

    # --- before: the r78 shape kills the process before it can listen --------
    before_rc, before_out, before_err = boot(free_port())
    print(f"before: rc={before_rc} {before_err.strip().splitlines()[:2]}")
    if before_rc == 0:
        failures.append("the unguarded probe booted; the repro is wrong")
    if "is not a function" not in before_err:
        failures.append("the r78 TypeError did not reproduce")

    # --- after: the same file, with the entry guard applied ------------------
    changes = guard_entry_requires(PROBE)
    print(f"guard -> {changes}")
    if not changes:
        failures.append("guard_entry_requires reported no change")
    again = guard_entry_requires(PROBE)
    if again:
        failures.append(f"guard is not idempotent: {again}")
    body = (PROBE / "backend" / "src" / "index.js").read_text(encoding="utf-8")
    if "const app = require('./app');" not in body:
        failures.append("the app require must stay untouched")

    after_rc, after_out, after_err = boot(free_port())
    print(f"after : rc={after_rc} out={after_out.strip().splitlines()[:2]}")
    if after_rc != 0 or "Backend listening" not in after_out:
        failures.append(f"the guarded entry still failed: {after_err.strip()[:160]}")
    if "require(./seed) failed at import" not in after_err:
        failures.append("the guard did not report the failed require")

    # --- scenario 2: r79's shape - the seed *call* throws, not the require ---
    # github/stage-3 both died with `at seed (seed.js:46)` called from
    # `index.js:35`, which wrapping the require alone cannot catch.
    call_src = PROBE / "backend" / "src"
    (call_src / "seed.js").write_text(
        "function seed(store) {\n"
        "  const users = undefined;\n"
        "  users.findUserByUsername('repo-owner');\n"
        "}\n"
        "module.exports = { seed };\n",
        encoding="utf-8",
    )
    (call_src / "index.js").write_text(
        "const app = require('./app');\n"
        "const { seed } = require('./seed');\n"
        "seed();\n"
        "const port = Number(process.env.PORT || 3231);\n"
        "app.listen(port, () => console.log('Backend listening on ' + port));\n",
        encoding="utf-8",
    )
    call_before_rc, _, call_before_err = boot(free_port())
    print(f"call-before: rc={call_before_rc} {call_before_err.strip().splitlines()[:1]}")
    if call_before_rc == 0:
        failures.append("the unguarded seed call booted; the repro is wrong")
    call_changes = guard_entry_requires(PROBE)
    print(f"call-guard -> {call_changes}")
    if not call_changes:
        failures.append("the seed call was not wrapped")
    call_after_rc, call_after_out, _ = boot(free_port())
    print(f"call-after : rc={call_after_rc} out={call_after_out.strip().splitlines()[:1]}")
    if call_after_rc != 0 or "Backend listening" not in call_after_out:
        failures.append("a throwing seed call still stops the server")

    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: a seed that throws at import no longer stops the server")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
