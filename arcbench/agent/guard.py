"""Post-generation guard for the build contract.

The model is asked to write task-specific source on top of the scaffold. If it
rewrites something build-critical - the Vite config, package.json, the backend
entrypoint, index.html - a single bad file turns the whole submission into an
unbuildable project and scores zero. This module checks those files after
generation and restores the scaffold copy whenever the generated one is broken.
"""

from __future__ import annotations

import json
import subprocess
import shutil
from pathlib import Path

# Files whose content decides whether the project builds and starts.
PROTECTED = (
    "frontend/package.json",
    "frontend/vite.config.js",
    "frontend/index.html",
    "frontend/src/main.tsx",
    "backend/package.json",
    "backend/src/index.js",
    "backend/src/app.js",
)


def _node_check(path: Path) -> tuple[bool, str]:
    """Syntax-check a CommonJS/ESM JavaScript file when node is available."""
    try:
        result = subprocess.run(
            ["node", "--check", str(path)],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except FileNotFoundError:
        return True, "node not available"
    except Exception as exc:  # noqa: BLE001 - treat any failure as "cannot verify"
        return True, f"check skipped: {exc}"
    if result.returncode == 0:
        return True, "ok"
    return False, (result.stderr or result.stdout).strip().splitlines()[-1:] and (
        result.stderr or result.stdout
    ).strip()[:200]


def validate(path: Path) -> tuple[bool, str]:
    if not path.exists():
        return False, "file is missing"
    body = path.read_text(encoding="utf-8", errors="replace")
    if not body.strip():
        return False, "file is empty"

    if path.name == "package.json":
        try:
            data = json.loads(body)
        except Exception as exc:  # noqa: BLE001
            return False, f"invalid JSON: {exc}"
        scripts = data.get("scripts") or {}
        if "build" not in scripts and "start" not in scripts:
            return False, "package.json lost its build/start script"
        return True, "ok"

    if path.suffix == ".js":
        return _node_check(path)

    return True, "ok"


def guard(project_dir: Path, scaffold_dir: Path, generated: set[str]) -> list[str]:
    """Restore scaffold copies of protected files that generation broke."""
    reverts: list[str] = []
    for relative in PROTECTED:
        if relative not in generated:
            continue
        target = project_dir / relative
        ok, reason = validate(target)
        if ok:
            continue
        source = scaffold_dir / relative
        if not source.exists():
            continue
        shutil.copyfile(source, target)
        reverts.append(f"{relative}: {reason}")
    return reverts
