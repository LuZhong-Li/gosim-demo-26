"""The requirement payload wraps names in backticks; the org regex must too."""

from __future__ import annotations

import re
import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

OLD_ORG = re.compile(
    r"organi[sz]ation\s+([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*){0,3})"
)


def main() -> None:
    raw = (Path("D:/gosim-demo-26/arcbench/requirements/hackathon--github")
           / "requirements.yaml").read_text(encoding="utf-8")
    assert "organization `Acme Demo`" in raw, "the raw payload is backticked"
    # r69 shipped the pattern below: it matched nothing on the real payload, so
    # requirement_world() returned {} and the world seeding was skipped silently.
    old_hits = [c for c in OLD_ORG.findall(raw) if c.lower() not in guard.WORLD_ORG_STOPWORDS]
    print("old pattern candidates:", old_hits[:5], "…", len(old_hits))
    assert not old_hits, "the old pattern was exactly the bug"

    accounts = guard.requirement_accounts(raw, "Valid-password-123!")
    world = guard.requirement_world(raw, accounts)
    print("new pattern world:", world.get("org"), world.get("owner"))
    assert world and world["org"]["displayName"] == "Acme Demo", world

    # The Stage-1 shape, written the way the payload writes it.
    stage1 = (
        "The system pre-provisions the organization `Acme Demo` with public "
        "repository `acme-docs` and private repository `secret-research`. "
        "The system pre-provisions the verified account org-owner with email "
        "org-owner@example.test, team-maintainer with email team-maintainer@example.test, "
        "repo-admin with email repo-admin@example.test, bob-reviewer with email "
        "bob-reviewer@example.test, existing-member with email existing-member@example.test, "
        "org-member with email org-member@example.test, protected-member with email "
        "protected-member@example.test. The organization team frontend-team exists."
    )
    accounts = guard.requirement_accounts(stage1, "Valid-password-123!")
    world = guard.requirement_world(stage1, accounts)
    print("stage-1 shaped world:", world.get("org"), world.get("owner"),
          [m["username"] for m in world.get("members", [])], world.get("repos"),
          [t["name"] for t in world.get("teams", [])])
    assert world["org"] == {"name": "acme-demo", "displayName": "Acme Demo"}
    assert world["owner"] == "org-owner"
    assert {r["name"] for r in world["repos"]} == {"acme-docs", "secret-research"}
    assert "frontend-team" in {t["name"] for t in world["teams"]}
    print("DONE")


if __name__ == "__main__":
    main()
