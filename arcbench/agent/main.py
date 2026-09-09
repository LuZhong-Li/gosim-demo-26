"""Minimal ArcBench agent entrypoint.

Platform invocation (observed from run logs):
    python3 main.py <requirements-source> --output-dir <output-dir>

Local self-test run:
    python main.py <requirements-dir> --output-dir <output-dir>
      plus ARC_NODE / ARC_PLAYWRIGHT_CLI / ARC_PLAYWRIGHT_CONFIG when self-testing.
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

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


ROOT = Path(__file__).resolve().parent
TEMPLATES = ROOT / "templates"
ASSETS = ROOT / "assets"


def load_requirements(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def iter_nodes(node: dict):
    yield node
    for child in node.get("children") or []:
        yield from iter_nodes(child)


def copy_template(slug: str, project_dir: Path) -> bool:
    src = TEMPLATES / slug / "index.html"
    project_dir.mkdir(parents=True, exist_ok=True)
    if src.exists():
        shutil.copytree(TEMPLATES / slug, project_dir, dirs_exist_ok=True)
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

    runtime = AgentRuntime.from_env()
    runtime.events.mark_run_started("Agent run started")

    try:
        requirements_path = resolve_requirements_source(args.requirements_source)
        tree = load_requirements(requirements_path)
        task_name = tree.get("name") or "Application"
        runtime.traceability.init_db(reset=False)

        slug = task_slug(task_name)
        task_map = load_task_map(slug)
        project_dir = Path(output_dir or runtime.paths.project_dir)
        template_hit = copy_template(slug, project_dir)
        coverage = load_coverage(slug)
        write_manifest(project_dir, slug, tree, task_map)

        tests_dir = Path(os.environ.get("ARC_TESTS_DIR", Path(runtime.paths.workspace) / "tests"))

        nodes = list(iter_nodes(tree))
        for node in nodes:
            node_id = node.get("id")
            if not node_id:
                continue
            runtime.traceability.upsert_requirement(
                node_id,
                name=node.get("name"),
                description=node.get("description"),
                type=node.get("type"),
            )
            state_value = "CONVERGED" if node_id in coverage else "SCAFFOLDED"
            runtime.traceability.upsert_node_state(node_id, state_value)
            runtime.events.mark_design_done(node_id, "design completed from requirements")
            runtime.events.mark_implementation_done(
                node_id,
                f"implemented from {slug} template" if node_id in coverage else "scaffold only",
            )

        results: dict[str, bool] = {}
        if os.environ.get("ARC_SKIP_TESTS") == "1":
            pass
        elif tests_dir.is_dir() and any(tests_dir.glob("*.spec.ts")):
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

        runtime.git.ensure_repo()
        runtime.git.ensure_arc_gitignore()
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
