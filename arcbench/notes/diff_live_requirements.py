"""Sentence-level diff between the LIVE task pages and the stale local snapshot.

The platform task pages are authoritative (the organisers re-uploaded the task
text on 2026-09-30). ``arcbench/data/requirements/*.json`` was captured on
2026-09-09 and is missing many normative sentences, which is why the app keeps
missing official tests.

Usage:
    python arcbench/notes/diff_live_requirements.py github
    python arcbench/notes/diff_live_requirements.py sheet

Writes ``arcbench/notes/requirements-live/<task>-delta.md`` listing, per
requirement, the sentences that appear only on the live page.
"""

from __future__ import annotations

import difflib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIVE_DIR = ROOT / "arcbench" / "notes" / "requirements-live"
SNAPSHOT_DIR = ROOT / "arcbench" / "data" / "requirements"

HEADING = re.compile(r"^(REQ-[\d-]+)\s+(.+?)$", re.MULTILINE)
NOISE = re.compile(
    r"^(A|ArcBench|CN|LI|Logout|Competition|/|hackathon|Download all requirements|README\.md|"
    r"CONTENTS|Screenshot reference:|Page reference:|image image|image FILE|Open|Type:|"
    r"FOLDER|ATOMIC|Dependencies:|None|Scenarios:|Legend|Designing|Implementing|Passed|Failed)$"
)


def sentences(text: str) -> list[str]:
    # Normalise both sides before splitting: the local snapshot is markdown
    # (``- **GIVEN:**``) while the live page renders plain paragraphs, so list
    # markers and emphasis have to go or the two sides never line up.
    flat = re.sub(r"[*`]", "", text)
    flat = re.sub(r"(?m)^\s*[-•]\s+", "", flat)
    flat = re.sub(r"\s+", " ", flat).strip()
    flat = re.sub(r"(GIVEN|WHEN|THEN):", r"\1:  ", flat)
    parts = re.split(r"(?<=[.;:])\s+(?=[A-Z“\"(])", flat)
    return [p.strip() for p in parts if len(p.strip()) > 15]


BOILERPLATE = re.compile(
    r"^(FOLDER|ATOMIC|image FILE|Type:|Dependencies:?|None\b|Legend\b|Canvas\b|File\b|Diff\b|"
    r"Stdout\b|Run Status\b|Traceability\b|Status\b)",
    re.IGNORECASE,
)


def is_boilerplate(sentence: str) -> bool:
    stripped = sentence.strip()
    if BOILERPLATE.match(stripped):
        return True
    return "Dependencies:" in stripped and len(stripped) < 60


def key(sentence: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", "", sentence.lower()).strip()


def live_blocks(task: str) -> dict[str, str]:
    raw = (LIVE_DIR / f"{task}-task-page.txt").read_text(encoding="utf-8")
    lines = [ln.rstrip() for ln in raw.splitlines()]
    # Drop the nav/table-of-contents preamble: the contents links are bare REQ ids.
    start = raw.find("Download all requirements")
    if start == -1:
        start = 0
    body = raw[start:]
    blocks: dict[str, list[str]] = {}
    current: str | None = None
    for line in body.splitlines():
        stripped = line.strip()
        if NOISE.match(stripped) or stripped.startswith("arc-bench.com/"):
            continue
        heading = HEADING.match(stripped)
        # Scenario labels look like "REQ-1-1-1: Title - Scenario 2".
        if heading and ":" not in heading.group(1) and not stripped.endswith("Scenario"):
            current = heading.group(1)
            blocks.setdefault(current, []).append(heading.group(2))
            continue
        if current and not stripped.startswith("REQ-") and stripped:
            blocks[current].append(stripped)
    return {k: "\n".join(v) for k, v in blocks.items()}


def snapshot_blocks(task: str) -> dict[str, str]:
    data = json.loads((SNAPSHOT_DIR / f"{task}.json").read_text(encoding="utf-8"))
    md = data["requirements_markdown"]
    blocks: dict[str, list[str]] = {}
    current: str | None = None
    for line in md.splitlines():
        header = re.match(r"^#{2,4}\s+(REQ-[\d-]+)\s+(.*)$", line)
        if header:
            current = header.group(1)
            blocks.setdefault(current, []).append(header.group(2))
            continue
        if current:
            blocks[current].append(line)
    return {k: "\n".join(v) for k, v in blocks.items()}


def main() -> int:
    task = (sys.argv[1] if len(sys.argv) > 1 else "github").strip()
    live = live_blocks(task)
    old = snapshot_blocks(task)

    out: list[str] = [
        f"# {task}: live task page vs local snapshot",
        "",
        f"- live requirements parsed: {len(live)}",
        f"- local snapshot requirements: {len(old)}",
        "",
        "Only sentences that exist on the live page but not in the local snapshot are listed.",
        "",
    ]
    total_new = 0
    for req_id in sorted(live, key=lambda r: [int(p) for p in re.findall(r"\d+", r)][:6]):
        live_text = live[req_id]
        old_text = old.get(req_id, "")
        old_sentences = [key(s) for s in sentences(old_text)]
        new: list[str] = []
        for sentence in sentences(live_text):
            if is_boilerplate(sentence):
                continue
            k = key(sentence)
            if not k:
                continue
            if k in old_sentences:
                continue
            best = difflib.get_close_matches(k, old_sentences, n=1, cutoff=0.75)
            if best:
                continue
            new.append(sentence)
        if not new:
            continue
        total_new += len(new)
        title = live[req_id].splitlines()[0] if live[req_id] else ""
        out.append(f"## {req_id} {title}")
        out.append("")
        for sentence in new:
            out.append(f"- {sentence}")
        out.append("")

    out.insert(4, f"- live-only sentences: {total_new}")
    dest = LIVE_DIR / f"{task}-delta.md"
    dest.write_text("\n".join(out), encoding="utf-8")
    print(f"wrote {dest} ({total_new} live-only sentences)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
