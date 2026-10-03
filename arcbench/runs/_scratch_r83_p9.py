"""P9 fixes: a private seed login path, a private auth header, a route dump.

r80's GitHub stdout ended with

    [arc-seed] could not sign in; the world seed runs unauthenticated from here
    [arc-seed] POST /api/repos -> 401

i.e. the seeder either never reached the injected sign-in route (H1) or reached
it and had its synthetic token rejected by the app's own middleware (H2). Both
are covered here:

  * ``/__arc_seed__/login`` is registered first and tried first (H1), and
  * a request carrying ``x-arc-seed-token`` is the seeded user, whatever the
    generated auth middleware thinks (H2).

The probe boots a real Express app whose protected route answers 401 unless
``req.user`` is set, mounts the injected shim in front of it, and checks the
three behaviours plus the route dump.
"""

from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

RUNS = Path(__file__).resolve().parent
REPO = RUNS.parent.parent
AGENT = REPO / "arcbench" / "agent"
DEPS_ZIP = REPO / "arcbench" / "dist" / "selftest-r71-ghstage1-served.zip"

sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

SEED = {"username": "alice-dev", "email": "alice-dev@example.test",
        "password": "Valid-password-123!"}

APP_JS = """const express = require('express');
const app = express();

// The shape that answered 401 for the seeder in r80: a route that needs req.user.
app.get('/api/protected', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
  return res.json({ ok: true, user: req.user.username });
});

module.exports = app;
"""

INDEX_JS = """const app = require('./app');
const port = Number(process.env.PORT || 3251);
app.listen(port, () => console.log('Backend listening on ' + port));
"""


def build() -> Path:
    root = Path(tempfile.mkdtemp(prefix="arc-p9-"))
    src = root / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "app.js").write_text(APP_JS, encoding="utf-8")
    (src / "index.js").write_text(INDEX_JS, encoding="utf-8")
    manifest = root / "backend" / "node_modules" / "express" / "package.json"
    if not manifest.is_file() and DEPS_ZIP.is_file():
        with zipfile.ZipFile(DEPS_ZIP) as archive:
            archive.extractall(root, members=[name for name in archive.namelist()
                                             if name.startswith("backend/node_modules/")])
    return root


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def get(port: int, path: str, headers: dict | None = None, body: dict | None = None,
        method: str = "GET") -> tuple[int, str]:
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            return response.status, response.read(300).decode("utf-8", "ignore")
    except urllib.error.HTTPError as error:
        return error.code, error.read(300).decode("utf-8", "ignore")
    except Exception as error:                      # pragma: no cover
        return 0, str(error)


def main() -> int:
    root = build()
    failures: list[str] = []
    mounted = guard.ensure_signin_route(root, SEED)
    dumped = guard.ensure_route_dump(root)
    print("ensure_signin_route ->", mounted)
    print("ensure_route_dump  ->", dumped)
    if not mounted:
        failures.append("the seed sign-in shim was not mounted")
    if not dumped:
        failures.append("the route dump was not appended")
    if guard.ensure_route_dump(root):
        failures.append("the route dump is not idempotent")

    shim = (root / "backend" / "src" / "arc-seed-auth.js").read_text(encoding="utf-8")
    if "/__arc_seed__/login" not in shim:
        failures.append("the private login path is not registered")
    entry = (root / "backend" / "src" / "index.js").read_text(encoding="utf-8")
    if "[arc-routes]" not in entry:
        failures.append("the entry does not dump the routes")

    port = free_port()
    env = dict(os.environ, PORT=str(port))
    proc = subprocess.Popen(["node", "backend/src/index.js"], cwd=str(root), env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                            encoding="utf-8", errors="replace")
    time.sleep(3)
    try:
        plain_status, _ = get(port, "/api/protected")
        login_status, login_body = get(port, "/__arc_seed__/login",
                                       body={"username": SEED["username"],
                                             "password": SEED["password"]}, method="POST")
        header_status, header_body = get(port, "/api/protected",
                                         headers={"x-arc-seed-token": guard.ARC_SEED_TOKEN})
    finally:
        proc.terminate()
        try:
            out, _ = proc.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            out, _ = proc.communicate(timeout=10)

    print(f"protected without header -> {plain_status}")
    print(f"private login path       -> {login_status} {login_body[:60]}")
    print(f"protected with header    -> {header_status} {header_body[:60]}")
    if plain_status != 401:
        failures.append(f"the unprotected route should answer 401, got {plain_status}")
    if login_status != 200 or "arc-seed-token" not in login_body:
        failures.append(f"the private login path did not answer a token: {login_status}")
    if header_status != 200 or SEED["username"] not in header_body:
        failures.append(f"the private header did not authenticate: {header_status}")
    if "[arc-routes]" not in out:
        failures.append("the running server did not print its route dump")

    shutil.rmtree(root, ignore_errors=True)
    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: private login path, private auth header and route dump all work")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
