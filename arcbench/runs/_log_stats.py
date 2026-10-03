"""Tally the key markers in every archived run log.

Output: one Markdown table plus a plain-text table, written next to the notes so
the consolidated document can quote real numbers instead of impressions.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOTS = [
    Path("D:/gosim-demo-26/arcbench/runs"),
    Path("D:/gosim-demo-26/arcbench/downloads/logs"),
]
OUT_MD = Path("D:/gosim-demo-26/arcbench/notes/_log-stats.md")

MARKERS = (
    ("crash", "argument handler must be a function"),
    # r76 added two failure modes the first column cannot see: the mount that
    # lost its handler ("requires a middleware function") and a store method the
    # module never exported ("store.createWorksheet is not a function").
    ("mwfn", "requires a middleware function"),
    ("typeerr", "TypeError:"),
    ("listen", "Backend listening"),
    ("seed", "world seed finished"),
    ("notfn", "is not a function"),
    ("nullread", "Cannot read properties of null"),
    ("enoent", "ENOENT"),
    ("nolist", "no listing route"),
    ("unrouted", "unrouted pages after patch"),
    ("mount", "entry points now mount"),
    ("built", "npm run build"),
)

COVERAGE = re.compile(r"exact-name coverage:\s*(\d+)/(\d+)")


def main() -> None:
    rows: list[list[str]] = []
    for root in ROOTS:
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*.txt")):
            if path.name.startswith("_log-stats"):
                continue
            if path.stat().st_size < 2000:      # tiny stubs carry no evidence
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            if "arc-agent" not in text and "template-app" not in text:
                continue
            counts = [str(text.count(needle)) for _, needle in MARKERS]
            coverage = COVERAGE.findall(text)
            cover = f"{coverage[-1][0]}/{coverage[-1][1]}" if coverage else "-"
            rel = str(path).replace("D:/gosim-demo-26/arcbench/", "").replace("\\", "/")
            rows.append([rel, f"{path.stat().st_size // 1024}K", *counts, cover])

    header = ["file", "size", *[name for name, _ in MARKERS], "coverage"]
    lines = ["| " + " | ".join(header) + " |", "|" + "---|" * len(header)]
    for row in rows:
        lines.append("| " + " | ".join(row) + " |")
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(rows)} logs tallied -> {OUT_MD}")
    print(f"columns: {' '.join(header)}")
    for row in rows:
        print("  " + " ".join(row))


if __name__ == "__main__":
    main()
