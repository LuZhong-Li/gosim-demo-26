"""r79 Stage-1 died at startup on an Express-4 style trailing wildcard.

    PathError [TypeError]: Missing parameter name at index 34:
        /repos/:owner/:name/blob/:branch/*
        at parse (.../path-to-regexp/dist/index.js:140:26)

Express 5 (path-to-regexp v8) wants the wildcard named, so ``/:branch/*`` has to
become ``/:branch/*splat``. This probe registers exactly that route, boots it,
then runs ``fix_wildcard_routes`` and boots it again.
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
PROBE = RUNS / "_r80_wildcard" / "app"
DEPS_ZIP = REPO / "arcbench" / "dist" / "selftest-r71-ghstage1-served.zip"

sys.path.insert(0, str(AGENT))

from guard import fix_wildcard_routes  # noqa: E402

APP_JS = """const express = require('express');
const app = express();

// The r79 Stage-1 route, verbatim in shape.
app.get('/repos/:owner/:name/blob/:branch/*', (req, res) => {
  res.json({ ok: true, path: req.path, params: req.params });
});

module.exports = app;
"""

INDEX_JS = """const app = require('./app');
const port = Number(process.env.PORT || 3241);
app.listen(port, () => console.log('Backend listening on ' + port));
"""


def write_probe() -> None:
    src = PROBE / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "app.js").write_text(APP_JS, encoding="utf-8")
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
            with urllib.request.urlopen(
                    f"http://127.0.0.1:{port}/repos/acme/acme-docs/blob/main/src/app.js",
                    timeout=1) as response:
                answered = b'"ok":true' in response.read(300)
                break
        except urllib.error.HTTPError as error:
            answered = error.code == 200
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

    before_rc, _, before_err = boot(free_port())
    print(f"before: rc={before_rc} {before_err.strip().splitlines()[:2]}")
    if before_rc == 0:
        failures.append("the unguarded route registered; the repro is wrong")
    if "Missing parameter name" not in before_err:
        failures.append("the r79 PathError did not reproduce")

    changes = fix_wildcard_routes(PROBE)
    print(f"fix_wildcard_routes -> {changes}")
    if not changes:
        failures.append("fix_wildcard_routes reported no change")
    again = fix_wildcard_routes(PROBE)
    if again:
        failures.append(f"the rewrite is not idempotent: {again}")
    body = (PROBE / "backend" / "src" / "app.js").read_text(encoding="utf-8")
    if "/:branch/*splat" not in body:
        failures.append(f"the trailing wildcard was not named: {body[:160]}")

    after_rc, after_out, after_err = boot(free_port())
    print(f"after : rc={after_rc} out={after_out.strip().splitlines()[:1]}")
    if after_rc != 0 or "Backend listening" not in after_out:
        failures.append(f"the rewritten route still fails: {after_err.strip()[:140]}")

    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: an Express-4 trailing wildcard becomes a named splat and serves")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
