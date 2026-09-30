"""Generation-time self-check.

The runner starts the application *after* the agent finishes, so the agent
cannot probe the running app. What it can do is verify that the code it just
wrote actually mentions the names the requirements pin down: every quoted phrase
in a requirement is an exact English accessible name, and a name that never
appears in the generated source cannot possibly be found by the tests.

This prints a capped report into the run's stdout so a bad generation is visible
immediately instead of only after the hidden suite runs.
"""

from __future__ import annotations

import re
from pathlib import Path

SOURCE_SUFFIXES = {".js", ".jsx", ".ts", ".tsx", ".html", ".css"}
SKIP_DIRS = {"node_modules", "dist", ".git", "__pycache__", ".arc"}

# Values the tests type or that only describe the domain, not UI names.
NOT_A_UI_NAME = re.compile(
    r"(@|^\d+$|^[-.]|<|^(not-an-email|does-not-match|000000|123456|short|different|owner)$)"
    r"|^(Read|Triage|Write|Maintain|Admin|Member|Owner)$"
    r"|(Repository created by Playwright)"
    # Domain nouns and relation ids are lowercase tokens, never control names.
    r"|^[a-z0-9][a-z0-9/-]*$"
    # Relation phrases such as "owner/repository name" or "pull request (PR)".
    r"|/|\((PR|optional)\)"
    # Leftovers from a stringified structure never name a control.
    r"|[{}()\[\]:]|'\w+':|^\W"
)


def _scenario_text(value: object) -> str:
    """Flatten a scenario, which is a list of {name, steps:[{keyword, content}]}.

    Stringifying that structure puts Python dict syntax into the quoted text, and
    those fragments were being reported - and prompted back to the model - as if
    they were accessible names.
    """
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        parts = [
            value[key]
            for key in ("name", "title", "content", "text", "description")
            if isinstance(value.get(key), str)
        ]
        for key in ("steps", "scenarios", "children"):
            if value.get(key) is not None:
                parts.append(_scenario_text(value[key]))
        return " ".join(parts)
    if isinstance(value, (list, tuple)):
        return " ".join(_scenario_text(item) for item in value)
    return ""


def quoted_names(nodes: list[dict]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for node in nodes:
        # The live checklist (attached to each node as ``checklist`` by the data
        # refresh) is the authoritative assertion list and quotes the exact
        # accessible names; scan it too so a stale map cannot hide a missing name.
        checklist = node.get("checklist")
        checklist_text = " ".join(checklist) if isinstance(checklist, list) else ""
        text = " ".join(
            [
                str(node.get("title") or ""),
                str(node.get("description") or ""),
                str(node.get("seed_hint") or ""),
                _scenario_text(node.get("scenarios")),
                checklist_text,
            ]
        )
        for match in re.finditer(r"[“\"]([^”\"\n]{3,60})[”\"]", text):
            value = match.group(1).strip()
            if not value or value in seen or NOT_A_UI_NAME.search(value):
                continue
            seen.add(value)
            names.append(value)
    return names


def project_source(project_dir: Path) -> str:
    chunks: list[str] = []
    for path in project_dir.rglob("*"):
        if not path.is_file() or path.suffix not in SOURCE_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        try:
            chunks.append(path.read_text(encoding="utf-8", errors="ignore"))
        except OSError:
            continue
    return "\n".join(chunks)


def report(project_dir: Path, nodes: list[dict], limit: int = 25) -> dict:
    names = quoted_names(nodes)
    blob = project_source(project_dir)
    missing = [name for name in names if name not in blob]
    return {
        "checked": len(names),
        "missing": missing,
        "missing_shown": missing[:limit],
    }


def main(project_dir: Path, nodes: list[dict]) -> None:
    result = report(project_dir, nodes)
    print(
        f"[selfcheck] exact-name coverage: {result['checked'] - len(result['missing'])}/"
        f"{result['checked']} present "
        f"({len(result['missing'])} missing)",
        flush=True,
    )
    for name in result["missing_shown"]:
        print(f"[selfcheck] missing name: {name}", flush=True)
