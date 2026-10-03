"""Local assertions for the r69 world seed (run from arcbench/agent)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "agent"))

import guard  # noqa: E402

RUNS = Path(__file__).resolve().parent
PASSWORD = "Valid-password-123!"


def stage1_text() -> str:
    return (RUNS / "_stage1_task_page.txt").read_text(encoding="utf-8")


def test_stage1_world() -> None:
    text = stage1_text()
    accounts = guard.requirement_accounts(text, PASSWORD)
    names = [a["username"] for a in accounts]
    print(f"accounts ({len(names)}): {names}")
    assert "alice-dev" in names and "org-owner" in names and "protected-member" in names
    assert "unknown" not in names and "nora.demo" not in names
    emails = {a["username"]: a["email"] for a in accounts}
    # The suite signs in with this exact address in REQ-1-1-2 S2/S4.
    assert emails["alice-dev"] == "alice.dev@example.test", emails["alice-dev"]
    assert not any(name.startswith("req-") for name in names), names

    world = guard.requirement_world(text, accounts)
    assert world, "no world extracted from the Stage 1 requirement"
    print("org:", world["org"])
    print("owner:", world["owner"])
    print("members:", world["members"])
    print("teams:", world["teams"])
    print("repos:", world["repos"])
    print("teamGrants:", world["teamGrants"], "userGrants:", world["userGrants"])
    assert world["org"] == {"name": "acme-demo", "displayName": "Acme Demo"}
    assert world["owner"] == "org-owner"
    member_names = {m["username"] for m in world["members"]}
    assert {"org-owner", "team-maintainer", "bob-reviewer", "existing-member",
            "org-member", "protected-member", "repo-admin"} <= member_names
    assert "new-member" not in member_names, "new-member must stay unprovisioned"
    assert {r["name"] for r in world["repos"]} == {"acme-docs", "secret-research"}
    assert {r["visibility"] for r in world["repos"]} == {"public", "private"}
    team_names = {t["name"] for t in world["teams"]}
    assert {"frontend-team", "platform-team", "frontend-child", "access-role-team"} <= team_names
    assert "mobile-team" not in team_names, "mobile-team must stay unused"
    assert world["teamGrants"] == [{"team": "access-role-team", "permission": "Write"}]
    assert world["userGrants"] == [{"username": "repo-admin", "permission": "Admin"}]

    payload = guard.world_seed_payload(world, accounts, "/api/auth/register", PASSWORD)
    phases = {phase["name"] for phase in payload["phases"]}
    assert phases == {"accounts", "organization", "members", "teams", "team-members",
                      "team-hierarchy", "repositories", "repository-access"}, phases
    assert payload["login"]["username"] == "org-owner"
    org_req = next(p for p in payload["phases"] if p["name"] == "organization")
    assert org_req["auth"] is True
    assert org_req["requests"][0]["candidates"][0]["body"] == {
        "name": "acme-demo", "displayName": "Acme Demo"}
    grant = [p for p in payload["phases"] if p["name"] == "repository-access"]
    bodies = [c["body"] for r in grant[0]["requests"] for c in r["candidates"]]
    assert any(b.get("team") == "access-role-team" and b.get("permission") == "Write"
               and b.get("repo") == "acme-docs" for b in bodies)
    assert any(b.get("username") == "repo-admin" and b.get("permission") == "Admin"
               for b in bodies)
    print("world payload OK:", json.dumps(payload["phases"][0]["requests"][0]["candidates"][0]["body"]))


def test_other_tasks_seed_nothing() -> None:
    for name in ("hackathon--sheet", "hackathon--github"):
        text = (Path(__file__).resolve().parents[1] / "requirements" / name /
                "requirements.yaml").read_text(encoding="utf-8")
        slug = "sheet" if "sheet" in name else "github"
        # main.py augments the mounted tree with the bundled requirement text.
        seed_text = text + "\n" + guard.bundled_requirement_text(slug)
        accounts = guard.requirement_accounts(seed_text, PASSWORD)
        world = guard.requirement_world(seed_text, accounts)
        print(f"{name}: accounts={[a['username'] for a in accounts]}")
        print(f"{name}: emails={[a['email'] for a in accounts][:4]}")
        teams = {t["name"] for t in world.get("teams", [])}
        print(f"{name}: world_org={world.get('org')} owner={world.get('owner')} "
              f"members={[m['username'] for m in world.get('members', [])]} "
              f"repos={world.get('repos')} teams={sorted(teams)}")
        if slug == "github":
            assert world, "the classic GitHub world must be extracted"
            assert world["org"]["displayName"] == "Acme Demo"
            assert world["owner"] == "alice-dev"
            assert {r["name"] for r in world["repos"]} == {"acme-docs", "secret-research"}
            assert "frontend-team" in teams
        else:
            assert not world, "the Sheet bundle must not seed the GitHub world"


def test_splice_routes() -> None:
    body = (
        "import { Route, Routes } from 'react-router-dom';\n"
        "import HomePage from './pages/HomePage';\n"
        "\n"
        "function App() {\n"
        "  return (\n"
        "    <nav><br/></nav>\n"
        "    <Routes>\n"
        "      <Route path=\"/\" element={<HomePage />} />\n"
        "    </Routes>\n"
        "  );\n"
        "}\n"
        "\n"
        "export default App;\n"
    )
    patched = guard._splice_routes(body, [("TeamPage", "./pages/TeamPage"),
                                          ("OrgsPage", "./pages/OrgsPage")])
    assert patched and patched != body
    print("---- spliced ----")
    print(patched)
    print("-----------------")
    assert "import TeamPage from './pages/TeamPage';" in patched
    assert '<Route path="/team" element={<TeamPage />} />' in patched
    assert '<Route path="/orgs" element={<OrgsPage />} />' in patched
    assert '<Link to="/team">Team</Link>' in patched
    assert patched.count("</Routes>") == 1
    assert "import HomePage" in patched
    print("splice OK")


def test_hook_written(tmp: Path) -> None:
    backend = tmp / "backend" / "src"
    backend.mkdir(parents=True, exist_ok=True)
    (tmp / "frontend").mkdir(exist_ok=True)
    (backend / "auth.js").write_text(
        "router.post('/api/auth/register', handler);\n", encoding="utf-8")
    (backend / "index.js").write_text(
        "const app = require('./app');\napp.listen(process.env.PORT || 3000);\n",
        encoding="utf-8")
    text = stage1_text()
    accounts = guard.requirement_accounts(text, PASSWORD)
    world = guard.requirement_world(text, accounts)
    seeded_accounts = guard.ensure_startup_seed_all(tmp, accounts, 3000)
    seeded_world = guard.ensure_startup_seed_world(tmp, world, accounts, PASSWORD, 3000)
    entry = (backend / "index.js").read_text(encoding="utf-8")
    assert seeded_accounts and seeded_world
    assert "pre-provisioned world seed added by the ARC agent" in entry
    assert "__WORLD__" not in entry and "__PORT__" not in entry
    assert "console.log(`[arc-seed]" in entry
    assert json.dumps({"name": "acme-demo", "displayName": "Acme Demo"}) in entry
    # Loading the module must be valid JavaScript.
    print("hook OK:", seeded_accounts, seeded_world)
    print("entry bytes:", len(entry))


if __name__ == "__main__":
    test_splice_routes()
    test_stage1_world()
    test_other_tasks_seed_nothing()
    tmp_dir = RUNS / "_scratch_r69_hook"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    test_hook_written(tmp_dir)
    print("ALL LOCAL ASSERTIONS PASSED")
