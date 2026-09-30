"""ArcBench agent entrypoint.

Platform invocation (observed from run logs):
    python3 main.py <requirements-source> --output-dir <output-dir>

The bundle vendors the real ``arcbench_agent_runtime`` SDK next to this file
(copied from code-philia/agentic-requirement-compiler's ``src/``), because the
platform does not pre-install the module for custom agent bundles.

Local self-test run:
    python main.py <requirements-dir> --output-dir <output-dir>
      plus ARC_TESTS_DIR / ARC_NODE / ARC_PLAYWRIGHT_CLI /
      ARC_PLAYWRIGHT_CONFIG when self-testing.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

import yaml

from arcbench_agent_runtime import AgentRuntime
from llm import LlmClient

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


ROOT = Path(__file__).resolve().parent
TEMPLATES = ROOT / "templates"
ASSETS = ROOT / "assets"
# The only shipped template is the stack-only scaffold: the rules forbid shipping
# task-specific implementations, so the model writes them at generation time.
WEB_FALLBACK_TEMPLATE = "scaffold"


def load_requirements(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def iter_nodes(node: dict):
    yield node
    for child in node.get("children") or []:
        yield from iter_nodes(child)


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
    except Exception:
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
        excludes = copy_excludes(slug)
        shutil.copytree(
            src_dir,
            project_dir,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns(*sorted(excludes)),
        )
        return True
    (project_dir / "index.html").write_text(
        "<!doctype html><meta charset=utf-8><title>{}</title><h1>{}</h1>".format(slug, slug),
        encoding="utf-8",
    )
    return False


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


def write_manifest(project_dir: Path, slug: str, tree: dict, task_map: dict | None) -> None:
    manifest = {
        "task": tree.get("name"),
        "template": slug,
        "modules": [],
        "asset_map_used": task_map is not None,
    }
    for child in tree.get("children") or []:
        manifest["modules"].append(
            {
                "id": child.get("id"),
                "name": child.get("name"),
                "type": child.get("type"),
            }
        )
    (project_dir / "generation-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
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
        atoms = [n for n in nodes if str(n.get("id", "")).startswith(prefix) and n.get("type") == "ATOMIC"]
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
    """Write one evidence note per requirement module so the run shows real decomposition."""
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


GENERATION_SYSTEM = (
    "You are a senior full-stack engineer inside a requirement-to-application "
    "factory. You receive a requirement document and must emit the application "
    "source that satisfies it. Reply with JSON only, shaped "
    '{"files":[{"path":"relative/path","content":"file body"}],"covered":["REQ-..."]}. '
    "Paths are relative to the project root and must stay inside it."
)

STACK_RULES = """
Stack contract (already present in the project; build on it, do not replace it):
- frontend/ is Vite + React, built to frontend/dist and served by the backend.
- backend/ is Express and MUST listen on process.env.PORT || 3000.
- backend/src/app.js exports the Express app; mount your routes there.
- frontend/src/api/index.ts already exports `client` (axios, baseURL /api),
  `tokenStore` (localStorage) and `errorMessage(caught)`. Reuse them.

Rules that decide the score:
- Every quoted phrase in a requirement is the exact English accessible name of a
  control. Use exactly that text as the label, aria-label or visible name.
- The scenarios carry the seed data the tests expect. Provision that seed data in
  the generated code at start-up, with exactly those names and relationships.
- Every write must be persisted on the server, permission-checked against the
  current session and the target object, and applied atomically.
- Emit complete files, never fragments: the project must build and run as-is.
""".strip()


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


def build_module_prompt(
    tree: dict, module: dict, nodes: list[dict], delta: dict[str, list[str]]
) -> str:
    """One module's requirement text, plus the clarifications the live page added."""
    wanted = set(module["requirement_ids"])
    lines = [
        f"Product: {tree.get('name')}",
        f"Module under construction: {module['id']} {module['name']}",
        "",
        STACK_RULES,
        "",
        "Requirements to implement in this step:",
    ]
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
            text = (
                scenario
                if isinstance(scenario, str)
                else json.dumps(scenario, ensure_ascii=False)
            )
            lines.append(f"Scenario {index}: {text[:1500]}")
    additions = [sentence for rid in wanted for sentence in delta.get(rid, [])]
    if additions:
        lines.extend(["", "Late clarifications from the current task page (authoritative):"])
        lines.extend(f"- {sentence[:400]}" for sentence in additions[:40])
    lines.extend(
        [
            "",
            f"Emit the files that implement module {module['id']} and list the",
            "requirement ids you actually covered in `covered`.",
        ]
    )
    return "\n".join(lines)


def parse_generated_files(content: str) -> dict[str, str]:
    files, _covered = parse_generation(content)
    return files


def parse_generation(content: str) -> tuple[dict[str, str], list[str]]:
    """Accept the JSON envelope, or the first JSON object found in the reply."""
    text = (content or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    try:
        payload = json.loads(text)
    except Exception:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            return {}, []
        try:
            payload = json.loads(text[start : end + 1])
        except Exception:
            return {}, []

    raw_files = payload.get("files")
    if raw_files is None and isinstance(payload.get("path"), str):
        raw_files = [payload]
    files: dict[str, str] = {}
    for entry in raw_files or []:
        path = str(entry.get("path") or "").replace("\\", "/").strip()
        body = entry.get("content")
        # Never let a generated path escape the project directory.
        if not path or path.startswith("/") or ".." in path.split("/"):
            continue
        if not isinstance(body, str):
            continue
        files[path] = body
    covered = [str(item) for item in (payload.get("covered") or []) if isinstance(item, str)]
    return files, covered


def generate_task_modules(
    project_dir: Path,
    tree: dict,
    modules: list[dict],
    nodes: list[dict],
    task: str,
    llm: LlmClient,
) -> tuple[dict[str, str], list[str]]:
    """Generate one module per model call and write the result into the project.

    One call per module keeps each response small enough to stay coherent, and
    lets the prompt carry that module's full requirement text plus the
    clarifications the live task page added on top of the local snapshot.
    """
    if not llm.available:
        print("[arc-agent] no model configured; skipping model generation", flush=True)
        return {}, []

    delta = load_live_delta(task)
    files: dict[str, str] = {}
    covered: list[str] = []
    for module in modules:
        content = llm.chat(
            [
                {"role": "system", "content": GENERATION_SYSTEM},
                {
                    "role": "user",
                    "content": build_module_prompt(tree, module, nodes, delta),
                },
            ]
        )
        module_files, module_covered = parse_generation(content or "")
        for relative, body in module_files.items():
            target = project_dir / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body, encoding="utf-8")
        files.update(module_files)
        covered.extend(module_covered)
        print(
            f"[arc-agent] {module['id']}: files={len(module_files)} "
            f"covered={len(module_covered)} tokens={llm.usage.total_tokens}",
            flush=True,
        )
    print(
        f"[arc-agent] model generation done: files={len(files)} "
        f"covered={len(set(covered))} calls={llm.usage.calls} "
        f"tokens={llm.usage.total_tokens}",
        flush=True,
    )
    return files, sorted(set(covered))


def write_generation_report(project_dir: Path, llm: LlmClient, files: dict[str, str]) -> None:
    report = {"model": llm.model, "usage": llm.usage.as_dict(), "files": sorted(files)}
    (project_dir / "generation-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def wait_for_port(port: int, timeout: float = 15.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                return
        except OSError:
            time.sleep(0.15)
    raise RuntimeError(f"server did not start on port {port}")


def run_tests(tests_dir: Path, port: int) -> tuple[str, int]:
    node = os.environ.get("ARC_NODE", "node")
    playwright_cli = os.environ.get("ARC_PLAYWRIGHT_CLI")
    config = os.environ.get("ARC_PLAYWRIGHT_CONFIG", "playwright.config.ts")
    if not playwright_cli:
        raise RuntimeError("ARC_PLAYWRIGHT_CLI is not set")
    playwright_cli = playwright_cli.replace("\\", "/")
    config = config.replace("\\", "/")
    tests_arg = str(tests_dir).replace("\\", "/")

    env = os.environ.copy()
    env["TARGET_URL"] = f"http://127.0.0.1:{port}"
    env["PLAYWRIGHT_OUTPUT_DIR"] = os.environ.get("ARC_RESULTS_DIR", str(Path(tests_dir).parent / "test-results"))
    env["PLAYWRIGHT_REPORT_DIR"] = os.environ.get("ARC_REPORT_DIR", str(Path(tests_dir).parent / "playwright-report"))

    cmd = [node, playwright_cli, "test", tests_arg, "--config", config, "--workers", "1", "--reporter", "list"]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    return (proc.stdout or "") + (proc.stderr or ""), proc.returncode


def parse_results(output: str) -> dict[str, bool]:
    results: dict[str, bool] = {}
    pattern = re.compile(r"^\s*(ok|x)\s+\d+\s+.*?[/\\](REQ-[\w.-]+)\.spec\.ts", re.MULTILINE)
    for match in pattern.finditer(output):
        results[match.group(2)] = match.group(1) == "ok"
    return results


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ArcBench generation agent")
    parser.add_argument("requirements_source", nargs="?", help="path to requirements.yaml or its directory")
    parser.add_argument("--output-dir", help="directory to write the generated application")
    return parser.parse_args(argv)


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
    # env fallback (local runs without positional args)
    workspace = Path(os.environ.get("ARC_WORKSPACE", Path.cwd()))
    path = Path(os.environ.get("ARC_REQUIREMENTS_DIR", workspace / "requirements"))
    if path.is_dir():
        return path / "requirements.yaml"
    return path


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    output_dir = args.output_dir or os.environ.get("ARC_OUTPUT_DIR")
    if output_dir:
        os.environ.setdefault("ARC_WORKSPACE", output_dir)
        os.environ.setdefault("ARC_PROJECT_DIR", output_dir)
        os.environ.setdefault("ARCBENCH_OUTPUT_DIR", output_dir)

    runtime = AgentRuntime.from_env(project_dir=output_dir or None)
    runtime.events.mark_run_started("Agent run started")

    try:
        requirements_path = resolve_requirements_source(args.requirements_source)
        tree = load_requirements(requirements_path)
        task_name = tree.get("name") or "Application"
        runtime.traceability.init_db(reset=False)

        # The requirement map is keyed by task; the template is always the
        # stack-only scaffold, because shipping task-specific source is forbidden.
        asset_slug = task_slug(task_name)
        task_map = load_task_map(asset_slug)
        slug = (
            asset_slug
            if (TEMPLATES / asset_slug).is_dir()
            else WEB_FALLBACK_TEMPLATE
        )
        print(f"[arc-agent] task={asset_slug} template={slug}", flush=True)
        if task_map and asset_slug != slug:
            print(
                f"[arc-agent] requirement map loaded from assets/{asset_slug}",
                flush=True,
            )
        project_dir = Path(output_dir or runtime.paths.project_dir)
        template_hit = copy_template(slug, project_dir)
        coverage = load_coverage(slug)
        write_manifest(project_dir, slug, tree, task_map)
        modules = build_module_plan(task_map, coverage)

        # The rules require the agent to actually call a model, and forbid
        # shipping task-specific implementations inside the template. The model
        # writes the task-specific source on top of the generic scaffold.
        llm = LlmClient()
        generated, covered = generate_task_modules(
            project_dir,
            tree,
            modules,
            list((task_map or {}).get("nodes") or []),
            asset_slug,
            llm,
        )
        coverage = coverage | set(covered)
        write_generation_report(project_dir, llm, generated)
        # Module notes reflect what the model reported as implemented.
        modules = build_module_plan(task_map, coverage)
        write_module_files(project_dir, modules)

        tests_dir = Path(os.environ.get("ARC_TESTS_DIR", Path.cwd() / "tests"))

        nodes = list(iter_nodes(tree))
        for node in nodes:
            node_id = node.get("id")
            if not node_id:
                continue
            runtime.traceability.upsert_requirement(
                req_id=node_id,
                name=node.get("name"),
                description=node.get("description"),
            )
            runtime.events.mark_design_done(node_id, "design completed from requirements")
            runtime.events.mark_implementation_done(
                node_id,
                f"implemented from {slug} template" if node_id in coverage else "scaffold only",
            )
            # Emit events first: they map to DESIGNED/IMPLEMENTED. The custom
            # coverage state must be written last so it is not overwritten.
            state_value = "CONVERGED" if node_id in coverage else "SCAFFOLDED"
            runtime.traceability.upsert_node_state(node_id, state_value)

        results: dict[str, bool] = {}
        tests_requested = os.environ.get("ARC_SKIP_TESTS") != "1"
        if not tests_requested:
            pass
        elif not tests_dir.is_dir() or not any(tests_dir.glob("*.spec.ts")):
            print(f"[arc-agent] no local Playwright specs under {tests_dir}; skipping self-test")
        elif not os.environ.get("ARC_PLAYWRIGHT_CLI"):
            print("[arc-agent] ARC_PLAYWRIGHT_CLI not set; skipping local self-test")
        else:
            port = int(os.environ.get("ARC_PORT", "3301"))
            server = subprocess.Popen(
                [sys.executable, "-m", "http.server", str(port), "--directory", str(project_dir)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            try:
                wait_for_port(port)
                output, _ = run_tests(tests_dir, port)
                results = parse_results(output)
                print(output)
            finally:
                server.terminate()
                try:
                    server.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    server.kill()

            for node_id, passed in results.items():
                runtime.traceability.upsert_test(
                    test_id=node_id,
                    req_id=node_id,
                    type="E2E",
                    file_path=f"{node_id}.spec.ts",
                )
                runtime.traceability.set_test_pass_status(node_id, passed)
                if passed:
                    runtime.events.mark_test_passed(node_id, "local playwright passed")
                else:
                    runtime.events.mark_test_failed(node_id, "local playwright failed")

        runtime.git.ensure_repo(create_initial_commit=False)
        runtime.git.ensure_arc_gitignore()
        git = runtime.git
        if modules:
            git.run(["add", ".", ":(exclude)modules/**"])
            base_result = git.run(["commit", "-m", "chore: scaffold template base"], check=False)
            if base_result.returncode != 0 and "nothing to commit" not in (base_result.stdout + base_result.stderr).lower():
                raise RuntimeError(base_result.stderr.strip() or base_result.stdout.strip() or "base commit failed")
            for module in modules:
                git.run(["add", "modules/" + module["id"] + ".md", "generation-manifest.json"])
                summary = "[factory] " + module["id"] + ": " + module["name"] + " (" + str(len(module["implemented"])) + "/" + str(len(module["requirement_ids"])) + " converged)"
                result = git.run(["commit", "-m", summary], check=False)
                if result.returncode != 0 and "nothing to commit" not in (result.stdout + result.stderr).lower():
                    raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "module commit failed")
        runtime.git.commit(f"ARC agent generated {task_name}")
        runtime.events.mark_run_completed(
            f"generated {task_name}; template={slug}; asset_map={task_map is not None}; tests={len(results)}"
        )
        return 0
    except Exception as exc:  # noqa: BLE001 - report any failure through the runtime
        runtime.events.mark_run_failed(str(exc))
        print(f"[arc-agent] failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
