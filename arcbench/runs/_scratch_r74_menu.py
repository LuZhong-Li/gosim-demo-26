"""REQ-1-2: the account menu / sign-out contract must be mounted in the entry."""

from __future__ import annotations

import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

WORK = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r74_menu")


def main() -> None:
    src = WORK / "frontend" / "src"
    (src / "pages").mkdir(parents=True, exist_ok=True)
    (src / "pages" / "HomePage.tsx").write_text(
        "export default function HomePage() { return <h1>Home</h1>; }\n", encoding="utf-8")
    (src / "App.tsx").write_text(
        "import { Route, Routes } from 'react-router-dom';\n"
        "import HomePage from './pages/HomePage';\n"
        "\n"
        "export default function App() {\n"
        "  return (\n"
        "    <Routes>\n"
        "      <Route path=\"/\" element={<HomePage />} />\n"
        "    </Routes>\n"
        "  );\n"
        "}\n",
        encoding="utf-8",
    )
    changed = guard.ensure_account_menu_contract(WORK)
    print("fix ->", changed)
    assert changed, "the missing account menu must trigger the mount"
    body = (src / "App.tsx").read_text(encoding="utf-8")
    assert "import { ArcSessionBar } from './__arc_auth__';" in body, body[:200]
    assert "function ArcMenuShell()" in body
    assert "<ArcSessionBar />" in body and "<App />" in body
    assert "export default ArcMenuShell;" in body
    assert "function App()" in body, "the original component must survive"
    assert (src / "__arc_auth__.tsx").is_file(), "the auth module must be written"
    auth = (src / "__arc_auth__.tsx").read_text(encoding="utf-8")
    for name in guard.ACCOUNT_MENU_NAMES:
        assert name in auth, name
    assert guard.ensure_account_menu_contract(WORK) == [], "idempotent"
    print("DONE")


if __name__ == "__main__":
    main()
