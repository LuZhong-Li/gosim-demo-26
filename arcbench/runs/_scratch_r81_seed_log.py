"""The seeder has to say *why* a route refused the payload.

r80's GitHub stdout logged `[arc-seed] POST /auth/sign-up -> 400` a dozen times
and nothing else, so the reason the world never got seeded was unknowable from
the log: a missing field, a different password policy, or a validation layer
answering before the handler. This probe renders the injected seed module for a
synthetic project and checks the generated code carries the status + body log.
"""

from __future__ import annotations

import shutil
import sys
import tempfile
from pathlib import Path

RUNS = Path(__file__).resolve().parent
AGENT = RUNS.parent.parent / "arcbench" / "agent"
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402


def main() -> int:
    root = Path(tempfile.mkdtemp(prefix="arc-seed-log-"))
    failures: list[str] = []
    try:
        entry = root / "backend" / "src" / "index.js"
        entry.parent.mkdir(parents=True, exist_ok=True)
        entry.write_text(
            "const app = require('./app');\n"
            "const port = 3000;\n"
            "app.listen(port, () => console.log('Backend listening'));\n",
            encoding="utf-8",
        )
        (entry.parent / "app.js").write_text(
            "const express = require('express');\nconst app = express();\n"
            "app.post('/api/auth/sign-up', (req, res) => "
            "res.status(400).json({ error: 'x' }));\n"
            "module.exports = app;\n",
            encoding="utf-8",
        )
        accounts = [{"username": "repo-owner", "email": "repo-owner@example.test"}]
        world = {
            "owner": "repo-owner",
            "org": {"name": "acme-demo", "displayName": "Acme Demo"},
            "members": [dict(accounts[0])],
            "teams": [],
            "repos": [],
            "teamGrants": [],
            "userGrants": [],
        }
        seeded = guard.ensure_startup_seed_world(
            root, world, accounts, "Valid-password-123!", 3000)
        print("ensure_startup_seed_world ->", seeded)
        if not seeded:
            failures.append("the world seed was not installed for the synthetic project")
        bodies = "\n".join(
            path.read_text(encoding="utf-8", errors="replace")
            for path in entry.parent.rglob("*.js")
        )
        if "response.clone().text()" not in bodies:
            failures.append("the generated seeder does not read the failure body")
        if "| ' + detail" not in bodies:
            failures.append("the generated seeder does not log the failure detail")
        if "[arc-seed] verify" not in bodies:
            failures.append("the generated seeder does not verify a write by reading it back")

        # A placeholdered API export used to be invisible: the build stayed green
        # and the button that called it did nothing. It is still a placeholder
        # (a failing build is a guaranteed zero), but it now announces itself.
        for suffix in (".ts", ".tsx"):
            text = guard._placeholder_export("createRepository", suffix)
            if "arc-api" not in text:
                failures.append(f"a {suffix} placeholder does not announce itself")
    finally:
        shutil.rmtree(root, ignore_errors=True)

    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: the generated seeder logs the status and the refusal detail")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
