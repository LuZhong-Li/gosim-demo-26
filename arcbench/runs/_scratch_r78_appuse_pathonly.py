"""The r76 Stage-2 boot crash: __arcUse dropped the handler and still mounted.

Straight out of r76's Stage-2 stdout (43 minutes, score 0.0):

    [template-app.stderr] arc: dropped 1 non-function middleware argument(s) instead of crashing
    [template-app.stderr] TypeError: app.use() requires a middleware function
    [template-app.stderr]     at Function.use (.../express/lib/application.js:213:11)
    [template-app.stderr]     at __arcUse (/workspace/template/backend/src/app.js:50:17)
    [template-app.stderr]     at Object.<anonymous> (/workspace/template/backend/src/app.js:299:1)
    [template-app.stderr]     at Object.<anonymous> (/workspace/template/backend/src/index.js:1:13)

So the text-level guard did its filtering job and then handed express a bare path.
This probe builds a generated-looking backend, runs the *real* passes against it
and boots it twice: once with guard_app_use() alone (must die with exactly that
TypeError) and once with ensure_router_call_guard() added on top (must serve).
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
PROBE_ROOT = RUNS / "_r78_appuse_pathonly"
PROBE = PROBE_ROOT / "app"
DEPS_ZIP = REPO / "arcbench" / "dist" / "selftest-r71-ghstage1-served.zip"

sys.path.insert(0, str(AGENT))

from guard import ensure_frontend_serving, ensure_router_call_guard, guard_app_use  # noqa: E402

#: The helper exactly as r76 shipped it: it filtered the arguments and then
#: forwarded whatever was left, bare path included.
ARC_USE_HELPER_R76 = '''

// ARC agent: a mount expression that evaluates to undefined makes express throw
// "argument handler must be a function" while this file is still loading, so the
// server never binds the port and every scenario scores zero (r68 Stage 1 and
// r70 Stage 1 both died exactly this way, at app.js:15 and app.js:227).
// Every mount in this file therefore goes through the filter below.
function __arcUse(target, ...middleware) {
  const safe = middleware.filter((entry) => entry !== undefined && entry !== null
    && (typeof entry === 'function' || typeof entry === 'string' || Array.isArray(entry)));
  if (safe.length !== middleware.length) {
    console.error('arc: dropped ' + (middleware.length - safe.length)
      + ' non-function middleware argument(s) instead of crashing');
  }
  return target.use(...safe);
}
'''

#: The shape r76's app.js had: a factory that answers undefined, mounted at '/'.
APP_JS = """const express = require('express');
const app = express();

function buildRoutes() {
  return undefined;
}

app.use(express.json());
app.use('/', buildRoutes());
app.use('/api/prs', require('./pr'));

module.exports = app;
"""

PR_JS = """const express = require('express');
const router = express.Router();

router.get('/list', (req, res) => res.json({ ok: true, items: [] }));

module.exports = router;
"""

INDEX_JS = """const app = require('./app');
const port = Number(process.env.PORT || 3221);
app.listen(port, () => console.log('Backend listening on ' + port));
"""


def write_probe() -> None:
    src = PROBE / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "app.js").write_text(APP_JS, encoding="utf-8")
    (src / "pr.js").write_text(PR_JS, encoding="utf-8")
    (src / "index.js").write_text(INDEX_JS, encoding="utf-8")
    (PROBE / "frontend" / "dist").mkdir(parents=True, exist_ok=True)
    (PROBE / "frontend" / "dist" / "index.html").write_text(
        "<!doctype html><html><body><div id=\"root\"></div></body></html>", encoding="utf-8")
    manifest = PROBE / "backend" / "node_modules" / "express" / "package.json"
    if not manifest.is_file() and DEPS_ZIP.is_file():
        with zipfile.ZipFile(DEPS_ZIP) as archive:
            archive.extractall(PROBE, members=[name for name in archive.namelist()
                                              if name.startswith("backend/node_modules/")])


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def boot(port: int, timeout: float = 25.0) -> tuple[int, str, str]:
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
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1):
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

    # --- pass 1: r76's helper, no runtime shim -> the Stage-2 crash ---------
    original_helper = guard_app_use.__globals__["ARC_USE_HELPER"]
    guard_app_use.__globals__["ARC_USE_HELPER"] = ARC_USE_HELPER_R76
    try:
        guarded = guard_app_use(PROBE)
    finally:
        guard_app_use.__globals__["ARC_USE_HELPER"] = original_helper
    print("r76 helper ->", guarded)
    if not guarded:
        failures.append("guard_app_use did not rewrite the mount")
    body = (PROBE / "backend" / "src" / "app.js").read_text(encoding="utf-8")
    if "__arcUse(app, '/', buildRoutes())" not in body:
        failures.append("the mount was not routed through __arcUse")
    if "skipped a mount with no middleware left" in body:
        failures.append("the r76 helper copy already contains the fix")
    before_rc, before_out, before_err = boot(free_port())
    if before_rc == 0:
        failures.append("the r76-shaped app booted without the router guard")
    if "app.use() requires a middleware function" not in before_err:
        failures.append(f"the expected express error is missing: {before_err.strip()[:160]}")

    # --- pass 2: the current passes, the same app must serve ----------------
    write_probe()
    guarded_now = guard_app_use(PROBE)
    print("current guard_app_use ->", guarded_now)
    shim = ensure_router_call_guard(PROBE)
    print("ensure_router_call_guard ->", shim)
    if not shim:
        failures.append("ensure_router_call_guard reported no change")
    after_rc, after_out, after_err = boot(free_port())
    if after_rc != 0 or "Backend listening" not in after_out:
        detail = " | ".join(after_err.strip().splitlines()[-3:])
        failures.append(f"the guarded app still failed (rc={after_rc}): {detail}")

    print(f"before: rc={before_rc} "
          f"{'express error reproduced' if 'app.use() requires a middleware function' in before_err else 'no error'}")
    print(f"after : rc={after_rc} "
          + (after_out.strip().splitlines()[-1] if after_out.strip() else ""))
    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: the r76 Stage-2 mount crash is now skipped instead of fatal")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
