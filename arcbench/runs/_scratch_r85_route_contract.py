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

from guard import (  # noqa: E402
    REQUIRED_ENTRY_ROUTES,
    ensure_app_router,
    restore_entry_route_contract,
)

TEMPLATE = ROOT / "agent" / "templates" / "scaffold"

#: A real graded project: the full-task run whose official report reads
#: expected=0 / unexpected=100, and whose frontend/src/App.tsx is the 286-byte
#: bundler placeholder. It is the fixture that proves the guard against reality
#: instead of against a shape we invented.
REAL_PROJECT = (ROOT / "downloads" / "agent-packages"
                / "a128c4309297-template.zip")

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


def build_project(tmp: Path, name: str, entry_source: str, *, prune_pages: bool = False,
                  shadow_home: bool = False) -> Path:
    project = tmp / name
    shutil.copytree(TEMPLATE, project)
    pages = project / "frontend" / "src" / "pages"
    # The generator adds pages of its own; the scaffold ones stay for the restore.
    (pages / "Home.tsx").write_text(
        "export default function Home() { return <div>Home</div>; }\n", encoding="utf-8")
    if prune_pages:
        (pages / "TeamPage.tsx").unlink()
    if shadow_home:
        # Exactly the graded r72 Core-Requirements shape: the generator wrote its
        # own HomePage.tsx (1,508 bytes there) which has no searchbox. The route
        # restore alone would still leave the 17 searchbox specs timing out,
        # because the entry imports './pages/HomePage' and this file shadows the
        # scaffold one.
        pages.joinpath("HomePage.tsx").write_text(
            "export default function HomePage() { return <div>Home</div>; }\n",
            encoding="utf-8")
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
        note = []
        changed = restore_entry_route_contract(project, TEMPLATE, note)
        print(f"[2] correct entry -> {changed or 'untouched'}")
        if changed:
            failures.append("an entry that already satisfies the contract was rewritten")
        if entry.read_text(encoding="utf-8") != snapshot:
            failures.append("an entry that already satisfies the contract was modified")
        if not note or "already routes" not in note[0]:
            failures.append(f"a healthy entry was not reported as healthy: {note!r}")
        else:
            print(f"        note: {note[0]}")

        # ---------------------------------------------------------------- 3
        # A restore that cannot build must not happen: TeamPage is imported by the
        # scaffold entry, so with it gone the restore is refused - and the reason
        # must be recorded, because a silent refusal is exactly what left r79-r83
        # undiagnosable.
        project = build_project(tmp, "incomplete", FLAT_ENTRY, prune_pages=True)
        entry = project / "frontend" / "src" / "App.tsx"
        before = entry.read_text(encoding="utf-8")
        note: list[str] = []
        changed = restore_entry_route_contract(project, TEMPLATE, note)
        print(f"[3] scaffold page missing -> {changed or 'refused (correct)'}")
        if changed:
            failures.append("restored the entry even though a page it imports was absent")
        if entry.read_text(encoding="utf-8") != before:
            failures.append("the entry changed despite the refusal")
        if not note:
            failures.append("the refusal was silent: no diagnostic was recorded")
        elif "TeamPage" not in note[0] or "NOT restored" not in note[0]:
            failures.append(f"the refusal diagnostic is not actionable: {note[0]!r}")
        else:
            print(f"        note: {note[0]}")

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

        # ---------------------------------------------------------------- 5
        # The graded r72 Core-Requirements project: the entry was replaced by the
        # bundler placeholder (286 bytes, no Routes at all) and the generator's own
        # HomePage.tsx shadows the scaffold one. Restoring only the entry would
        # leave the 17 searchbox specs failing, so the pages must come back too.
        project = build_project(tmp, "stub-entry", FLAT_ENTRY, shadow_home=True)
        entry = project / "frontend" / "src" / "App.tsx"
        live_home = project / "frontend" / "src" / "pages" / "HomePage.tsx"
        if 'aria-label="Search"' in live_home.read_text(encoding="utf-8"):
            failures.append("the fixture did not actually shadow the scaffold HomePage")
        changed = restore_entry_route_contract(project, TEMPLATE)
        print(f"[5] shadowed HomePage -> {len(changed)} change group(s)")
        for line in changed:
            print(f"        {line}")
        if not changed:
            failures.append("the shadowed entry was not repaired")
        home_after = live_home.read_text(encoding="utf-8")
        if 'aria-label="Search"' not in home_after:
            failures.append("the scaffold HomePage was not restored, so the 17 "
                            "searchbox specs would still time out")
        if "searchbox" not in home_after and 'type="search"' not in home_after:
            failures.append("the restored HomePage carries no search control")
        if not any("restored pages" in line for line in changed):
            failures.append("the change report does not mention the page restore")

        # ---------------------------------------------------------------- 6
        # End to end against the REAL graded project, when it is on disk. This is
        # the check that matters: our own fixtures can only prove the guard does
        # what we meant, not that it fires on the shape the platform actually
        # produced. Also asserts the restore SURVIVES the passes that run after it
        # - ensure_app_router does touch the entry again (+16 generated routes on
        # this project), so "the contract is still there afterwards" has to be an
        # assertion rather than an assumption.
        if not REAL_PROJECT.is_file():
            print(f"[6] SKIP: {REAL_PROJECT.name} not on disk")
        else:
            import zipfile
            project = tmp / "real-a128"
            with zipfile.ZipFile(REAL_PROJECT) as archive:
                members = [m for m in archive.namelist()
                           if not m.startswith("template/node_modules/")]
                archive.extractall(project, members=members)
            entry = project / "template" / "frontend" / "src" / "App.tsx"
            print(f"[6] real project entry: {entry.stat().st_size} bytes")
            if entry.stat().st_size > 1000:
                failures.append("the real fixture no longer holds the placeholder "
                                f"entry ({entry.stat().st_size} bytes) - the fixture moved")
            else:
                real_note: list[str] = []
                real_changed = restore_entry_route_contract(
                    project / "template", TEMPLATE, real_note)
                after = entry.read_text(encoding="utf-8")
                present = [r for r in REQUIRED_ENTRY_ROUTES if r in after]
                print(f"[6] restore -> {len(real_changed)} change group(s); "
                      f"routes {len(present)}/{len(REQUIRED_ENTRY_ROUTES)}")
                if len(present) != len(REQUIRED_ENTRY_ROUTES):
                    failures.append(f"the guard did not repair the REAL project "
                                    f"(routes present: {present})")
                home = (project / "template" / "frontend" / "src" / "pages"
                        / "HomePage.tsx").read_text(encoding="utf-8")
                if 'aria-label="Search"' not in home:
                    failures.append("the REAL project's HomePage still lacks the "
                                    "searchbox the 17 specs wait on")
                # Now replay the writer that runs before us in the pipeline.
                ensure_app_router(project / "template")
                survivor = [r for r in REQUIRED_ENTRY_ROUTES
                            if r in entry.read_text(encoding="utf-8")]
                print(f"[6] after ensure_app_router: routes {len(survivor)}/"
                      f"{len(REQUIRED_ENTRY_ROUTES)} survive")
                if len(survivor) != len(REQUIRED_ENTRY_ROUTES):
                    failures.append("a later pass destroyed the restored contract: "
                                    f"{survivor}")
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
