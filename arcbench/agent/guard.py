"""Post-generation guard for the build contract.

The model is asked to write task-specific source on top of the scaffold. If it
rewrites something build-critical - the Vite config, package.json, the backend
entrypoint, index.html - a single bad file turns the whole submission into an
unbuildable project and scores zero. This module checks those files after
generation and restores the scaffold copy whenever the generated one is broken.
"""

from __future__ import annotations

import json
import re
import subprocess
import shutil
from pathlib import Path

#: Express 5 (path-to-regexp v8) rejects a bare "*" as a route path:
#:   PathError: Missing parameter name at index 1: *
#: The pattern is still extremely common in model output for a SPA fallback, and
#: it crashes the backend at startup - which means the grader's readiness probe
#: never answers and ZERO tests execute. Rewrite it to a RegExp, which Express 5
#: accepts and which also keeps /api out of the fallback.
WILDCARD_ROUTE = re.compile(r"""\.(get|use|all|options|head)\(\s*(['"])\*\2""")
SAFE_FALLBACK = r".\1(/^(?!\/api(?:\/|$)).*/"

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

#: The grader runs exactly ``npm install`` + ``npm run build`` in ``frontend/``
#: and ``npm install`` + ``npm start`` in ``backend/``. Models routinely "help"
#: by adding a type-check step (``tsc && vite build`` - the stock Vite template
#: default) even though the scaffold ships no ``tsconfig.json``; ``tsc`` then
#: prints its help text and exits non-zero, and the evaluation aborts before a
#: single Playwright test runs. That is exactly what happened to r38 Sheet:
#:   [frontend-npm-build.stdout] > tsc && vite build
#:   [frontend-npm-build.stdout] tsc: The TypeScript Compiler - Version 5.9.3
#:   Run Status ... Command '['npm', 'run', 'build']' returned non-zero exit status 1
#: These scripts are therefore forced back to something the grader can run.
REQUIRED_SCRIPTS = {
    "frontend": {"dev": "vite", "build": "vite build", "preview": "vite preview"},
    "backend": {"start": "node src/index.js", "dev": "node src/index.js"},
}

#: Nothing task-specific belongs in these files and a bad copy silently breaks
#: the build, so the generated version is always replaced by the scaffold copy.
ALWAYS_RESTORE = (
    "frontend/vite.config.js",
    "frontend/index.html",
)

#: Files whose *existence* matters (index.html loads main.tsx). Restored only
#: when generation deleted them.
MUST_EXIST = (
    "frontend/src/main.tsx",
    "frontend/src/App.tsx",
    "frontend/src/index.css",
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


def fix_wildcard_routes(project_dir: Path) -> list[str]:
    """Rewrite Express-5-incompatible ``'*'`` routes in the generated backend.

    Returns the list of files changed. Only ``backend/**/*.js`` is touched, and
    only the route path literal changes, so the model's own handlers survive.
    """
    fixes: list[str] = []
    backend = project_dir / "backend"
    if not backend.is_dir():
        return fixes
    for path in sorted(backend.rglob("*.js")):
        if "node_modules" in path.parts:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        patched, count = WILDCARD_ROUTE.subn(SAFE_FALLBACK, text)
        if not count:
            continue
        try:
            path.write_text(patched, encoding="utf-8")
        except OSError:
            continue
        fixes.append(f"{path.relative_to(project_dir)} ({count} route(s))")
    return fixes


def _load_package(path: Path) -> dict | None:
    """Parse a package.json, returning ``None`` when it is unusable."""
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:  # noqa: BLE001 - any parse failure means "restore it"
        return None
    return data if isinstance(data, dict) else None


def fix_build_scripts(project_dir: Path, scaffold_dir: Path) -> list[str]:
    """Make the two ``npm run`` commands the grader uses survive generation.

    Three independent hazards, all seen in real submissions:

    * the model adds ``tsc`` to ``frontend`` ``build`` (no tsconfig.json ships,
      so ``tsc`` prints help and exits 1 -> zero tests execute);
    * the model rewrites/deletes ``vite.config.js`` or ``index.html``;
    * the model drops a dependency the scaffold's own files still import.

    The model's task-specific source is never touched here - only the build
    plumbing it has no reason to own.
    """
    fixes: list[str] = []

    for relative in ALWAYS_RESTORE:
        source = scaffold_dir / relative
        if not source.exists():
            continue
        target = project_dir / relative
        wanted = source.read_text(encoding="utf-8")
        current = target.read_text(encoding="utf-8", errors="replace") if target.exists() else None
        if current == wanted:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        fixes.append(f"{relative}: restored scaffold copy")

    for relative in MUST_EXIST:
        target = project_dir / relative
        source = scaffold_dir / relative
        if target.exists() or not source.exists():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        fixes.append(f"{relative}: restored missing file")

    for section, required in REQUIRED_SCRIPTS.items():
        relative = f"{section}/package.json"
        target = project_dir / relative
        source = scaffold_dir / relative
        if not target.exists():
            if source.exists():
                shutil.copyfile(source, target)
                fixes.append(f"{relative}: restored missing package.json")
            continue

        data = _load_package(target)
        if data is None:
            if source.exists():
                shutil.copyfile(source, target)
                fixes.append(f"{relative}: unreadable, restored scaffold copy")
            continue

        changed = False
        scripts = data.get("scripts")
        if not isinstance(scripts, dict):
            scripts = {}
        for name, command in required.items():
            current = scripts.get(name)
            if isinstance(current, str) and current.strip():
                # Keep a wrapper the model added, but never a type-check step:
                # it runs first and fails the grader before any test executes.
                if name != "build" or "tsc" not in current:
                    continue
            scripts[name] = command
            changed = True
        if scripts != data.get("scripts"):
            data["scripts"] = scripts
            changed = True

        scaffold_data = _load_package(source) if source.exists() else None
        if scaffold_data:
            for key in ("dependencies", "devDependencies"):
                wanted = scaffold_data.get(key)
                if not isinstance(wanted, dict):
                    continue
                block = data.get(key)
                if not isinstance(block, dict):
                    block = {}
                    data[key] = block
                for name, version in wanted.items():
                    if name not in block:
                        block[name] = version
                        changed = True

        if not changed:
            continue
        target.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        fixes.append(f"{relative}: build plumbing normalised")

    return fixes
