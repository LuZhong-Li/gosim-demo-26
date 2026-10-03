"""Router-splice smoke test on the real scaffold (run from arcbench/agent)."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve()
AGENT = HERE.parents[1] / "agent"
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

WORK = HERE.parent / "_scratch_r69_router"


def main() -> None:
    if WORK.exists():
        # The rules say never delete, so refresh in place instead.
        pass
    (WORK / "frontend" / "src").mkdir(parents=True, exist_ok=True)
    src = WORK / "frontend" / "src"
    for name in ("App.tsx", "main.tsx", "labels.ts"):
        shutil.copyfile(AGENT / "templates" / "scaffold" / "frontend" / "src" / name,
                        src / name)
    (src / "pages").mkdir(exist_ok=True)
    for page in ("TeamPage", "OrgsPage", "HomePage", "IssueDetailPage", "BrowsePage"):
        text = "export default function %s() { return <div>%s</div>; }\n" % (page, page)
        if page == "IssueDetailPage":
            text = "export function IssueDetailPage() { return <div>no default</div>; }\n"
        (src / "pages" / f"{page}.tsx").write_text(text, encoding="utf-8")
    (WORK / "frontend" / "package.json").write_text(
        '{"name":"frontend","version":"0.0.0","dependencies":{"react-router-dom":"^6"}}',
        encoding="utf-8")

    defaults = guard.ensure_default_exports(WORK)
    print("ensure_default_exports:", defaults)

    changed = guard.ensure_app_router(WORK)
    print("ensure_app_router:", changed)
    assert (src / "pages" / "IssueDetailPage.tsx").read_text(
        encoding="utf-8").count("export default") == 1
    app = (src / "App.tsx").read_text(encoding="utf-8")
    for page in ("IssueDetailPage", "BrowsePage"):
        assert f"import {page} from './pages/{page}';" in app, page
    assert '<Route path="/issue-detail" element={<IssueDetailPage />} />' in app
    assert '<Route path="/browse" element={<BrowsePage />} />' in app
    assert app.count("<Routes>") == 1 and app.count("</Routes>") == 1
    assert '<Link to="/browse">Browse</Link>' in app
    # The scaffold's own routes must survive.
    assert '<Route path="/orgs/:name/teams/:team" element={<TeamPage />} />' in app
    assert "function Header(" in app
    print("router splice OK, App.tsx bytes:", len(app))


if __name__ == "__main__":
    main()
