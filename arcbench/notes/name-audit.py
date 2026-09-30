"""Standalone exact-name audit from the live checklist.

The graders locate controls by exact accessible names. The live checklists
(``arcbench/notes/requirements-live/<task>-checklist.md``) quote those names,
and this script prints the deduplicated list so we can eyeball what the model
must hit. Quoted names come straight from the checklist assertions, not the
stale requirement map.

Usage:
    python arcbench/notes/name-audit.py github
    python arcbench/notes/name-audit.py sheet
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIVE_DIR = ROOT / "arcbench" / "notes" / "requirements-live"

# Straight or curly quotes around a control name. Names are 3..60 chars.
QUOTED = re.compile(r"[“\"]([^”\"\n]{3,60})[”\"]")

# Values the tests type, domain nouns, ids, emails, passwords, dates: none of
# these are a control's accessible name.
NOT_A_NAME = re.compile(
    r"(@|^\d+$|^[-.]|<|^(not-an-email|does-not-match|000000|123456|short|different|owner)$)"
    r"|^(Read|Triage|Write|Maintain|Admin|Member|Owner)$"
    r"|(Repository created by Playwright)"
    r"|^[a-z0-9][a-z0-9/-]*$"
    r"|/|\((PR|optional)\)"
    r"|[{}()\[\]:]|'\w+':|^\W"
    r"|-password-|@example\.test|password|Password"
)


def names_from_checklist(task: str) -> list[str]:
    path = LIVE_DIR / f"{task}-checklist.md"
    if not path.exists():
        raise FileNotFoundError(path)
    text = path.read_text(encoding="utf-8")
    names: list[str] = []
    seen: set[str] = set()
    for match in QUOTED.finditer(text):
        value = match.group(1).strip()
        if not value or value in seen or NOT_A_NAME.search(value):
            continue
        seen.add(value)
        names.append(value)
    return sorted(names)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: name-audit.py <github|sheet>", file=sys.stderr)
        return 2
    task = sys.argv[1].strip()
    names = names_from_checklist(task)
    print(f"{task}: {len(names)} unique quoted names from the live checklist")
    for i, name in enumerate(names, 1):
        print(f"{i:3d}. {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
