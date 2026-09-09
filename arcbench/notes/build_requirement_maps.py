"""Build requirement-map.json assets from official requirement packages.

These maps are the seed for P3 generator prompts; they contain no generation
logic, only extracted requirement nodes, scenarios, and seed hints.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
TASKS = {
    "github": ROOT / "data" / "requirements" / "github.json",
    "sheet": ROOT / "data" / "requirements" / "sheet.json",
}
OUT = ROOT / "assets"


def seed_hint(description: str | None) -> str:
    text = description or ""
    for marker in ("Required system data", "Screenshot reference", "The system must contain"):
        idx = text.find(marker)
        if idx >= 0:
            return text[idx:].strip()
    return ""


def module_of(node_id: str) -> str:
    parts = node_id.split("-")
    return f"{parts[0]}-{parts[1]}" if len(parts) >= 2 else node_id


def build(task: str) -> dict:
    data = json.loads(TASKS[task].read_text(encoding="utf-8"))
    tree = yaml.safe_load(data.get("requirements_yaml") or "{}")
    nodes: list[dict] = []

    def walk(node: dict) -> None:
        node_id = node.get("id")
        if not node_id:
            return
        record = {
            "id": node_id,
            "module": module_of(node_id),
            "title": node.get("name", ""),
            "type": node.get("type", ""),
            "dependencies": node.get("dependencies") or [],
            "description": node.get("description") or "",
            "scenarios": node.get("scenarios") or [],
            "seed_hint": seed_hint(node.get("description")),
        }
        nodes.append(record)
        for child in node.get("children") or []:
            walk(child)

    walk(tree)
    return {
        "task": tree.get("name") or task,
        "task_id": task,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "nodes": nodes,
    }


def main() -> int:
    for task in TASKS:
        target = OUT / task / "requirement-map.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(
            json.dumps(build(task), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"wrote {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
