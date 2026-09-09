"""Dump ARC-Bench official requirement trees to a compact text inventory.

Usage:
    python analyze_requirements.py <arcbench/data/requirements/github.json>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml


def walk(node: dict, depth: int, out: list[str]) -> None:
    indent = "  " * depth
    kind = node.get("type", "?")
    out.append(f"{indent}{node.get('id')} [{kind}] {node.get('name', '')}")
    for child in node.get("children") or []:
        walk(child, depth + 1, out)


def atomic_count(node: dict) -> int:
    if node.get("type") == "ATOMIC":
        return 1
    return sum(atomic_count(c) for c in node.get("children") or [])


def main() -> int:
    for path in sys.argv[1:]:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        tree = yaml.safe_load(data.get("requirements_yaml") or "{}")
        lines: list[str] = []
        walk(tree, 0, lines)
        print(f"===== {Path(path).name} =====")
        print(f"task={tree.get('name')}")
        for child in tree.get("children") or []:
            print(f"MODULE {child.get('id')} [{child.get('type')}] {child.get('name')} atoms={atomic_count(child)}")
        print("TREE:")
        print("\n".join(lines))
        print(f"TOTAL_NODES={len(lines)} TOTAL_ATOMS={atomic_count(tree)}")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
