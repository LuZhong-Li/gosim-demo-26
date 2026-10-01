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


def drop_shadow_entry_files(project_dir: Path) -> list[str]:
    """Keep exactly one ``App`` shell and one ``main`` entry in frontend/src.

    Vite resolves ``./App`` to ``App.jsx`` BEFORE ``App.tsx``, so a stray
    ``App.jsx`` silently shadows the scaffold's ``App.tsx`` - and when several
    modules each wrote their own App/router, one of the routing tables wins at
    random. r41 shipped ``App.jsx`` and ``App.tsx`` side by side. Keep the
    larger one (the model's, which carries the task routes) and remove the rest.
    """
    fixes: list[str] = []
    src = project_dir / "frontend" / "src"
    if not src.is_dir():
        return fixes
    for stem in ("App", "main"):
        present = [src / f"{stem}{ext}" for ext in (".jsx", ".tsx", ".js", ".ts")]
        present = [path for path in present if path.exists()]
        if len(present) < 2:
            continue
        keep = max(present, key=lambda path: path.stat().st_size)
        for path in present:
            if path == keep:
                continue
            try:
                path.unlink()
            except OSError:
                continue
            fixes.append(f"{path.name}: shadowed by {keep.name}, removed")
    return fixes


#: Modules each generated file may import with a relative path.
SOURCE_SUFFIXES = (".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".json", ".css")

FROM_RE = re.compile(r"""\bfrom\s*['"]([^'"]+)['"]""")
SIDE_EFFECT_IMPORT_RE = re.compile(r"""(?m)^\s*import\s*['"]([^'"]+)['"]""")
REQUIRE_RE = re.compile(r"""\brequire\(\s*['"]([^'"]+)['"]\s*\)""")


def _resolve_target(base: Path, specifier: str) -> Path | None:
    """The file a relative import points at, or None when it is not ours/absent."""
    if not specifier.startswith("."):
        # Bare specifier, node builtin or a bundler alias: not ours to resolve.
        return None
    target = base.parent / specifier
    candidates = [target]
    if not target.suffix:
        candidates.extend(Path(f"{target}{suffix}") for suffix in SOURCE_SUFFIXES)
        candidates.extend(target / f"index{suffix}" for suffix in SOURCE_SUFFIXES)
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def _specifiers(path: Path) -> set[str]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return set()
    found = set(FROM_RE.findall(text))
    found.update(SIDE_EFFECT_IMPORT_RE.findall(text))
    found.update(REQUIRE_RE.findall(text))
    return found


def reachable_from(entry: Path) -> set[Path]:
    """Every file reachable from ``entry`` by following relative imports."""
    seen: set[Path] = set()
    stack = [entry]
    while stack:
        path = stack.pop()
        if path in seen or not path.is_file():
            continue
        seen.add(path)
        for specifier in _specifiers(path):
            target = _resolve_target(path, specifier)
            if target is not None and target not in seen:
                stack.append(target)
    return seen


def unrouted_pages(project_dir: Path) -> list[str]:
    """Page components that nothing reachable from the entry point imports.

    The modules are generated one call at a time and each is told to add its own
    routes to ``App.tsx``. A later module that rewrites that file from scratch
    instead of extending it drops every earlier module's routes: the page files
    are still on disk, the accessible names are still in the source - so the
    self-check is happy - but no test can navigate to them. That is invisible in
    the build and in the start-up rehearsal, and it costs every test that needs
    those screens.
    """
    src = project_dir / "frontend" / "src"
    if not src.is_dir():
        return []
    entry = next(
        (src / f"main{suffix}" for suffix in (".tsx", ".ts", ".jsx", ".js")
         if (src / f"main{suffix}").exists()),
        None,
    )
    if entry is None:
        return []
    reachable = reachable_from(entry)
    orphaned: list[str] = []
    for folder in ("pages", "screens", "views"):
        root = src / folder
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.suffix not in (".tsx", ".jsx"):
                continue
            if path not in reachable:
                orphaned.append(str(path.relative_to(project_dir)).replace("\\", "/"))
    return orphaned


def check_local_imports(project_dir: Path) -> list[str]:
    """List relative imports whose target file was never written.

    Every module is its own model call, so one module can import
    ``./pages/RepoPage`` while the module that was supposed to write that file
    failed or named it differently. Nothing in the build catches it in time: the
    frontend bundle throws on the first missing module (a blank page for every
    test) and the backend dies on ``require`` before it binds the port (zero
    tests execute at all). Both are exactly the shape of the last few zero
    scores, and both are cheap to detect statically.
    """
    missing: list[str] = []
    for root in (project_dir / "frontend" / "src", project_dir / "backend"):
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.suffix not in (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"):
                continue
            if "node_modules" in path.parts:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            specifiers = set(FROM_RE.findall(text))
            specifiers.update(SIDE_EFFECT_IMPORT_RE.findall(text))
            specifiers.update(REQUIRE_RE.findall(text))
            for specifier in sorted(specifiers):
                # Only relative paths belong to this project; a bare specifier
                # is an installed package or a bundler alias.
                if not specifier.startswith("."):
                    continue
                if _resolve_target(path, specifier) is not None:
                    continue
                missing.append(f"{path.relative_to(project_dir)} imports '{specifier}'")
    return missing


#: Rollup/Vite's wording for an import it cannot resolve, as it appears in the
#: rehearsal's captured build output.
UNRESOLVED_IMPORT = re.compile(r'Could not resolve "([^"]+)" from "([^"]+)"')


def _stub_path(project_dir: Path, importer: str, specifier: str) -> Path | None:
    """Where a missing module imported by ``importer`` has to be created."""
    candidates = [project_dir / importer, project_dir / "frontend" / importer]
    importer_path = Path(importer)
    if importer_path.is_absolute():
        candidates.insert(0, importer_path)
    base = next((path for path in candidates if path.exists()), None)
    if base is None:
        base = project_dir / "frontend" / importer
    raw = base.parent / specifier
    target = raw if raw.suffix else Path(f"{raw}.tsx")
    try:
        target.relative_to(project_dir)
    except ValueError:
        return None
    return target


def stub_missing_modules(project_dir: Path, error_text: str) -> list[str]:
    """Write a placeholder for every module the bundle cannot resolve.

    r49 scored zero for exactly this: App.tsx imported ``./pages/RegisterPage``,
    no module ever wrote that file, ``vite build`` failed, and the grader could
    not build the app at all - so not one of the 100 tests ran. The model repair
    turn was tried once and did not fix it either. Creating the missing file is
    mechanical, cannot be worse than a build that fails outright, and costs no
    tokens, so it happens before another model turn is spent.
    """
    created: list[str] = []
    for specifier, importer in UNRESOLVED_IMPORT.findall(error_text or ""):
        if not specifier.startswith("."):
            continue
        target = _stub_path(project_dir, importer, specifier)
        if target is None or target.exists():
            continue
        name = re.sub(r"[^A-Za-z0-9_]", "", target.stem) or "Placeholder"
        if target.suffix in (".tsx", ".jsx"):
            body = (
                "// Placeholder written by the ARC agent: this module was imported\n"
                "// by another file but never generated. A visible heading keeps the\n"
                "// bundle resolvable so the app can still be graded.\n"
                f"export default function {name}() {{\n"
                f"  return <section><h1>{name}</h1></section>;\n"
                "}\n"
                f"export {{ {name} }};\n"
            )
        else:
            body = (
                "// Placeholder written by the ARC agent for a module that was\n"
                "// imported but never generated.\n"
                f"export default function {name}() {{ return null; }}\n"
                f"export {{ {name} }};\n"
            )
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body, encoding="utf-8")
        except OSError:
            continue
        created.append(str(target.relative_to(project_dir)).replace("\\", "/"))
    return created


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
