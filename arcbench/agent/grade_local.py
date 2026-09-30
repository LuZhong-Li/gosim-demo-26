"""Local grader for a generated ARC-Bench app.

The official grader runs, after the agent exits:

    cd frontend && npm install && npm run build
    cd backend  && npm install
    cd backend  && PORT=<port> npm start        (readiness probe)
    npx playwright test                          (10s per test, workers=4)

This module reproduces that sequence against a generated project directory,
using the local developer toolchain when it is available. It exists because the
two private hackathon tasks (``github`` / ``sheet``) ship no public specs, so
the only way to know whether the generated app satisfies the requirement text is
to run our own Playwright proxies (see ``proxy_specs.py``) against it and feed
the failures back to the model.

It deliberately reuses ``verify.py`` rather than re-implementing the build and
start-up logic: that module already rehearses the exact grader sequence.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path

from verify import (
    _spawn_server,
    _stop,
    _wait_for_port,
    free_port,
    log,
    rehearse_startup,
    run_acceptance,
)


def run_grade(
    output_dir: Path,
    specs_dir: Path,
    *,
    smoke_port: int = 3100,
    timeout_ms: int = 10_000,
    playwright_cli: str | None = None,
    playwright_config: str | None = None,
) -> dict:
    """Build, start and score a generated app, returning a machine-readable report.

    The report is a plain dict so the caller can either print it or merge it into
    ``generation-report.json``. It never raises on toolchain absence: those cases
    become ``error`` entries with an explanation.
    """
    report: dict = {
        "output_dir": str(output_dir),
        "specs_dir": str(specs_dir),
        "port": smoke_port,
        "build": None,
        "server": None,
        "tests": None,
    }
    output_dir = Path(output_dir)
    specs_dir = Path(specs_dir)

    if not (output_dir / "frontend").is_dir() or not (output_dir / "backend").is_dir():
        report["error"] = "frontend/ or backend/ missing at workspace root"
        return report
    if not specs_dir.is_dir() or not any(specs_dir.rglob("*.spec.ts")):
        report["error"] = f"no *.spec.ts found under {specs_dir}"
        return report

    rehearsal = rehearse_startup(output_dir, smoke_port, timeout=600)
    if rehearsal is None:
        report["build"] = "ok"
    elif str(rehearsal).startswith("SKIP:"):
        report["build"] = f"skipped: {rehearsal}"
    else:
        report["build"] = {"error": rehearsal}
        report["error"] = "build/start rehearsal failed"
        return report

    handle, log_name = tempfile.mkstemp(prefix="arc-grade-", suffix=".log")
    os.close(handle)
    log_file = Path(log_name)
    proc = None
    try:
        try:
            proc = _spawn_server(output_dir / "backend", smoke_port, log_file)
        except OSError as exc:
            report["server"] = {"error": str(exc)}
            report["error"] = f"could not start backend: {exc}"
            return report

        if not _wait_for_port(smoke_port, 30.0):
            tail = log_file.read_text(encoding="utf-8", errors="replace")[-800:]
            report["server"] = {"error": f"backend never bound port {smoke_port}\n{tail}"}
            report["error"] = "backend never became ready"
            return report
        report["server"] = "ok"

        if playwright_cli:
            os.environ["ARC_PLAYWRIGHT_CLI"] = playwright_cli
        if playwright_config:
            os.environ["ARC_PLAYWRIGHT_CONFIG"] = playwright_config
        output, code, results = run_acceptance(specs_dir, smoke_port, timeout_ms=timeout_ms)
        report["tests"] = {
            "returncode": code,
            "passed": sum(1 for ok in results.values() if ok),
            "failed": sum(1 for ok in results.values() if not ok),
            "results": results,
            "output": output[-8000:],
        }
        return report
    finally:
        _stop(proc)
        free_port(smoke_port, output_dir)
        try:
            log_file.unlink()
        except OSError:
            pass


def build_repair_prompt(failures, *, spec_hint: str = "") -> str:
    """Turn a failure report into a repair prompt for the generation model."""
    if isinstance(failures, str):
        failures = [{"name": "unknown", "error": failures}]

    lines = [
        "The generated application failed one or more acceptance checks. "
        "Fix the reported causes and emit the corrected files, complete, in the "
        "JSON envelope. Do not rewrite working code around them.",
        "",
        "Failures:",
    ]
    for failure in failures or []:
        if not isinstance(failure, dict):
            continue
        name = failure.get("name") or failure.get("test") or "unknown"
        error = failure.get("error") or failure.get("message") or ""
        lines.append(f"- {name}: {error}")
        aria = failure.get("aria")
        if aria:
            lines.append(f"  ARIA snapshot:\n{aria}")
    if spec_hint:
        lines.append("\nRelevant spec excerpt:\n" + spec_hint)
    lines.append(
        "\nTypical causes: a renamed or missing accessible name, a control with "
        "no visible label, two elements sharing one name (strict-mode violation), "
        "missing seed data, a wrong route, or a missing inline error message."
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build, start and score a generated ARC-Bench app.")
    parser.add_argument("output_dir", help="generated project directory")
    parser.add_argument("specs_dir", help="directory of Playwright *.spec.ts files")
    parser.add_argument("--port", type=int, default=3100)
    parser.add_argument("--timeout-ms", type=int, default=10_000)
    parser.add_argument("--playwright-cli", default=None)
    parser.add_argument("--playwright-config", default=None)
    parser.add_argument("--json", action="store_true", help="print the report as JSON")
    args = parser.parse_args(argv)

    report = run_grade(
        Path(args.output_dir),
        Path(args.specs_dir),
        smoke_port=args.port,
        timeout_ms=args.timeout_ms,
        playwright_cli=args.playwright_cli,
        playwright_config=args.playwright_config,
    )
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        log(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if "error" not in report else 1


if __name__ == "__main__":
    raise SystemExit(main())
