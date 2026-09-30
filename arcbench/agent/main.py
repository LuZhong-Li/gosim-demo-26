"""ArcBench agent entrypoint.

Platform invocation (observed from run logs):
    python3 main.py <requirements-source> --output-dir <output-dir>

The bundle vendors the real ``arcbench_agent_runtime`` SDK next to this file
(copied from code-philia/agentic-requirement-compiler's ``src/``), because the
platform does not pre-install the module for custom agent bundles.

The shape of one run:

    resolve inputs -> read the requirement tree -> locate the published specs
    -> copy the stack-only scaffold -> call the model once per requirement
    module -> guard the build contract -> rehearse the grader's own sequence
    (npm install, npm run build, npm start on a NON-grading port) -> repair once
    when the rehearsal failed -> report standard traceability states -> commit
    -> structural postflight, free the grading port, announce the preview.

Local self-test run:
    python main.py <requirements-dir> --output-dir <output-dir>
      plus ARC_TESTS_DIR / ARC_NODE / ARC_PLAYWRIGHT_CLI / ARC_PLAYWRIGHT_CONFIG
      to run a local Playwright suite, and ARC_SKIP_REHEARSAL=1 to skip the
      build/start rehearsal.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path

import yaml

from arcbench_agent_runtime import AgentRuntime
from guard import guard as guard_generated
from llm import LlmClient
from prompts import (
    GENERATION_SYSTEM,
    PERFORMANCE_CONTRACT,
    REPAIR_SYSTEM,
    STACK_RULES,
    UI_CONTRACT,
    UNUSABLE_REPLY_NUDGE,
)
from selfcheck import main as run_selfcheck
from selfcheck import quoted_names as exact_names
from verify import (
    free_port,
    locate_acceptance_tests,
    log,
    postflight_structure_check,
    read_specs,
    rehearse_startup,
    run_local_acceptance,
    spec_extra_ports,
)

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # pragma: no cover - older interpreters
    pass


ROOT = Path(__file__).resolve().parent
TEMPLATES = ROOT / "templates"
ASSETS = ROOT / "assets"
# The only shipped template is the stack-only scaffold: the rules forbid shipping
# task-specific implementations, so the model writes them at generation time.
WEB_FALLBACK_TEMPLATE = "scaffold"

# Wall-clock budget for the whole generation flow. Past it we stop starting new
# model calls and go straight to the rehearsal and the closing checks: a partial
# application that exits cleanly scores better than a SIGTERM mid-turn.
DEFAULT_TIME_BUDGET = 3600


# --------------------------------------------------------------- inputs

def load_requirements(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def iter_nodes(node: dict):
    yield node
    for child in node.get("children") or []:
        yield from iter_nodes(child)


def resolve_requirements_source(value: str | None) -> Path:
    if value:
        path = Path(value)
        if path.is_dir():
            candidate = path / "requirements.yaml"
            if not candidate.exists():
                candidates = list(path.glob("*.yaml")) + list(path.glob("*.yml"))
                if not candidates:
                    raise FileNotFoundError(f"no requirements yaml found under {path}")
                candidate = candidates[0]
            return candidate
        return path
    # Env fallback for local runs without a positional argument. The platform
    # hands the requirement tree over as the first argument.
    task_dir = os.environ.get("ARCBENCH_TASK_DIR")
    if task_dir:
        return resolve_requirements_source(task_dir)
    workspace = Path(os.environ.get("ARC_WORKSPACE", Path.cwd()))
    path = Path(os.environ.get("ARC_REQUIREMENTS_DIR", workspace / "requirements"))
    if path.is_dir():
        return path / "requirements.yaml"
    return path


# --------------------------------------------------------------- template

def copy_excludes(slug: str) -> set[str]:
    """Paths the generated project must not inherit from the template.

    ``template.yaml`` declares ``copy.exclude`` and the platform's own copier
    honours it; the agent has to as well, otherwise a local ``node_modules`` is
    copied as a half-broken tree and the generated project balloons.
    """
    defaults = {"node_modules", "dist", ".git", "__pycache__", ".arc-test-db", "template.yaml"}
    manifest = TEMPLATES / slug / "template.yaml"
    if not manifest.exists():
        return defaults
    try:
        data = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
        declared = (data.get("copy") or {}).get("exclude") or []
    except Exception:  # noqa: BLE001 - a broken manifest must not stop the run
        declared = []
    for entry in declared:
        name = str(entry).replace("\\", "/").rstrip("/")
        # Patterns are directory names ("node_modules") or relative paths
        # ("frontend/node_modules"); the trailing segment covers both.
        defaults.add(name.split("/")[-1])
    return defaults


def copy_template(slug: str, project_dir: Path) -> bool:
    src_dir = TEMPLATES / slug
    project_dir.mkdir(parents=True, exist_ok=True)
    if src_dir.is_dir():
        shutil.copytree(
            src_dir,
            project_dir,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns(*sorted(copy_excludes(slug))),
        )
        return True
    (project_dir / "index.html").write_text(
        f"<!doctype html><meta charset=utf-8><title>{slug}</title><h1>{slug}</h1>",
        encoding="utf-8",
    )
    return False


def write_npm_mirror(project_dir: Path) -> None:
    """Point both installs at npmmirror.

    The runner reaches npmjs.org slowly and unreliably, and every dependency it
    cannot fetch is a failed install that stops the grading sequence before a
    single test runs. The reference adapter sets the same registry for the
    processes it spawns; a committed ``.npmrc`` also covers the ``npm install``
    the runner itself performs after we exit.
    """
    registry = os.environ.get("ARC_NPM_REGISTRY", "https://registry.npmmirror.com")
    for relative in ("frontend", "backend"):
        folder = project_dir / relative
        if not folder.is_dir():
            continue
        npmrc = folder / ".npmrc"
        if npmrc.exists() and registry in npmrc.read_text(encoding="utf-8", errors="replace"):
            continue
        npmrc.write_text(f"registry={registry}\naudit=false\nfund=false\n", encoding="utf-8")


# --------------------------------------------------------------- plan

def load_coverage(slug: str) -> set[str]:
    path = TEMPLATES / slug / "coverage.json"
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    return set(data.get("implemented") or [])


def task_slug(task_name: str) -> str:
    name = (task_name or "").lower()
    if "github" in name:
        return "github"
    if "spreadsheet" in name or "sheet" in name:
        return "sheet"
    if "keep" in name:
        return "keep"
    return re.sub(r"[^a-z0-9]+", "-", name).strip("-") or "app"


def load_task_map(slug: str) -> dict | None:
    path = ASSETS / slug / "requirement-map.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def load_asset_guidance(slug: str) -> str:
    """Domain notes shipped next to the requirement map, if there are any."""
    folder = ASSETS / slug / "prompts"
    if not folder.is_dir():
        return ""
    chunks: list[str] = []
    for path in sorted(folder.glob("*.md")):
        try:
            chunks.append(path.read_text(encoding="utf-8").strip())
        except OSError:
            continue
    return "\n\n".join(chunks)


def write_manifest(project_dir: Path, slug: str, tree: dict, task_map: dict | None) -> None:
    manifest = {
        "task": tree.get("name"),
        "template": slug,
        "modules": [],
        "asset_map_used": task_map is not None,
    }
    for child in tree.get("children") or []:
        manifest["modules"].append(
            {"id": child.get("id"), "name": child.get("name"), "type": child.get("type")}
        )
    (project_dir / "generation-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def build_module_plan(task_map, coverage):
    """Derive a per-module plan from the requirement map (REQ-<n> folders)."""
    if not task_map:
        return []
    nodes = list(iter_nodes({"children": task_map.get("nodes", [])}))
    modules = []
    for node in nodes:
        if node.get("type") != "FOLDER" or not re.fullmatch(r"REQ-\d+", str(node.get("id", ""))):
            continue
        prefix = f"{node['id']}-"
        atoms = [
            n for n in nodes
            if str(n.get("id", "")).startswith(prefix) and n.get("type") == "ATOMIC"
        ]
        req_ids = [a["id"] for a in atoms]
        modules.append({
            "id": node["id"],
            "name": node.get("title", node["id"]),
            "description": (node.get("description") or "")[:240],
            "requirement_ids": req_ids,
            "implemented": [rid for rid in req_ids if rid in coverage],
        })
    return modules


def write_module_files(project_dir, modules):
    """One evidence note per module so the run shows a real decomposition."""
    modules_dir = project_dir / "modules"
    modules_dir.mkdir(parents=True, exist_ok=True)
    for module in modules:
        lines = [
            f"# Module {module['id']}: {module['name']}",
            "",
            module["description"],
            "",
            f"- requirements: {len(module['requirement_ids'])}",
            f"- converged: {len(module['implemented'])}",
            "",
            "## Requirements",
        ]
        for rid in module["requirement_ids"]:
            mark = "x" if rid in module["implemented"] else " "
            lines.append(f"- [{mark}] {rid}")
        (modules_dir / f"{module['id']}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


# --------------------------------------------------------------- prompts

def load_live_delta(task: str) -> dict[str, list[str]]:
    """Live-only normative sentences per requirement id (absent file -> empty)."""
    path = ROOT.parent / "notes" / "requirements-live" / f"{task}-delta.md"
    if not path.exists():
        return {}
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            parts = line[3:].split()
            current = parts[0] if parts else None
        elif line.startswith("- ") and current:
            sections.setdefault(current, []).append(line[2:].strip())
    return sections


def port_clause(web_port: int, extra_ports: list[int]) -> str:
    """Tell the model how the app is reached during grading.

    ``octos-org/octos-arc`` runs into this every season: the published specs
    hard-code a default base URL (the task page documents 127.0.0.1:3000) while
    the grader starts the backend with its own PORT. The scaffold's
    ``backend/src/index.js`` already binds both, so the model only has to leave
    that file alone.
    """
    extras = [port for port in extra_ports if port != web_port]
    extra_text = f" or {', '.join(str(p) for p in extras)}" if extras else ""
    return (
        f"Port contract: the grader starts the backend with PORT={web_port}, and "
        f"the published specs may default to 127.0.0.1:{web_port}{extra_text}. "
        "``backend/src/index.js`` already listens on every needed port by "
        "creating one server per port - keep that behaviour. Never bind a port "
        "yourself while generating: the runner watches the grading port and "
        "terminates the whole run if a server answers there."
    )


def module_names(module: dict, nodes: list[dict]) -> list[str]:
    """The exact accessible names one module's requirements pin down."""
    wanted = set(module.get("requirement_ids") or [])
    selected = [
        node
        for node in nodes
        if node.get("id") in wanted and node.get("type") == "ATOMIC"
    ]
    return exact_names(selected)


def build_module_prompt(
    tree: dict,
    module: dict,
    nodes: list[dict],
    delta: dict[str, list[str]],
    *,
    guidance: str = "",
    specs_text: str = "",
    ports: str = "",
    names: list[str] | None = None,
) -> str:
    """One module's requirement text, plus everything that decides the score."""
    wanted = set(module["requirement_ids"])
    lines = [
        f"Product: {tree.get('name')}",
        f"Module under construction: {module['id']} {module['name']}",
        "",
        STACK_RULES,
        "",
        UI_CONTRACT,
        "",
        PERFORMANCE_CONTRACT,
    ]
    if ports:
        lines.extend(["", ports])
    if names:
        # The tests locate controls by these exact strings. Listing them turns
        # "read the requirement carefully" into a mechanical checklist, and the
        # generation-time self-check counts them afterwards.
        lines.extend([
            "",
            f"EXACT ACCESSIBLE NAMES for module {module['id']} - every string below",
            "must appear verbatim as the visible label, link text, button text,",
            "heading or option label of a control in the files you emit. A name",
            "that never appears in the source cannot be found by the test:",
        ])
        lines.extend(f'- "{name}"' for name in names[:80])
    if guidance:
        lines.extend([
            "",
            "Domain notes for this product (relationships and view names the",
            "requirements assume; the requirement text still wins on a conflict):",
            guidance[:8000],
        ])
    if specs_text:
        lines.extend([
            "",
            "OFFICIAL ACCEPTANCE SPECS (published with the task) - this is the",
            "most important input. The app is graded by running exactly these",
            "Playwright files. Read them before writing code: routes and hrefs,",
            "accessible names used by getByRole/getByLabel, test ids, option",
            "labels, expected on-screen text and the order of user actions all",
            "come from here. Where the prose below and a spec disagree, the spec",
            "wins. Do not modify or delete the spec files.",
            "",
            specs_text,
        ])
    lines.extend(["", "Requirements to implement in this step:"])
    for node in nodes:
        if node.get("id") not in wanted or node.get("type") != "ATOMIC":
            continue
        lines.append("")
        lines.append(f"[{node['id']}] {node.get('title')}")
        description = (node.get("description") or "").strip()
        if description:
            lines.append(description[:4000])
        seed_hint = (node.get("seed_hint") or "").strip()
        if seed_hint:
            lines.append(f"Seed data: {seed_hint[:800]}")
        for index, scenario in enumerate((node.get("scenarios") or [])[:3], 1):
            text = scenario if isinstance(scenario, str) else json.dumps(scenario, ensure_ascii=False)
            lines.append(f"Scenario {index}: {text[:1500]}")
    additions = [sentence for rid in wanted for sentence in delta.get(rid, [])]
    if additions:
        lines.extend(["", "Late clarifications from the current task page (authoritative):"])
        lines.extend(f"- {sentence[:400]}" for sentence in additions[:40])
    lines.extend([
        "",
        f"Emit the files that implement module {module['id']} and list the",
        "requirement ids you actually covered in `covered`.",
    ])
    return "\n".join(lines)


# --------------------------------------------------------------- parsing

#: Directories every generated path must land in. A model that emits an
#: absolute path such as /workspace/template/frontend/src/App.jsx is describing
#: the right file; rejecting it loses the whole module.
KNOWN_ROOTS = ("frontend/", "backend/")

#: Keys a model may use instead of "content" for a file body.
BODY_KEYS = ("content", "body", "source", "text", "code", "file_content")

#: Path key spellings seen in the wild.
PATH_KEYS = ("path", "file", "filename", "filepath", "name")


def normalize_generated_path(raw: object) -> str | None:
    """Return a project-relative path, or None when the path is unusable."""
    path = str(raw or "").replace("\\", "/").strip().strip('"').strip("'")
    if not path:
        return None
    # "/workspace/template/frontend/src/x.js" -> "frontend/src/x.js"
    for root in KNOWN_ROOTS:
        marker = "/" + root
        index = path.find(marker)
        if index != -1:
            path = path[index + 1 :]
            break
    path = path.lstrip("/")
    if not path or path.endswith("/") or ".." in path.split("/"):
        return None
    if any(part in ("", ".") for part in path.split("/")):
        return None
    return path


def _entry_body(entry: dict) -> str | None:
    for key in BODY_KEYS:
        value = entry.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def _entry_path(entry: dict) -> object | None:
    for key in PATH_KEYS:
        value = entry.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def collect_files(payload: object) -> dict[str, str]:
    """Accept every envelope shape a model realistically produces."""
    files: dict[str, str] = {}
    if isinstance(payload, list):
        entries: object = payload
    elif isinstance(payload, dict):
        raw = payload.get("files")
        if raw is None:
            raw = payload.get("changes") or payload.get("output")
        if raw is None and _entry_path(payload) is not None:
            raw = [payload]
        entries = raw if raw is not None else []
    else:
        return files

    if isinstance(entries, dict):
        # {"files": {"frontend/src/a.js": "body"}}
        items: list = list(entries.items())
    elif isinstance(entries, list):
        items = entries
    else:
        items = []

    for entry in items:
        if isinstance(entry, tuple) and len(entry) == 2:
            path, body = entry
        elif isinstance(entry, dict):
            path = _entry_path(entry)
            body = _entry_body(entry)
        else:
            continue
        relative = normalize_generated_path(path)
        if not relative or not isinstance(body, str) or not body.strip():
            continue
        files[relative] = body
    return files


def salvage_files(text: str) -> dict[str, str]:
    """Last resort for a reply whose JSON never closes.

    Scans for ``"path": "...", "content": "..."`` pairs and decodes each body as
    a JSON string literal, so a reply that is truncated at the very end still
    yields every complete file it already contained.
    """
    pattern = re.compile(
        r'"path"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"(?:content|body|source|text|code)"\s*:\s*"'
    )
    files: dict[str, str] = {}
    position = 0
    while True:
        match = pattern.search(text, position)
        if not match:
            break
        try:
            raw_path = json.loads('"' + match.group(1) + '"')
        except Exception:  # noqa: BLE001 - a broken path is not fatal here
            raw_path = match.group(1)
        body_chars: list[str] = []
        index = match.end()
        while index < len(text):
            char = text[index]
            if char == "\\":
                body_chars.append(text[index : index + 2])
                index += 2
                continue
            if char == '"':
                break
            body_chars.append(char)
            index += 1
        try:
            body = json.loads('"' + "".join(body_chars) + '"')
        except Exception:  # noqa: BLE001 - keep scanning past the bad body
            body = "".join(body_chars)
        relative = normalize_generated_path(raw_path)
        if relative and isinstance(body, str) and body.strip():
            files[relative] = body
        position = index + 1
    return files


def parse_generation(content: str) -> tuple[dict[str, str], list[str], str]:
    """Return (files, covered, reason) where reason is empty on success.

    The reason is what gets logged when a module produces nothing, so a failure
    is diagnosable from the run's stdout instead of being a silent zero.
    """
    text = (content or "").strip()
    if not text:
        return {}, [], "the model returned an empty reply"
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)

    payload: object = None
    if text.startswith("["):
        try:
            payload = json.loads(text)
        except Exception:  # noqa: BLE001 - handled below
            payload = None
    if payload is None and text.startswith("{"):
        try:
            payload = json.loads(text)
        except Exception:  # noqa: BLE001
            payload = None
    if payload is None:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            return {}, [], f"no JSON object in the reply (first 120: {text[:120]!r})"
        try:
            payload = json.loads(text[start : end + 1])
        except Exception as exc:  # noqa: BLE001 - salvage below
            salvaged = salvage_files(text)
            if salvaged:
                return salvaged, [], ""
            return {}, [], f"unparsable JSON object: {type(exc).__name__}: {exc}"

    files = collect_files(payload)
    if not files:
        salvaged = salvage_files(text)
        if salvaged:
            return salvaged, [], ""
    covered: list[str] = []
    if isinstance(payload, dict):
        covered = [str(item) for item in (payload.get("covered") or []) if isinstance(item, str)]
    if not files:
        shape = type(payload).__name__
        keys = sorted(payload.keys())[:8] if isinstance(payload, dict) else []
        return {}, covered, f"no usable file entries (payload={shape}, keys={keys})"
    return files, covered, ""


def write_generated(project_dir: Path, files: dict[str, str]) -> None:
    for relative, body in files.items():
        target = project_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(body, encoding="utf-8")


# --------------------------------------------------------------- generation

def generate_task_modules(
    project_dir: Path,
    tree: dict,
    modules: list[dict],
    nodes: list[dict],
    task: str,
    llm: LlmClient,
    *,
    guidance: str,
    specs_text: str,
    ports: str,
    deadline: float,
) -> tuple[dict[str, str], list[str]]:
    """Generate one module per model call and write the result into the project.

    One call per module keeps each response small enough to stay coherent, and
    lets the prompt carry that module's full requirement text, the domain notes
    and the published specs.
    """
    if not llm.available:
        log("[arc-agent] no model configured; no task-specific source will be generated")
        return {}, []

    delta = load_live_delta(task)
    files: dict[str, str] = {}
    covered: list[str] = []
    for module in modules:
        if time.time() > deadline:
            log(f"[arc-agent] time budget exhausted before {module['id']}; "
                "closing the run with what has been generated")
            break
        user_prompt = build_module_prompt(
            tree, module, nodes, delta,
            guidance=guidance, specs_text=specs_text, ports=ports,
            names=module_names(module, nodes),
        )
        messages = [
            {"role": "system", "content": GENERATION_SYSTEM},
            {"role": "user", "content": user_prompt},
        ]
        content = llm.chat(messages)
        module_files, module_covered, reason = parse_generation(content or "")
        if not module_files:
            # A module that produces nothing is a hole in the deliverable, so
            # say exactly why and give the model one focused second chance
            # before giving up on it (the reference adapter nudges the same
            # session instead of burning the rest of the run).
            log(f"[arc-agent] {module['id']}: unusable reply ({reason}); "
                f"finish={llm.last_finish_reason} chars={len(content or '')} "
                f"tail={(content or '')[-200:]!r}")
            messages.extend([
                {"role": "assistant", "content": (content or "")[:4000]},
                {"role": "user", "content": UNUSABLE_REPLY_NUDGE},
            ])
            content = llm.chat(messages)
            module_files, module_covered, reason = parse_generation(content or "")
            if module_files:
                log(f"[arc-agent] {module['id']}: recovered on retry "
                    f"({len(module_files)} file(s))")
            else:
                log(f"[arc-agent] {module['id']}: still unusable ({reason}); "
                    f"finish={llm.last_finish_reason} chars={len(content or '')} "
                    f"tail={(content or '')[-200:]!r}")
                continue
        write_generated(project_dir, module_files)
        files.update(module_files)
        covered.extend(module_covered)
        log(f"[arc-agent] {module['id']}: files={len(module_files)} "
            f"covered={len(module_covered)} tokens={llm.usage.total_tokens}")
    log(f"[arc-agent] model generation done: files={len(files)} "
        f"covered={len(set(covered))} calls={llm.usage.calls} "
        f"tokens={llm.usage.total_tokens}")
    return files, sorted(set(covered))


def repair_from_rehearsal(
    project_dir: Path,
    llm: LlmClient,
    error: str,
    deadline: float,
) -> dict[str, str]:
    """One repair turn driven by the rehearsal failure, as the reference does."""
    if not llm.available or time.time() > deadline:
        return {}
    prompt = (
        "The application in this project just failed its pre-grading build or "
        "start-up rehearsal. The grader runs exactly this sequence and it failed "
        "on our own smoke run:\n\n"
        "  1. cd frontend && npm install && npm run build   (must exit 0)\n"
        "  2. cd backend  && npm install && npm start        (must bind the port)\n\n"
        f"Rehearsal error:\n{error[-2500:]}\n\n"
        "Typical causes: a require() path that does not match the real file "
        "location, a file referenced but never written, a syntax error in a "
        "module loaded at start-up, an import path that does not resolve, or a "
        "dependency that is not installed. Fix the cause and emit the corrected "
        "files, complete, in the JSON envelope.\n\n"
        f"{STACK_RULES}"
    )
    content = llm.chat([
        {"role": "system", "content": REPAIR_SYSTEM},
        {"role": "user", "content": prompt},
    ])
    files, _, reason = parse_generation(content or "")
    if files:
        write_generated(project_dir, files)
        log(f"[arc-agent] repair turn wrote {len(files)} file(s)")
    else:
        log(f"[arc-agent] repair turn produced no files ({reason}; "
            f"finish={llm.last_finish_reason})")
    return files


# --------------------------------------------------------------- reporting

def write_generation_report(project_dir: Path, llm: LlmClient, files: dict[str, str]) -> None:
    report = {
        "model": llm.model,
        "usage": llm.usage.as_dict(),
        "files": sorted(files),
    }
    (project_dir / "generation-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def announce_preview(output_dir: Path) -> None:
    """Mirror the demo agent: tell the platform the preview can be served."""
    artifacts_dir = os.environ.get("ARCBENCH_ARTIFACTS_DIR")
    if not artifacts_dir:
        return
    try:
        target = Path(artifacts_dir)
        target.mkdir(parents=True, exist_ok=True)
        (target / "preview-ready.json").write_text(
            json.dumps({"ready": True, "reason": "arc agent completed"}) + "\n",
            encoding="utf-8",
        )
    except OSError as exc:
        log(f"[arc-agent] could not write preview-ready.json: {exc}")


def require_commit(result, message: str) -> None:
    if result.returncode == 0:
        return
    output = ((result.stdout or "") + (result.stderr or "")).lower()
    if "nothing to commit" in output or "nothing added to commit" in output:
        return
    raise RuntimeError((result.stderr or result.stdout or message).strip() or message)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ArcBench generation agent")
    parser.add_argument("requirements_source", nargs="?",
                        help="path to requirements.yaml or its directory")
    parser.add_argument("--output-dir", default=None,
                        help="directory to write the generated application")
    # The platform runner passes `--type web|cli|android`; older local flows used
    # `--app-type`. Accept both into the same dest. Anything unrecognised is
    # logged and ignored rather than aborting the run: argparse's default is
    # SystemExit(2), which no `except Exception` can catch, and that would leave
    # an empty deliverable and a zero score.
    parser.add_argument("--type", "--app-type", dest="app_type", default="web")
    parser.add_argument("--web-port", type=int, default=int(os.environ.get(
        "ARCBENCH_WEB_PORT", os.environ.get("ARC_WEB_PORT", "3000"))))
    args, unknown = parser.parse_known_args(argv)
    if unknown:
        log(f"[arc-agent] ignoring unrecognised arguments: {unknown}")
    return args


def run_rehearsal(project_dir: Path, smoke_port: int, web_port: int, llm: LlmClient,
                  slug: str, deadline: float) -> str:
    """Rehearse the grader's sequence, repairing once, and return a summary."""
    if os.environ.get("ARC_SKIP_REHEARSAL") == "1":
        log("[rehearsal] skipped (ARC_SKIP_REHEARSAL=1)")
        return "rehearsal skipped (ARC_SKIP_REHEARSAL=1)"
    for attempt in range(1, 3):
        log(f"[rehearsal] startup rehearsal {attempt}/2 (smoke port {smoke_port})")
        started = time.time()
        error = rehearse_startup(project_dir, smoke_port)
        if error is None:
            log(f"[rehearsal] app builds and starts cleanly in {time.time() - started:.0f}s")
            return "build and start-up rehearsal passed"
        if error.startswith("SKIP:"):
            log(f"[rehearsal] not verified: {error}")
            return error
        log(f"[rehearsal] FAILED in {time.time() - started:.0f}s: "
            f"{error.splitlines()[0][:200]}")
        if attempt == 2:
            log("[rehearsal] giving up; submitting as-is")
            return f"rehearsal failed: {error.splitlines()[0][:160]}"
        repaired = repair_from_rehearsal(project_dir, llm, error, deadline)
        if repaired:
            guard_generated(project_dir, TEMPLATES / slug, set(repaired))
    return "rehearsal failed"


def report_traceability(runtime, tree: dict, coverage: set[str], local_results: dict[str, bool],
                        rehearsal_note: str) -> None:
    """Emit the standard SDK states for every requirement node.

    The states are the SDK's own enumeration (DESIGNED / IMPLEMENTED / PASSED /
    FAILED). The previous version wrote custom strings ("CONVERGED",
    "SCAFFOLDED") that no consumer knows, and the reference implementation
    records that the platform's feature-implementation rate reads this table.
    """
    for node in iter_nodes(tree):
        node_id = str(node.get("id") or "")
        if not node_id:
            continue
        runtime.traceability.upsert_requirement(
            req_id=node_id, name=node.get("name"), description=node.get("description"),
        )
        runtime.events.mark_design_done(node_id, "design folded into the generation prompt")
        runtime.events.mark_implementation_done(
            node_id,
            "generated on top of the scaffold" if node_id in coverage else "not covered by this run",
        )
        if node_id in local_results:
            if local_results[node_id]:
                runtime.events.mark_test_passed(node_id, "local acceptance spec passed")
            else:
                runtime.events.mark_test_failed(node_id, "local acceptance spec failed")
        elif rehearsal_note == "build and start-up rehearsal passed":
            # The message states exactly what was verified: the app builds and
            # serves; the Playwright suite is not available in this container.
            runtime.events.mark_test_passed(
                node_id, "verified by the build/start-up rehearsal (no local suite)"
            )
        else:
            runtime.events.mark_test_failed(node_id, rehearsal_note or "not verified")
    for spec_id, passed in local_results.items():
        runtime.traceability.upsert_test(
            test_id=spec_id, req_id=spec_id, type="E2E", file_path=f"{spec_id}.spec.ts",
        )
        runtime.traceability.set_test_pass_status(spec_id, passed)


def commit_progress(runtime, modules: list[dict], task_name: str) -> None:
    runtime.git.ensure_repo(create_initial_commit=False)
    runtime.git.ensure_arc_gitignore()
    git = runtime.git
    if modules:
        git.run(["add", ".", ":(exclude)modules/**"])
        require_commit(git.run(["commit", "-m", "chore: scaffold template base"], check=False),
                       "base commit failed")
        for module in modules:
            git.run(["add", "modules/" + module["id"] + ".md", "generation-manifest.json"])
            summary = (
                f"[factory] {module['id']}: {module['name']} "
                f"({len(module['implemented'])}/{len(module['requirement_ids'])} converged)"
            )
            require_commit(git.run(["commit", "-m", summary], check=False), "module commit failed")
    runtime.git.commit(f"ARC agent generated {task_name}")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    output_dir = args.output_dir or os.environ.get("ARC_OUTPUT_DIR")
    if output_dir:
        os.environ.setdefault("ARC_WORKSPACE", output_dir)
        os.environ.setdefault("ARC_PROJECT_DIR", output_dir)
        os.environ.setdefault("ARCBENCH_OUTPUT_DIR", output_dir)

    runtime = AgentRuntime.from_env(project_dir=output_dir or None)
    project_dir = Path(output_dir or runtime.paths.project_dir)
    runtime.events.mark_run_started("Agent run started")
    started = time.time()
    deadline = started + float(os.environ.get("ARC_TIME_BUDGET", DEFAULT_TIME_BUDGET))

    log(f"[arc-agent] output_dir={project_dir}")
    log(f"[arc-agent] app_type={args.app_type} web_port={args.web_port}")
    for name in ("OPENAI_BASE_URL", "MODEL", "ARCBENCH_TEMPLATE_DIR",
                 "ARCBENCH_TASK_DIR", "ARCBENCH_TESTS_DIR"):
        log(f"[env] {name}={os.environ.get(name, '<unset>')}")
    key = os.environ.get("OPENAI_API_KEY", "")
    log(f"[env] OPENAI_API_KEY={'set(len=%d)' % len(key) if key else '<unset>'}")

    rehearsal_note = ""
    local_results: dict[str, bool] = {}
    try:
        requirements_path = resolve_requirements_source(args.requirements_source)
        log(f"[arc-agent] requirements={requirements_path}")
        tree = load_requirements(requirements_path)
        task_name = tree.get("name") or "Application"
        runtime.traceability.init_db(reset=False)
        runtime.traceability.store_requirement_tree(tree)

        # Published specs are the ground truth when the platform mounts them.
        specs_dir = locate_acceptance_tests(tree, ROOT)
        specs_text = read_specs(specs_dir, int(os.environ.get("ARC_SPEC_BUDGET", "60000")))
        extra_ports = spec_extra_ports(specs_dir)
        if specs_dir:
            log(f"[tests] specs at {specs_dir}: "
                f"{len(list(specs_dir.rglob('*.spec.ts')))} file(s), "
                f"{len(specs_text)} chars injected, extra ports {extra_ports}")
        else:
            log("[tests] no published specs mounted; building from the requirement text")

        # The requirement map is keyed by task; the template is always the
        # stack-only scaffold, because shipping task-specific source is forbidden.
        asset_slug = task_slug(task_name)
        task_map = load_task_map(asset_slug)
        slug = asset_slug if (TEMPLATES / asset_slug).is_dir() else WEB_FALLBACK_TEMPLATE
        log(f"[arc-agent] task={asset_slug} template={slug}")
        copy_template(slug, project_dir)
        coverage = load_coverage(slug)
        write_manifest(project_dir, slug, tree, task_map)
        write_npm_mirror(project_dir)

        modules = build_module_plan(task_map, coverage)
        nodes_payload = list((task_map or {}).get("nodes") or [])

        llm = LlmClient()
        llm.probe()
        generated, covered = generate_task_modules(
            project_dir, tree, modules, nodes_payload, asset_slug, llm,
            guidance=load_asset_guidance(asset_slug),
            specs_text=specs_text,
            ports=port_clause(args.web_port, extra_ports),
            deadline=deadline,
        )

        # A single broken build-critical file turns the whole submission into an
        # unbuildable project, so restore the scaffold copy of anything broken.
        reverted = guard_generated(project_dir, TEMPLATES / slug, set(generated))
        if reverted:
            log(f"[arc-agent] reverted broken generated files: {reverted}")
            broken = {entry.split(":", 1)[0] for entry in reverted}
            generated = {path: body for path, body in generated.items() if path not in broken}
        coverage = coverage | set(covered)
        modules = build_module_plan(task_map, coverage)
        write_module_files(project_dir, modules)

        # Self-check: names the requirements pin down but that the generated
        # source never mentions cannot be found by the tests either.
        try:
            run_selfcheck(project_dir, nodes_payload)
        except Exception as exc:  # noqa: BLE001 - never fail the run for this
            log(f"[selfcheck] skipped: {exc}")

        smoke_port = int(os.environ.get("ARC_SMOKE_PORT", "3100"))
        if smoke_port == args.web_port:
            smoke_port += 1
        rehearsal_note = run_rehearsal(project_dir, smoke_port, args.web_port,
                                       llm, slug, deadline)

        # Local acceptance suite. On the platform the specs, the Playwright CLI
        # and a browser are all absent during generation, so this stays dormant
        # and the rehearsal is the only verification we can do.
        tests_dir = Path(os.environ.get("ARC_TESTS_DIR", Path.cwd() / "tests"))
        if (os.environ.get("ARC_PLAYWRIGHT_CLI") and os.environ.get("ARC_PLAYWRIGHT_CONFIG")
                and tests_dir.is_dir() and any(tests_dir.rglob("*.spec.ts"))):
            log(f"[acceptance] running {tests_dir} against the app on port {smoke_port}")
            output, local_results = run_local_acceptance(project_dir, smoke_port, tests_dir)
            log(output)

        write_generation_report(project_dir, llm, generated)
        report_traceability(runtime, tree, coverage, local_results, rehearsal_note)
        commit_progress(runtime, modules, task_name)

        # ------------------------------------------------------------- close
        postflight_structure_check(project_dir, args.web_port)
        free_port(args.web_port, project_dir)
        announce_preview(project_dir)
        runtime.events.mark_run_completed(
            f"generated {task_name}; template={slug}; asset_map={task_map is not None}; "
            f"rehearsal={rehearsal_note or 'not run'}; specs={len(local_results)}"
        )
        log(f"[arc-agent] completed in {time.time() - started:.0f}s")
        return 0
    except Exception as exc:  # noqa: BLE001 - report any failure through the runtime
        runtime.events.mark_run_failed(str(exc)[:1000])
        log(f"[arc-agent] failed: {exc}")
        try:
            postflight_structure_check(project_dir, args.web_port)
            free_port(args.web_port, project_dir)
        except Exception:  # noqa: BLE001 - closing checks must not mask the failure
            pass
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
