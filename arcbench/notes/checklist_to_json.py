"""Parse a live ``*-checklist.md`` into a ``{req_id: [assertion, ...]}`` map.

The live checklist is the cleaned, authoritative assertion list for the two
private hackathon tasks (``github`` / ``sheet``). Each section is:

    ### REQ-x-x-x Title
    - [ ] assertion text

Some sections are attached to FOLDER-level ids (``REQ-4``, ``REQ-6``, ``REQ-2-1``)
rather than ATOMIC ids; those are kept verbatim keyed by their exact heading id.

Usage:
    python arcbench/notes/checklist_to_json.py github
    python arcbench/notes/checklist_to_json.py sheet

Writes ``arcbench/agent/assets/<task>/checklist.json`` (the shipped copy) and
mirrors it to ``arcbench/assets/<task>/checklist.json``.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # repo root (D:/gosim-demo-26)
LIVE_DIR = ROOT / "arcbench" / "notes" / "requirements-live"
AGENT_ASSETS = ROOT / "arcbench" / "agent" / "assets"
ROOT_ASSETS = ROOT / "arcbench" / "assets"

HEADING = re.compile(r"^###\s+(REQ-[\d-]+)\b")
BULLET = re.compile(r"^\s*-\s*\[\s*[xX ]?\s*\]\s*(.*)$")

# Trailing render noise the checklist keeps at the end of an assertion.
NOISE_TAIL = re.compile(
    r"\s*(image FILE Type:|image image|image\s*$|FILE Type:|Type:)\s*$",
    re.IGNORECASE,
)


def clean(assertion: str) -> str:
    text = assertion.strip()
    text = NOISE_TAIL.sub("", text).strip()
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_checklist(task: str) -> dict[str, list[str]]:
    path = LIVE_DIR / f"{task}-checklist.md"
    if not path.exists():
        raise FileNotFoundError(path)
    result: dict[str, list[str]] = {}
    current: str | None = None
    for line in path.read_text(encoding="utf-8").splitlines():
        heading = HEADING.match(line.strip())
        if heading:
            current = heading.group(1)
            result.setdefault(current, [])
            continue
        bullet = BULLET.match(line)
        if bullet and current:
            text = clean(bullet.group(1))
            if text:
                result[current].append(text)
    return result


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: checklist_to_json.py <github|sheet>", file=sys.stderr)
        return 2
    task = sys.argv[1].strip()
    data = parse_checklist(task)
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    for assets in (AGENT_ASSETS, ROOT_ASSETS):
        target = assets / task / "checklist.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(payload + "\n", encoding="utf-8")
        print(f"wrote {target} ({len(data)} requirements, "
              f"{sum(len(v) for v in data.values())} assertions)")
    enrich_map(task, data)
    return 0


def enrich_map(task: str, data: dict[str, list[str]]) -> None:
    """Attach each requirement's checklist to its node in requirement-map.json.

    Only the shipped copy (``agent/assets``) is what the generator reads, but we
    mirror to the sibling ``assets/`` to keep the repo consistent. Node ids,
    types, titles, descriptions and scenarios are left untouched.
    """
    for assets in (AGENT_ASSETS, ROOT_ASSETS):
        map_path = assets / task / "requirement-map.json"
        if not map_path.exists():
            continue
        blob = json.loads(map_path.read_text(encoding="utf-8"))
        nodes = blob.get("nodes") or []
        attached = 0
        for node in nodes:
            node["checklist"] = data.get(node.get("id") or "", [])
            if node["checklist"]:
                attached += 1
        blob["generated_at"] = datetime.now(timezone.utc).isoformat()
        map_path.write_text(json.dumps(blob, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
        print(f"enriched {map_path}: checklist attached to {attached} nodes "
              f"(of {len(nodes)})")


if __name__ == "__main__":
    raise SystemExit(main())
