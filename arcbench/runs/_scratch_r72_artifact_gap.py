"""What the graded artifact is missing, name by name.

The run page's workspace zip is the app the suite actually drove, so this is the
first analysis that is not an inference: parse the payload that was mounted,
then check every quoted requirement name against the artifact's own sources.
"""

from __future__ import annotations

import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import yaml  # noqa: E402
from selfcheck import quoted_names  # noqa: E402

ARTIFACTS = Path("D:/gosim-demo-26/arcbench/runs/_r71_artifacts")

RUNS = {
    "stage1": "205ed8a34f2f",
    "github": "0faa84342044",
    "stage2": "3f2b94d57f57",
    "stage3": "79d55d4c9577",
    "sheet": "ec386f813833",
}


def payload_nodes(task: str) -> list[dict]:
    path = ARTIFACTS / RUNS[task] / "template" / "requirements" / "requirements.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    nodes: list[dict] = []

    def walk(node: object) -> None:
        if isinstance(node, dict):
            nodes.append(node)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(data)
    return nodes


def frontend_text(task: str) -> str:
    root = ARTIFACTS / RUNS[task] / "template" / "frontend" / "src"
    parts = []
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix in (".tsx", ".ts", ".jsx", ".js", ".css"):
            parts.append(path.read_text(encoding="utf-8", errors="replace"))
    return "\n".join(parts)


def main() -> None:
    for task in ("stage1", "sheet"):
        nodes = payload_nodes(task)
        names = quoted_names(nodes)
        text = frontend_text(task)
        missing = [name for name in names if name not in text]
        print(f"== {task}: payload nodes={len(nodes)} quoted names={len(names)} "
              f"missing={len(missing)}")
        for name in sorted(missing)[:24]:
            print(f"   MISSING {name}")
        # Which files exist at all
        pages = ARTIFACTS / RUNS[task] / "template" / "frontend" / "src" / "pages"
        if pages.is_dir():
            print("   pages:", ", ".join(sorted(p.name for p in pages.glob("*.tsx")))[:400])


if __name__ == "__main__":
    main()
