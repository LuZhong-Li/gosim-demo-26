"""r87 experiment: can a data-level seed actually make the real generated app serve the contract world?

Read-only exploration against the real graded project
(downloads/agent-packages/a128c4309297-template.zip), which is the project whose
official report reads 0/100.

What this establishes, in order:
  1. what the app's store looks like on disk after generation (data.json shapes),
  2. what the contract world needs that is missing,
  3. whether the app can be booted here at all (it needs express, and this box has
     no npm), so that a candidate seed can be verified by an HTTP GET rather than
     assumed.

Run: python arcbench/runs/_scratch_r87_world_shape.py [work-dir]
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ZIP = ROOT / "downloads" / "agent-packages" / "a128c4309297-template.zip"
TEMPLATE = ROOT / "agent" / "templates" / "scaffold"

#: node_modules kept from earlier probes; this box has node but no npm.
NODE_MODULES_CANDIDATES = (
    Path(r"D:\gosim-demo-26\arcbench\runs\run5-smoke\backend\node_modules"),
    Path(r"D:\gosim-demo-26\arcbench\runs\gh-smoke\backend\node_modules"),
)

#: The names the official GitHub suite navigates to and asserts. Sourced from the
#: requirement text and from the failures in the two official reports.
CONTRACT_NAMES = (
    "acme-docs", "acme-demo", "Acme Demo", "frontend-team", "secret-research",
    "Improve onboarding", "Legacy welcome text", "src/search.ts", "bob-reviewer",
    "branch-switch-demo", "Document search flow",
)


def unpack(work: Path) -> Path:
    project = work / "template"
    if not (project / "backend" / "src" / "app.js").is_file():
        work.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(ZIP) as archive:
            members = [m for m in archive.namelist() if "/node_modules/" not in m]
            archive.extractall(work, members=members)
    return project


def describe_world(project: Path) -> dict:
    data_file = project / "backend" / "src" / "data.json"
    if not data_file.is_file():
        return {}
    data = json.loads(data_file.read_text(encoding="utf-8", errors="replace"))
    print("--- persisted store (data.json) ---")
    for key, value in data.items():
        if isinstance(value, dict):
            print(f"  {key:<16} dict  n={len(value):<4} keys={list(value)[:6]}")
        elif isinstance(value, list):
            print(f"  {key:<16} list  n={len(value):<4}")
        else:
            print(f"  {key:<16} {type(value).__name__}")
    return data


def contract_gap(project: Path) -> None:
    blob = ""
    for path in sorted((project / "backend" / "src").rglob("*.js")):
        blob += path.read_text(encoding="utf-8", errors="replace")
    seed_file = project / "backend" / "src" / "seed.js"
    seed_text = seed_file.read_text(encoding="utf-8", errors="replace") if seed_file.is_file() else ""
    data_file = project / "backend" / "src" / "data.json"
    data_text = data_file.read_text(encoding="utf-8", errors="replace") if data_file.is_file() else ""
    print("--- contract names: where do they exist? ---")
    print(f"  {'name':<22} {'in seed.js':<11} {'in data.json':<13} {'anywhere in backend'}")
    for name in CONTRACT_NAMES:
        print(f"  {name:<22} {str(name in seed_text):<11} "
              f"{str(name in data_text):<13} {name in blob}")


def try_boot(project: Path, port: int = 3171) -> str | None:
    """Start the backend with node and report whether it binds and answers."""
    backend = project / "backend"
    node_modules = next((c for c in NODE_MODULES_CANDIDATES if (c / "express").is_dir()), None)
    if node_modules is None:
        return "no reusable express install on this box"
    link = backend / "node_modules"
    if not link.exists():
        try:
            shutil.copytree(node_modules, link, dirs_exist_ok=True)
        except OSError as exc:
            return f"could not stage node_modules: {exc}"

    log_file = project.parent / "boot.log"
    handle = open(log_file, "w", encoding="utf-8")
    proc = subprocess.Popen(
        ["node", "src/index.js"], cwd=backend,
        env={**__import__("os").environ, "PORT": str(port)},
        stdout=handle, stderr=subprocess.STDOUT,
    )
    try:
        deadline = time.time() + 30
        while time.time() < deadline:
            if proc.poll() is not None:
                handle.flush()
                return f"exited rc={proc.returncode}:\n{log_file.read_text(encoding='utf-8', errors='replace')[-1200:]}"
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/meta", timeout=2) as response:
                    body = response.read(400).decode("utf-8", "replace")
                    return f"UP: GET /api/meta -> {response.status} {body[:200]}"
            except urllib.error.HTTPError as exc:
                return f"UP but HTTP {exc.code} on /api/meta"
            except OSError:
                time.sleep(0.5)
        handle.flush()
        return f"never bound port {port}:\n{log_file.read_text(encoding='utf-8', errors='replace')[-1200:]}"
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        handle.close()


def main(argv: list[str]) -> int:
    work = Path(argv[0]) if argv else Path(
        r"C:\Users\HW\AppData\Local\Temp\arc-r87-world")
    if not ZIP.is_file():
        print(f"SKIP: {ZIP} not on disk")
        return 0
    project = unpack(work)
    print(f"project: {project}")
    describe_world(project)
    contract_gap(project)
    print("--- boot attempt (verifies a candidate seed by HTTP, not by assumption) ---")
    print(" ", try_boot(project))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
