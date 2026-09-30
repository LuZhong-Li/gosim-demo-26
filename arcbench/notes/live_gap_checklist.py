"""Turn the live-vs-local delta into an actionable, per-requirement checklist.

The raw delta is noisy: most "live-only" sentences are reworded prose, and every
requirement repeats two generic scenarios ("the page displays the required
headings, controls, values, and status ...", "after refreshing ... the
successful result remains persisted"). This script keeps only sentences that
carry a checkable assertion - an exact quoted string, a control role, or a
normative keyword - and groups them by requirement.

Usage:
    python arcbench/notes/live_gap_checklist.py github
    python arcbench/notes/live_gap_checklist.py sheet
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

LIVE_DIR = Path(__file__).resolve().parent / "requirements-live"

GENERIC = re.compile(
    r"(the page displays the required headings, controls, values, and status"
    r"|after refreshing or reopening the visible destination, the successful result remains persisted"
    r"|the visitor starts at the application home page in a fresh unauthenticated browser session"
    r"|the user signs in as alice-dev with valid-password-123! and follows the visible controls"
    r"|^given:|^when:|^then:)",
    re.IGNORECASE,
)

ROLES = re.compile(
    r"\b(link|button|combobox|checkbox|radio|textbox|searchbox|option|menuitem|heading|dialog|tab)\b",
    re.IGNORECASE,
)
NORMATIVE = re.compile(
    r"\b(exactly|immediately|without|must|only|unique|no longer|not|required|reject|remain|"
    r"persist|disabled|absent|visible|navigat|label|named|role)\b",
    re.IGNORECASE,
)
QUOTED = re.compile(r"[“\"][^”\"]{2,}[”\"]")


def keep(sentence: str) -> bool:
    if GENERIC.search(sentence) and not QUOTED.search(sentence):
        return False
    return bool(QUOTED.search(sentence) or (ROLES.search(sentence) and NORMATIVE.search(sentence)))


def main() -> int:
    task = (sys.argv[1] if len(sys.argv) > 1 else "github").strip()
    delta = (LIVE_DIR / f"{task}-delta.md").read_text(encoding="utf-8")

    sections: list[tuple[str, list[str]]] = []
    current: str | None = None
    items: list[str] = []
    for line in delta.splitlines():
        if line.startswith("## "):
            if current:
                sections.append((current, items))
            current = line[3:].strip()
            items = []
        elif line.startswith("- ") and current:
            sentence = line[2:].strip()
            if keep(sentence):
                items.append(sentence)
    if current:
        sections.append((current, items))

    total = sum(len(items) for _, items in sections)
    rows = sorted(sections, key=lambda s: -len(s[1]))
    out = [
        f"# {task}: live-spec fix checklist",
        "",
        f"{total} checkable assertions across {len([s for s in sections if s[1]])} requirements",
        "(filtered from the raw delta; generic scenario boilerplate removed)",
        "",
        "## Summary",
        "",
        "| Requirement | Assertions |",
        "| --- | --- |",
    ]
    for name, items_ in rows:
        if items_:
            out.append(f"| {name} | {len(items_)} |")
    out.append("")
    out.append("## Checklist")
    out.append("")
    for name, items_ in rows:
        if not items_:
            continue
        out.append(f"### {name}")
        out.append("")
        for sentence in items_:
            out.append(f"- [ ] {sentence}")
        out.append("")

    dest = LIVE_DIR / f"{task}-checklist.md"
    dest.write_text("\n".join(out), encoding="utf-8")
    print(f"wrote {dest}: {total} assertions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
