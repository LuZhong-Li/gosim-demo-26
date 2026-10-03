"""Local assertion for the r77 router-call guard (guard.ensure_router_call_guard).

Evidence, straight out of r74's Stage-1 stdout:

    TypeError: argument handler must be a function
        at Route.<computed> [as post] (.../router/lib/route.js:228:15)
        at Router.<computed> [as post] (.../router/index.js:448:19)
        at Object.<anonymous> (/workspace/template/backend/src/pr.js:67:8)
        at Object.<anonymous> (/workspace/template/backend/src/app.js:7:18)

So the shape to reproduce is a router created inside a module and registered
with a handler expression that evaluates to undefined. The probe below builds
that project with the real express 5.2.1 the templates pin, runs it once with
no guard (must die with that TypeError) and once after ensure_router_call_guard
(must boot, listen and answer), and checks the guard is idempotent.
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
PROBE_ROOT = RUNS / "_r77_router_probe"
PROBE = PROBE_ROOT / "app"
#: A self-test bundle that carries the backend dependencies as real (hoisted)
#: directories, so the probe can run offline: the pnpm store under
#: arcbench/reference only keeps dangling junctions since the templates moved.
DEPS_ZIP = REPO / "arcbench" / "dist" / "selftest-r71-ghstage1-served.zip"

sys.path.insert(0, str(AGENT))
from guard import ensure_router_call_guard  # noqa: E402

PR_JS = """const express = require('express');
const router = express.Router();

// The r74 shape: a handler factory that returns nothing at all.
function makeHandler() {
  return undefined;
}

router.get('/api/prs', makeHandler());
router.post('/api/prs', undefined);

// A registration that must survive untouched: the path has to reach express.
router.get('/live', (req, res) => res.json({ ok: true }));

module.exports = router;
"""

APP_JS = """const express = require('express');
const app = express();
const pr = require('./pr');

app.use(express.json());
// The r68/r70 shape: a mount argument that evaluates to undefined.
app.use('/api/nothing', undefined);
app.use(pr);

module.exports = app;
"""

INDEX_JS = """const app = require('./app');
const port = Number(process.env.PORT || 3211);
app.listen(port, () => console.log('Backend listening on ' + port));
"""


def write_probe() -> Path:
    src = PROBE / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "pr.js").write_text(PR_JS, encoding="utf-8")
    (src / "app.js").write_text(APP_JS, encoding="utf-8")
    (src / "index.js").write_text(INDEX_JS, encoding="utf-8")
    return PROBE


def ensure_express() -> bool:
    """Give the probe a real express install (no npm on this box: unpack one)."""
    manifest = PROBE / "backend" / "node_modules" / "express" / "package.json"
    if manifest.is_file():
        return True
    if not DEPS_ZIP.is_file():
        return False
    with zipfile.ZipFile(DEPS_ZIP) as archive:
        members = [name for name in archive.namelist()
                   if name.startswith("backend/node_modules/")]
        archive.extractall(PROBE, members=members)
    version = ""
    if manifest.is_file():
        version = manifest.read_text(encoding="utf-8", errors="replace")
        version = version.split('"version"')[1].split(",")[0].strip(' :"') if '"version"' in version else ""
    print(f"express unpacked from {DEPS_ZIP.name}: {version}")
    return manifest.is_file()


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def boot(project: Path, port: int, timeout: float = 25.0) -> tuple[int, str, str]:
    """Start `node backend/src/index.js` and return (rc, stdout, stderr)."""
    env = dict(os.environ)
    env["PORT"] = str(port)
    proc = subprocess.Popen(
        ["node", "backend/src/index.js"],
        cwd=str(project), env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        encoding="utf-8", errors="replace",
    )
    deadline = time.time() + timeout
    answered = False
    while time.time() < deadline:
        if proc.poll() is not None:
            break
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/prs", timeout=1):
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
    project = write_probe()
    if not ensure_express():
        print("SKIP: express could not be installed into the probe (offline?)")
        return 0
    failures: list[str] = []

    # --- before: no guard, the process must die exactly like r74 did --------
    before_rc, before_out, before_err = boot(project, free_port())
    if before_rc == 0:
        failures.append("the unguarded probe booted; the repro does not reproduce r74")
    if "argument handler must be a function" not in before_err:
        failures.append("the unguarded probe did not raise the r74 TypeError")

    # --- after: install the guard, the same project must serve --------------
    installed = ensure_router_call_guard(project)
    if not installed:
        failures.append("ensure_router_call_guard reported no change")
    shim = project / "backend" / "src" / "__arc_router_guard__.js"
    if not shim.is_file():
        failures.append("the shim was not written")
    index_body = (project / "backend" / "src" / "index.js").read_text(encoding="utf-8")
    if not index_body.startswith("require('./__arc_router_guard__')"):
        failures.append("the entry does not require the shim first")
    again = ensure_router_call_guard(project)
    if again:
        failures.append(f"the guard is not idempotent: {again}")

    after_rc, after_out, after_err = boot(project, free_port())
    if after_rc != 0 or "Backend listening" not in after_out:
        detail = " | ".join(after_err.strip().splitlines()[:3])
        failures.append(f"the guarded probe still failed (rc={after_rc}): {detail}")
    if "arc: dropped" not in after_err:
        failures.append("the guard did not report dropping a non-function handler")

    # The path argument must survive the handler filter: a guarded
    # `router.get('/live', fn)` has to answer, not be re-registered as
    # `router.get(fn)` (path-to-regexp then parses the function source).
    live_port = free_port()
    live_env = dict(os.environ)
    live_env["PORT"] = str(live_port)
    live_proc = subprocess.Popen(["node", "backend/src/index.js"], cwd=str(project),
                                 env=live_env, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 text=True, encoding="utf-8", errors="replace")
    live_body = ""
    try:
        for _ in range(30):
            time.sleep(0.4)
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{live_port}/live", timeout=2) as response:
                    live_body = response.read(200).decode("utf-8", "ignore")
                    break
            except urllib.error.HTTPError as error:
                live_body = f"HTTP {error.code}"
                break
            except Exception:
                continue
    finally:
        live_proc.terminate()
        try:
            live_proc.wait(timeout=5)
        except Exception:
            live_proc.kill()
    if '"ok":true' not in live_body.replace(" ", ""):
        failures.append(f"a valid router.get('/live', fn) did not survive the guard: {live_body[:120]!r}")

    reproduced = "argument handler must be a function" in before_err
    print(f"before: rc={before_rc} "
          f"{'TypeError reproduced' if reproduced else 'no TypeError'}")
    last = after_out.strip().splitlines()[-1] if after_out.strip() else ""
    print(f"after : rc={after_rc} {last}")
    print(f"changes: {installed}")
    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: router-call guard turns the r74 crash into a served app")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
