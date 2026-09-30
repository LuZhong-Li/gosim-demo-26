"""Exact-string audit: live task page quotes vs the template sources.

Every quoted name in the requirement text is the exact English accessible name
of a control (the task page says so explicitly). This script extracts each quoted
string from the complete live page and reports the ones that appear nowhere in
the template, which is the raw material for the fix checklist.

Usage:
    python arcbench/notes/live_string_audit.py github
    python arcbench/notes/live_string_audit.py sheet
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIVE_DIR = Path(__file__).resolve().parent / "requirements-live"
TEMPLATES = ROOT / "arcbench" / "agent" / "templates"

SKIP = {
    "Create an account",
}


def quoted_strings(text: str) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for match in re.finditer(r"[“\"]([^”\"\n]{2,80})[”\"]", text):
        value = match.group(1).strip()
        # Placeholders like "<addition count>" and prose fragments are not names.
        if not value or value in seen:
            continue
        if value.startswith("<") and value.endswith(">"):
            continue
        if len(value.split()) > 7:
            continue
        seen.add(value)
        found.append(value)
    return found


def template_blob(task: str) -> str:
    root = TEMPLATES / task
    chunks: list[str] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in {"node_modules", "dist", "__pycache__"} for part in path.parts):
            continue
        if path.suffix not in {".js", ".jsx", ".ts", ".tsx", ".html", ".json", ".yaml", ".md"}:
            continue
        try:
            chunks.append(path.read_text(encoding="utf-8", errors="ignore"))
        except OSError:
            continue
    return "\n".join(chunks)


def main() -> int:
    task = (sys.argv[1] if len(sys.argv) > 1 else "github").strip()
    page = (LIVE_DIR / f"{task}-task-page.txt").read_text(encoding="utf-8")
    blob = template_blob(task)
    strings = quoted_strings(page)
    missing = [s for s in strings if s not in blob and s not in SKIP]

    out = [
        f"# {task}: quoted strings from the live page that are absent from the template",
        "",
        f"- quoted strings found on the live page: {len(strings)}",
        f"- absent from the template: {len(missing)}",
        "",
    ]
    for value in missing:
        out.append(f"- [ ] `{value}`")
    dest = LIVE_DIR / f"{task}-missing-strings.md"
    dest.write_text("\n".join(out), encoding="utf-8")
    print(f"wrote {dest}: {len(strings)} quoted / {len(missing)} missing")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
