"""Inject the seed hooks into a copy of the real GitHub scaffold and boot it.

This is the end-to-end proof for the r69 failure: the payload names entities in
backticks, so the world used to come out empty and the seeding step was skipped
without a word. Here the hooks are installed on the scaffold the platform
actually runs, the server boots against the express shim, and the seeded world is
read back over HTTP.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

WORK = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r70_world_e2e")
PROJECT = WORK / "project"
PASSWORD = "Valid-password-123!"


def prepare() -> dict:
    source = AGENT / "templates" / "scaffold"
    if not (PROJECT / "backend" / "src" / "index.js").is_file():
        shutil.copytree(
            source, PROJECT,
            ignore=shutil.ignore_patterns("node_modules", "dist", "__pycache__"),
            dirs_exist_ok=True,
        )
    text = (Path("D:/gosim-demo-26/arcbench/requirements/hackathon--github")
            / "requirements.yaml").read_text(encoding="utf-8")
    bundled = guard.bundled_requirement_text("github")
    seed_text = f"{text}\n{bundled}"
    accounts = guard.requirement_accounts(seed_text, PASSWORD)
    world = guard.requirement_world(seed_text, accounts)
    print("accounts:", [a["username"] for a in accounts])
    print("world org:", world.get("org"), "owner:", world.get("owner"),
          "members:", [m["username"] for m in world.get("members", [])],
          "repos:", world.get("repos"),
          "teams:", [t["name"] for t in world.get("teams", [])])
    assert world, "the world must be extracted from the backticked payload"
    installed = guard.ensure_startup_seed_all(PROJECT, accounts, 3000)
    installed_world = guard.ensure_startup_seed_world(
        PROJECT, world, accounts, PASSWORD, 3000)
    print("account hook:", installed)
    print("world hook:", installed_world)
    assert installed and installed_world, (installed, installed_world)
    return world


if __name__ == "__main__":
    prepare()
    print("DONE")
