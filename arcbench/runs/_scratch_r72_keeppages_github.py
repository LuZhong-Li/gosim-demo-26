"""The GitHub scaffold's pages are restored when their names disappear."""

from __future__ import annotations

import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

SCAFFOLD = AGENT / "templates" / "scaffold"
WORK = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r72_keep_github")

NAMES = ("Account menu", "Your organizations", "Sign in", "Find a repository")


def main() -> None:
    relatives = guard.KEEP_PAGES["scaffold"]
    print("kept files:", len(relatives))
    for relative in relatives:
        target = WORK / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text((SCAFFOLD / relative).read_text(encoding="utf-8"),
                          encoding="utf-8")
    (WORK / "frontend" / "src" / "main.tsx").write_text(
        "import App from './App';\n", encoding="utf-8")

    # Pick names the way the pipeline does: quoted strings taken from the
    # requirement text that the scaffold page happens to render.
    import re
    home = WORK / "frontend" / "src" / "pages" / "HomePage.tsx"
    quoted = [m for m in re.findall(r"'([^']{4,40})'", home.read_text(encoding="utf-8"))
              if m[0].isupper()][:2]
    print("names carried by HomePage.tsx:", quoted)
    assert quoted, "the scaffold page must carry requirement names"
    assert guard.restore_keep_pages(WORK, SCAFFOLD, "scaffold", set(quoted)) == []

    # The generation turn replaced the page that carried them.
    broken = home
    broken.write_text("export default function HomePage() { return null; }\n",
                      encoding="utf-8")
    restored = guard.restore_keep_pages(WORK, SCAFFOLD, "scaffold", set(quoted))
    print("restore ->", restored)
    assert restored and "HomePage.tsx" in restored[0], restored
    assert quoted[0] in broken.read_text(encoding="utf-8")

    # Idempotent, and the sheet slug is unaffected.
    assert guard.restore_keep_pages(WORK, SCAFFOLD, "scaffold", set(quoted)) == []
    assert guard.restore_keep_pages(WORK, SCAFFOLD, "sheet", set(quoted)) == []
    print("DONE")


if __name__ == "__main__":
    main()
