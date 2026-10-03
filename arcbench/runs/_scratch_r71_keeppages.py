"""r71: the Sheet scaffold pages are restored when their names go missing."""

from __future__ import annotations

import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

WORK = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r71_keeppages")
SCAFFOLD = AGENT / "templates" / "sheet"


def stage() -> None:
    for relative in guard.KEEP_PAGES["sheet"]:
        target = WORK / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text((SCAFFOLD / relative).read_text(encoding="utf-8"),
                          encoding="utf-8")


def names() -> set[str]:
    """The exact names the scaffold pages carry."""
    carried: set[str] = set()
    for relative in guard.KEEP_PAGES["sheet"]:
        body = (SCAFFOLD / relative).read_text(encoding="utf-8")
        for quoted in ("New blank workbook", "Import CSV", "Export CSV",
                       "Add worksheet", "Formula bar", "Rename workbook"):
            if quoted in body:
                carried.add(quoted)
    return carried


def main() -> None:
    stage()
    wanted = names()
    print("scaffold carries:", sorted(wanted))
    assert len(wanted) >= 5, wanted

    # The generated app replaced the scaffold pages with its own, so the names
    # are nowhere in the sources.
    keep = WORK / "frontend" / "src" / "pages" / "WorkbookHomePage.tsx"
    original = keep.read_text(encoding="utf-8")
    keep.write_text("export default function WorkbookHomePage() { return null; }\n",
                    encoding="utf-8")
    guard_restored = guard.restore_keep_pages(WORK, SCAFFOLD, "sheet", wanted)
    print("first restore ->", guard_restored)
    assert guard_restored, "the lost names must trigger a restore"
    assert "New blank workbook" in keep.read_text(encoding="utf-8")

    # Nothing missing now: the pass must stay out of the way.
    assert guard.restore_keep_pages(WORK, SCAFFOLD, "sheet", wanted) == []
    print("second pass -> no-op")

    # A task without a keep list is untouched.
    assert guard.restore_keep_pages(WORK, SCAFFOLD, "github", wanted) == []
    print("github -> no-op")
    print("DONE", len(original))


if __name__ == "__main__":
    main()
