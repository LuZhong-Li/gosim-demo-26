"""End-to-end check of the write-then-read-back verification.

The whole point of the `[arc-seed] verify` line is to tell "the world was seeded"
from "the write was swallowed" inside a platform log, so it has to be proven
against a server that *lies the way a generated app lies*: 201 on the write, an
empty collection on the read.

The probe boots an Express app with exactly that behaviour, injects the world
seeder, and asserts both log lines: the 201 and the "did not persist" verdict.
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
import zipfile
from pathlib import Path

RUNS = Path(__file__).resolve().parent
REPO = RUNS.parent.parent
AGENT = REPO / "arcbench" / "agent"
DEPS_ZIP = REPO / "arcbench" / "dist" / "selftest-r71-ghstage1-served.zip"
PROBE = RUNS / "_r84_verify" / "app"

sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

APP_JS = """const express = require('express');
const app = express();

app.use(express.json());

// The seeder only installs itself when the app has a registration route.
app.post('/api/auth/sign-up', (req, res) => res.status(201).json({ ok: true }));

// A route that answers 201 and stores nothing - the shape the ARC store stub
// produces when the store has no writer.
app.post('/api/repos', (req, res) => res.status(201).json({ ok: true }));

// ... and a reader that always reports an empty collection.
app.get('/api/repos', (req, res) => res.json({ items: [] }));

// A sign-in route so the seeder gets a token immediately instead of burning
// ten retry rounds first.
app.post('/api/auth/login', (req, res) => res.json({ token: 'probe-token' }));

app.post('/api/orgs/acme-demo/members', (req, res) => res.status(201).json({ ok: true }));
app.get('/api/orgs/acme-demo/members', (req, res) => res.json({ items: [] }));

module.exports = app;
"""

INDEX_JS = """const app = require('./app');
const port = Number(process.env.PORT || 3261);
app.listen(port, () => console.log('Backend listening on ' + port));
"""

WORLD = {
    "owner": "repo-owner",
    "org": {"name": "acme-demo", "displayName": "Acme Demo"},
    "members": [{"username": "repo-owner", "email": "repo-owner@example.test"}],
    "teams": [],
    "repos": [{"name": "acme-docs", "visibility": "public"}],
    "teamGrants": [],
    "userGrants": [],
}
ACCOUNTS = [{"username": "repo-owner", "email": "repo-owner@example.test",
             "password": "Valid-password-123!"}]


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def main() -> int:
    src = PROBE / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "app.js").write_text(APP_JS, encoding="utf-8")
    (src / "index.js").write_text(INDEX_JS, encoding="utf-8")
    manifest = PROBE / "backend" / "node_modules" / "express" / "package.json"
    if not manifest.is_file() and DEPS_ZIP.is_file():
        with zipfile.ZipFile(DEPS_ZIP) as archive:
            archive.extractall(PROBE, members=[name for name in archive.namelist()
                                              if name.startswith("backend/node_modules/")])

    port = free_port()
    seeded = guard.ensure_startup_seed_world(
        PROBE, WORLD, ACCOUNTS, "Valid-password-123!", port)
    print("ensure_startup_seed_world ->", seeded)
    failures: list[str] = []
    if not seeded:
        failures.append("the world seeder was not installed")

    env = dict(os.environ, PORT=str(port))
    proc = subprocess.Popen(["node", "backend/src/index.js"], cwd=str(PROBE), env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                            encoding="utf-8", errors="replace")
    time.sleep(12)
    proc.terminate()
    try:
        out, _ = proc.communicate(timeout=15)
    except subprocess.TimeoutExpired:
        proc.kill()
        out, _ = proc.communicate(timeout=15)

    lines = [line for line in out.splitlines() if "[arc-seed]" in line]
    print("seeder lines:")
    for line in lines[:8]:
        print("   ", line.strip()[-120:])
    if not any("POST /api/repos -> 201" in line for line in lines):
        failures.append("the seeder did not log the accepted write")
    if not any("verify /api/repos" in line and "items=0" in line for line in lines):
        failures.append("the read-back did not report the empty collection")
    if not any("the write did not persist" in line for line in lines):
        failures.append("the read-back did not name the swallowed write")

    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: a 201 that stored nothing is reported as 'the write did not persist'")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
