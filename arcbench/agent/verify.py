"""Post-generation verification: structure, build, start-up rehearsal, specs.

The runner grades the deliverable *after* the agent exits:

    frontend/  npm install --no-audit --no-fund --no-package-lock && npm run build
    backend/   npm install --no-audit --no-fund --no-package-lock
    backend/   PORT=<port> npm start            (waits for the port, 120s)
    npx playwright test                          (10s per test, workers=4)

A backend that crashes on start-up, or a frontend whose build fails, means the
readiness probe never answers and ZERO tests execute — not a partial score. The
official reference adapter therefore rehearses that exact sequence itself and
hands the failure back for one repair turn; this module is that rehearsal.

Two rules come straight from the reference implementation's incident log:

* the rehearsal must never touch the grading port — the runner watches it and
  terminates the run when a server answers there while the agent is working
  (``_rehearse_startup`` and ``_port_watchdog`` in ``octos-org/arc-adapter``);
* everything we start must be stopped again, or the grader's own ``npm start``
  dies on EADDRINUSE.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def log(msg: str) -> None:
    """Progress lines go to BOTH stdout and stderr.

    The platform truncates long stdout captures; it stores stderr as a separate
    field, so mirroring keeps our diagnostics retrievable. Stderr content does
    not affect the verdict.
    """
    print(msg, flush=True)
    print(msg, file=sys.stderr, flush=True)


NPM_INSTALL = ["npm", "install", "--no-audit", "--no-fund", "--no-package-lock"]


def _npm() -> str | None:
    found = shutil.which("npm")
    if found:
        return found
    # Windows installs npm as npm.cmd next to node.
    return shutil.which("npm.cmd")


def port_is_free(port: int) -> bool:
    with socket.socket() as probe:
        return probe.connect_ex(("127.0.0.1", port)) != 0


def _wait_for_port(port: int, timeout: float) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if not port_is_free(port):
            return True
        time.sleep(0.5)
    return False


def _listeners(port: int) -> list[int]:
    """PIDs listening on a local port, best effort across tool availability."""
    pids: list[int] = []
    for cmd in (["lsof", "-ti", f":{port}"], ["fuser", f"{port}/tcp"]):
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        except (OSError, subprocess.TimeoutExpired):
            continue
        if result.returncode != 0:
            continue
        pids = [int(part) for part in re.findall(r"\d+", result.stdout + result.stderr)]
        if pids:
            return pids
    return pids


def free_port(port: int, project_dir: Path | None = None) -> None:
    """Best-effort release of the grading port.

    Only processes whose working directory is inside our own deliverable are
    killed: the runner machine is shared between tenants, and killing a foreign
    listener would sabotage someone else's grading.
    """
    pids = _listeners(port)
    if not pids:
        log(f"[postflight] port {port} already free")
        return
    root = str(project_dir).rstrip("\\/") if project_dir else ""
    killed: list[int] = []
    for pid in pids:
        cwd = ""
        try:
            cwd = os.readlink(f"/proc/{pid}/cwd")
        except OSError:
            cwd = ""
        if root and cwd and not cwd.startswith(root):
            log(f"[postflight] port {port} held by foreign pid {pid} (cwd={cwd}); leaving it")
            continue
        if not root and not cwd:
            # No way to attribute the listener; leave it alone rather than
            # killing another tenant's process.
            log(f"[postflight] port {port} held by pid {pid} (cwd unknown); leaving it")
            continue
        try:
            os.kill(pid, signal.SIGKILL)
            killed.append(pid)
        except (ProcessLookupError, PermissionError, ValueError, OSError):
            continue
    if killed:
        log(f"[postflight] freed port {port} by killing {killed}")


def postflight_structure_check(output_dir: Path, web_port: int = 3000) -> None:
    """The runner requires PROJECT_DIR/frontend and PROJECT_DIR/backend.

    Missing either one is reported as ``template is incomplete`` and scores
    nothing, so log the tree and lift a single nested level into place when the
    model scaffolded ``output_dir/<app>/frontend`` instead.
    """
    lines: list[str] = []
    for root, dirs, files in os.walk(output_dir):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist", "__pycache__")]
        depth = Path(root).relative_to(output_dir).parts
        if len(depth) > 2:
            dirs[:] = []
            continue
        indent = "  " * len(depth)
        lines.append(f"{indent}{Path(root).name}/")
        for name in sorted(files)[:8]:
            lines.append(f"{indent}  {name}")
        if len(lines) > 60:
            lines.append("... (truncated)")
            break
    log("[postflight] workspace tree:\n" + "\n".join(lines))

    if (output_dir / "frontend").is_dir() and (output_dir / "backend").is_dir():
        log("[postflight] frontend/ and backend/ present at workspace root")
        return
    for child in output_dir.iterdir():
        if not child.is_dir() or child.name in (".git", ".arc", "requirements", "node_modules"):
            continue
        if (child / "frontend").is_dir() and (child / "backend").is_dir():
            log(f"[postflight] app found nested at {child.name}/; lifting to root")
            for item in child.iterdir():
                dest = output_dir / item.name
                if dest.exists():
                    continue
                shutil.move(str(item), str(dest))
            if (output_dir / "frontend").is_dir() and (output_dir / "backend").is_dir():
                log("[postflight] lift succeeded")
            return
    log("[postflight] WARNING: no frontend/ + backend/ found anywhere; "
        "the runner will reject this template")


def _run(cmd: list[str], cwd: Path, timeout: int, env: dict | None = None) -> tuple[int, str]:
    try:
        result = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=timeout, env=env,
        )
    except subprocess.TimeoutExpired:
        return 124, f"timeout after {timeout}s"
    except OSError as exc:
        return 127, str(exc)
    output = ((result.stdout or "") + "\n" + (result.stderr or "")).strip()
    return result.returncode, output[-1500:]


def _stop(proc: subprocess.Popen) -> None:
    if proc is None or proc.poll() is not None:
        return
    for attempt in (
        lambda: os.killpg(os.getpgid(proc.pid), signal.SIGKILL),
        proc.terminate,
        proc.kill,
    ):
        try:
            attempt()
            proc.wait(timeout=10)
            return
        except (OSError, subprocess.TimeoutExpired):
            continue


def _spawn_server(backend: Path, port: int, log_file: Path) -> subprocess.Popen:
    env = dict(os.environ, PORT=str(port))
    # Keep the generated app off the grading port even if it adds extras.
    env.setdefault("ARC_EXTRA_PORTS", "0")
    handle = open(log_file, "w", encoding="utf-8")
    kwargs: dict = {}
    if os.name == "posix":
        kwargs["start_new_session"] = True
    else:  # pragma: no cover - Windows only, used for local rehearsals
        kwargs["creationflags"] = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    npm = _npm() or "npm"
    return subprocess.Popen(
        [npm, "run", "start"], cwd=backend, env=env,
        stdout=handle, stderr=subprocess.STDOUT, **kwargs,
    )


def rehearse_startup(output_dir: Path, smoke_port: int, *, timeout: int = 600) -> str | None:
    """Run the grading sequence ourselves, on the smoke port.

    Returns ``None`` when the app builds and comes up, otherwise a short error
    description suitable for feeding back into a repair turn. Returns a
    ``SKIP:`` string when the toolchain is unavailable, which the caller must
    treat as "not verified" rather than "failed".
    """
    frontend = output_dir / "frontend"
    backend = output_dir / "backend"
    if not (frontend.is_dir() and backend.is_dir()):
        return "frontend/ or backend/ missing at workspace root"

    npm = _npm()
    if not npm:
        return "SKIP: npm is not on PATH in this container"

    if (frontend / "package.json").exists():
        rc, out = _run([npm, *NPM_INSTALL[1:]], frontend, timeout)
        if rc != 0 and not (frontend / "node_modules").is_dir():
            return f"frontend `npm install` failed:\n{out}"
        rc, out = _run([npm, "run", "build"], frontend, timeout)
        if rc != 0:
            return f"frontend `npm run build` failed:\n{out}"

    if not (backend / "package.json").exists():
        return "backend/package.json missing"
    rc, out = _run([npm, *NPM_INSTALL[1:]], backend, timeout)
    if rc != 0 and not (backend / "node_modules").is_dir():
        return f"backend `npm install` failed:\n{out}"

    free_port(smoke_port)
    handle, log_name = tempfile.mkstemp(prefix="arc-rehearsal-", suffix=".log")
    os.close(handle)
    log_file = Path(log_name)
    try:
        try:
            proc = _spawn_server(backend, smoke_port, log_file)
        except OSError as exc:
            return f"backend `npm start` could not launch: {exc}"
        try:
            deadline = time.time() + 45
            while time.time() < deadline:
                if proc.poll() is not None:
                    out = log_file.read_text(encoding="utf-8", errors="replace")
                    return (f"backend `npm start` exited early (rc={proc.returncode}):\n"
                            f"{out[-1500:]}")
                if _wait_for_port(smoke_port, 1.0):
                    status = probe_home(smoke_port)
                    if status and status >= 500:
                        return (f"backend bound port {smoke_port} but GET / answered {status}: "
                                "the built frontend is not being served from frontend/dist")
                    log(f"[rehearsal] backend bound smoke port {smoke_port} "
                        f"(GET / -> {status or 'no answer'}); shutting it down")
                    return None
            out = log_file.read_text(encoding="utf-8", errors="replace")
            return f"backend did not bind port {smoke_port} within 45s:\n{out[-1500:]}"
        finally:
            _stop(proc)
            free_port(smoke_port)
    finally:
        try:
            log_file.unlink()
        except OSError:
            pass


# ------------------------------------------------------------------ specs

def locate_acceptance_tests(tree: dict, bundle_dir: Path) -> Path | None:
    """Find the public Playwright specs for this task.

    Order: ``ARCBENCH_TESTS_DIR``, the runner's ``/workspace/tests`` mount, then
    a ``public-tests/<task>`` folder shipped inside the bundle. The platform
    publishes these specs with the task, so using them is not reading hidden
    test data.
    """
    candidates: list[Path] = []
    env_dir = os.environ.get("ARCBENCH_TESTS_DIR")
    if env_dir:
        candidates.append(Path(env_dir))
    candidates.append(Path("/workspace/tests"))
    bundled = bundle_dir / "public-tests"
    manifest = bundled / "manifest.json"
    if manifest.is_file():
        try:
            mapping = json.loads(manifest.read_text(encoding="utf-8"))
            root_name = str(tree.get("name", "")).strip()
            for task_id, title in mapping.items():
                if str(title).strip() == root_name and (bundled / task_id).is_dir():
                    candidates.append(bundled / task_id)
        except Exception:  # noqa: BLE001 - a broken manifest is not fatal
            pass
    for candidate in candidates:
        try:
            if candidate.is_dir() and any(candidate.rglob("*.spec.ts")):
                return candidate.resolve()
            log(f"[tests] candidate {candidate}: "
                f"{'no *.spec.ts' if candidate.is_dir() else 'absent'}")
        except OSError as exc:
            log(f"[tests] candidate {candidate} unreadable: {exc}")
    return None


def spec_extra_ports(tests_dir: Path | None) -> list[int]:
    """Ports the specs hard-code as their default base URL (e.g. 3000)."""
    if not tests_dir:
        return []
    ports: set[int] = set()
    for path in tests_dir.rglob("*.ts"):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for match in re.finditer(r"https?://(?:127\.0\.0\.1|localhost):(\d{2,5})", text):
            ports.add(int(match.group(1)))
    return sorted(ports)


def read_specs(tests_dir: Path | None, budget: int = 60_000) -> str:
    """The spec text, capped, for inclusion in the generation prompt."""
    if not tests_dir:
        return ""
    chunks: list[str] = []
    used = 0
    for path in sorted(tests_dir.rglob("*.ts")):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if used + len(text) > budget:
            text = text[: max(0, budget - used)]
        if not text:
            break
        chunks.append(f"// ---- {path.relative_to(tests_dir)} ----\n{text}")
        used += len(text)
        if used >= budget:
            break
    return "\n\n".join(chunks)


def run_acceptance(tests_dir: Path, port: int, *, timeout_ms: int = 10_000) -> tuple[str, int, dict[str, bool]]:
    """Run the acceptance suite the way the grader does.

    Only usable when a Playwright runner is reachable; the caller decides
    whether to call this at all. Returns (output, returncode, per-spec results).
    """
    node = os.environ.get("ARC_NODE", "node")
    playwright_cli = os.environ.get("ARC_PLAYWRIGHT_CLI")
    config = os.environ.get("ARC_PLAYWRIGHT_CONFIG")
    if not playwright_cli or not config:
        return "", 127, {}
    env = dict(os.environ)
    env["TARGET_URL"] = f"http://127.0.0.1:{port}"
    env["E2E_BASE_URL"] = f"http://127.0.0.1:{port}"
    env["ARC_GRADE_TIMEOUT_MS"] = str(timeout_ms)
    cmd = [
        node, playwright_cli.replace("\\", "/"), "test",
        str(tests_dir).replace("\\", "/"),
        "--config", config.replace("\\", "/"),
        "--workers", "1", "--reporter", "list",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                                errors="replace", env=env, timeout=900)
    except (OSError, subprocess.TimeoutExpired) as exc:
        return str(exc), 127, {}
    output = (result.stdout or "") + (result.stderr or "")
    results: dict[str, bool] = {}
    pattern = re.compile(r"^\s*(ok|x)\s+\d+\s+.*?[/\\]([^\s/\\]+)\.spec\.ts", re.MULTILINE)
    for match in pattern.finditer(output):
        results[match.group(2)] = match.group(1) == "ok"
    return output, result.returncode, results


def run_local_acceptance(project_dir: Path, smoke_port: int, tests_dir: Path) -> tuple[str, dict[str, bool]]:
    """Boot the real app on the smoke port and run a local suite against it.

    Only reachable when ARC_PLAYWRIGHT_CLI and ARC_PLAYWRIGHT_CONFIG are set -
    i.e. on a developer machine. The platform container has neither the runner
    nor a browser during generation, so it falls back to `probe_home` below.
    """
    handle, log_name = tempfile.mkstemp(prefix="arc-acceptance-", suffix=".log")
    os.close(handle)
    log_file = Path(log_name)
    server = None
    try:
        server = _spawn_server(project_dir / "backend", smoke_port, log_file)
        if not _wait_for_port(smoke_port, 30.0):
            tail = log_file.read_text(encoding="utf-8", errors="replace")[-800:]
            return f"backend never bound port {smoke_port}\n{tail}", {}
        output, code, results = run_acceptance(tests_dir, smoke_port)
        return f"rc={code} specs={len(results)}\n{output[-4000:]}", results
    except OSError as exc:
        return f"could not start the app: {exc}", {}
    finally:
        _stop(server)
        free_port(smoke_port, project_dir)
        try:
            log_file.unlink()
        except OSError:
            pass


def probe_home(port: int, timeout: float = 10.0) -> int:
    """HTTP status of GET / on a local port, or 0 when nothing answers.

    A cheap last check that the built frontend is actually being served.
    """
    import urllib.error
    import urllib.request

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=3) as response:
                return int(response.status)
        except urllib.error.HTTPError as exc:
            return int(exc.code)
        except Exception:  # noqa: BLE001 - not up yet
            time.sleep(0.5)
    return 0
