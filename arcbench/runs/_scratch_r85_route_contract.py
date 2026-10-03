"""r85 probe: a generated entry that loses the URL contract must be repaired.

Evidence (the graded platform zip arcbench/downloads/runs/r72-project/
556ca66978e3-template.zip -> template/.arc/playwright-report.json, GitHub Stage 2):

    stats: {"expected": 0, "unexpected": 29}
    17 x Test timeout ... waiting for getByRole('searchbox', {name:'Search', exact:true})
     9 x Error: Could not find a visible navigation target named "acme-docs"
     2 x Error: Could not find a visible navigation target named "branch-switch-demo"
     1 x Error: Could not find a visible navigation target named "Document search flow"

and that zip's generated frontend/src/App.tsx has NO parameterised route at all
(only /repo, /repo-search, /org, /team ...), while the scaffold entry it replaced
routes /:owner/:name, /:owner/:name/search and the /orgs/:name team pages.

This probe uses the real scaffold as the template and a synthetic entry in the
exact shape the generator produced, then asserts:

before: contract check finds 5 missing routes, entry is left broken
after : the scaffold entry is restored and the parameterised routes are back

It also asserts the guard stays quiet when the entry already routes correctly,
and refuses to restore when a page the scaffold imports is absent (a restore that
breaks the build would be worse than the broken route table).

Run: python arcbench/runs/_scratch_r85_route_contract.py
"""

from __future__ import annotations

import re
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent"))

from guard import REQUIRED_ENTRY_ROUTES, restore_entry_route_contract  # noqa: E402

TEMPLATE = ROOT / "agent" / "templates" / "scaffold"

#: r72's generated entry, reduced to the part that matters: a flat kebab table
#: with a duplicate "/home" and no route that takes a parameter.
FLAT_ENTRY = """// Entry rewritten by the ARC agent
import { Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home'
import HomePage from './pages/HomePage'
import RepoPage from './pages/RepoPage'
import RepoSearchPage from './pages/RepoSearchPage'
import OrgPage from './pages/OrgPage'

function AppShell() {
  return (
    <div className="app-shell">
      <nav>
        <Link to="/home">Home</Link>
        <Link to="/repo">Repo</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/repo" element={<RepoPage />} />
        <Route path="/repo-search" element={<RepoSearchPage />} />
        <Route path="/org" element={<OrgPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}

export default AppShell;
"""

#: A correct entry: it already routes by parameter, so the guard must not touch it.
CONTRACT_ENTRY = """import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RepoPage from './pages/RepoPage';
import RepoSearchPage from './pages/RepoSearchPage';
import OrgPage from './pages/OrgPage';
import TeamPage from './pages/TeamPage';
import RepoSettingsPage from './pages/RepoSettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/orgs/:name" element={<OrgPage />} />
      <Route path="/orgs/:name/teams/:team" element={<TeamPage />} />
      <Route path="/:owner/:name/search" element={<RepoSearchPage />} />
      <Route path="/:owner/:name/settings" element={<RepoSettingsPage />} />
      <Route path="/:owner/:name" element={<RepoPage />} />
    </Routes>
  );
}
"""


def build_project(tmp: Path, name: str, entry_source: str, *, prune_pages: bool = False) -> Path:
    project = tmp / name
    shutil.copytree(TEMPLATE, project)
    pages = project / "frontend" / "src" / "pages"
    # The generator adds pages of its own; the scaffold ones stay for the restore.
    (pages / "Home.tsx").write_text(
        "export default function Home() { return <div>Home</div>; }\n", encoding="utf-8")
    if prune_pages:
        (pages / "TeamPage.tsx").unlink()
    (project / "frontend" / "src" / "App.tsx").write_text(entry_source, encoding="utf-8")
    return project


def main() -> int:
    failures: list[str] = []
    tmp = Path(tempfile.mkdtemp(prefix="arc-r85-route-"))
    try:
        # ---------------------------------------------------------------- 1
        project = build_project(tmp, "flat", FLAT_ENTRY)
        entry = project / "frontend" / "src" / "App.tsx"
        before = entry.read_text(encoding="utf-8")
        missing_before = [r for r in REQUIRED_ENTRY_ROUTES if r not in before]
        print(f"[1] flat entry: {len(missing_before)}/{len(REQUIRED_ENTRY_ROUTES)} "
              f"required route(s) missing")
        if len(missing_before) != len(REQUIRED_ENTRY_ROUTES):
            failures.append("the fixture does not actually reproduce the lost contract")

        changed = restore_entry_route_contract(project, TEMPLATE)
        after = entry.read_text(encoding="utf-8")
        print(f"[1] guard -> {changed}")
        if not changed:
            failures.append("a flattened entry was not repaired")
        gained = [r for r in REQUIRED_ENTRY_ROUTES if r in after]
        print(f"[1] after: {len(gained)}/{len(REQUIRED_ENTRY_ROUTES)} required route(s) present")
        if gained != list(REQUIRED_ENTRY_ROUTES):
            failures.append(f"the restored entry is still missing {[r for r in REQUIRED_ENTRY_ROUTES if r not in after]}")
        # The searchbox the suite waits on must now be reachable at "/".
        home = (project / "frontend" / "src" / "pages" / "HomePage.tsx").read_text(encoding="utf-8")
        if 'aria-label="Search"' not in home:
            failures.append("the scaffold HomePage no longer carries the 'Search' searchbox")
        if not re.search(r'path="/"\s+element=\{<HomePage', after):
            failures.append('the restored entry does not render HomePage at "/"')

        # ---------------------------------------------------------------- 2
        project = build_project(tmp, "already", CONTRACT_ENTRY)
        entry = project / "frontend" / "src" / "App.tsx"
        snapshot = entry.read_text(encoding="utf-8")
        changed = restore_entry_route_contract(project, TEMPLATE)
        print(f"[2] correct entry -> {changed or 'untouched'}")
        if changed:
            failures.append("an entry that already satisfies the contract was rewritten")
        if entry.read_text(encoding="utf-8") != snapshot:
            failures.append("an entry that already satisfies the contract was modified")

        # ---------------------------------------------------------------- 3
        # A restore that cannot build must not happen: TeamPage is imported by the
        # scaffold entry, so with it gone the restore is refused.
        project = build_project(tmp, "incomplete", FLAT_ENTRY, prune_pages=True)
        entry = project / "frontend" / "src" / "App.tsx"
        before = entry.read_text(encoding="utf-8")
        changed = restore_entry_route_contract(project, TEMPLATE)
        print(f"[3] scaffold page missing -> {changed or 'refused (correct)'}")
        if changed:
            failures.append("restored the entry even though a page it imports was absent")
        if entry.read_text(encoding="utf-8") != before:
            failures.append("the entry changed despite the refusal")

        # ---------------------------------------------------------------- 4
        # Idempotence: running the guard again must be a no-op.
        project = build_project(tmp, "idem", FLAT_ENTRY)
        entry = project / "frontend" / "src" / "App.tsx"
        restore_entry_route_contract(project, TEMPLATE)
        once = entry.read_text(encoding="utf-8")
        again = restore_entry_route_contract(project, TEMPLATE)
        print(f"[4] second run -> {again or 'no-op'}")
        if again:
            failures.append("the guard is not idempotent")
        if entry.read_text(encoding="utf-8") != once:
            failures.append("a second run changed the entry")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if failures:
        print("\nRESULT: FAIL")
        for line in failures:
            print(f"  - {line}")
        return 1
    print("\nRESULT: PASS - the flattened entry is repaired, a correct one is left alone")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
