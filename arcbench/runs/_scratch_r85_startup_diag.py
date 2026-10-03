"""r85 probe: a backend that dies before `listen` must explain itself.

Evidence (arcbench/runs/_r83_{github,stage3,sheet}_stdout.txt, 16/16/8 attempts):
    [rehearsal] FAILED in 8s: backend `npm start` exited early (rc=1):
The message ends at the colon - `npm start` printed NOTHING in that container, so
five tasks scored 0.00 with no recoverable reason anywhere in the log.

This probe reproduces that shape with three backends that all exit(1) before
binding, and asserts `startup_diagnosis()` turns each one into an actionable
message while still returning "" for a backend that is actually healthy.

before: diagnose() -> "" (nothing to feed the repair turn)
after : diagnose() -> the syntax error / the stack trace / the exact module

Run: python arcbench/runs/_scratch_r85_startup_diag.py
"""

from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent"))

from verify import backend_entry, startup_diagnosis  # noqa: E402


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return int(probe.getsockname()[1])


def make_backend(tmp: Path, name: str, entry_source: str, *, script: str | None = None) -> Path:
    backend = tmp / name
    (backend / "src").mkdir(parents=True, exist_ok=True)
    package = {"name": name, "version": "1.0.0",
               "scripts": {"start": script if script is not None else "node src/index.js"}}
    import json
    (backend / "package.json").write_text(json.dumps(package), encoding="utf-8")
    (backend / "src" / "index.js").write_text(entry_source, encoding="utf-8")
    return backend


HEALTHY = """
// Dependency-free on purpose: `startup_diagnosis` must not report a server that
// is up and listening as broken, so the probe cannot rely on express being
// installed next to a throwaway backend.
const http = require('http');
http.createServer((req, res) => res.end('ok'))
  .listen(Number(process.env.PORT || 3000), () => console.log('Backend listening'));
"""

# The r76/r79 shape: the entry calls something the module never exported.
MISSING_EXPORT = """
const { seed } = require('./seed');
seed(require('./store'));
"""

SYNTAX_ERROR = """
const express = require('express');
const app = express()
app.get('/', (req, res) => { res.send('ok') }
app.listen(Number(process.env.PORT || 3000));
"""


def main() -> int:
    failures: list[str] = []
    tmp = Path(tempfile.mkdtemp(prefix="arc-r85-diag-"))
    try:
        # ---------------------------------------------------------------- 1
        # A backend that cannot even be parsed: the message must name the file.
        backend = make_backend(tmp, "syntax", SYNTAX_ERROR)
        diagnosis = startup_diagnosis(backend, free_port(), timeout=20)
        print(f"[1] syntax error -> {diagnosis.splitlines()[0][:110] if diagnosis else '<EMPTY>'}")
        if "syntax" not in diagnosis.lower():
            failures.append("a syntax error did not produce a syntax-error diagnosis")
        if "index.js" not in diagnosis:
            failures.append("the syntax diagnosis does not name the offending file")

        # ---------------------------------------------------------------- 2
        # The r76 shape: require returns an object without the export, so the
        # call throws. `node --check` passes, so only running it can find this.
        backend = make_backend(tmp, "missingexport", MISSING_EXPORT)
        (backend / "src" / "seed.js").write_text("module.exports = {};\n", encoding="utf-8")
        (backend / "src" / "store.js").write_text("module.exports = {};\n", encoding="utf-8")
        diagnosis = startup_diagnosis(backend, free_port(), timeout=20)
        print(f"[2] missing export -> {diagnosis.splitlines()[0][:110] if diagnosis else '<EMPTY>'}")
        if "rc=1" not in diagnosis:
            failures.append("a runtime throw did not report its exit code")
        if "seed is not a function" not in diagnosis:
            failures.append("a runtime throw did not carry the JS error message")

        # ---------------------------------------------------------------- 3
        # A healthy backend that binds and listens must NOT be reported broken:
        # the diagnosis runs the same module the grader would, so a false
        # positive here would send the repair turn after working code.
        backend = make_backend(tmp, "healthy", HEALTHY)
        diagnosis = startup_diagnosis(backend, free_port(), timeout=20)
        print(f"[3] healthy server -> {diagnosis!r}")
        if diagnosis:
            failures.append(f"a healthy backend was reported broken: {diagnosis[:200]}")

        # ---------------------------------------------------------------- 4
        # `npm start` run by a non-node wrapper is the r83 shape: package.json
        # exists but names no module to run, so the entry has to be discovered.
        backend = make_backend(tmp, "wrapped", HEALTHY, script="vite preview")
        discovered = backend_entry(backend)
        print(f"[4] wrapped start script -> entry={discovered}")
        if discovered is None or discovered.name != "index.js":
            failures.append("a non-node start script hid the real entry module")

        # ---------------------------------------------------------------- 5
        # No entry at all must say so instead of returning a bare empty string.
        backend = tmp / "empty"
        (backend / "src").mkdir(parents=True)
        (backend / "package.json").write_text('{"name":"x","scripts":{}}', encoding="utf-8")
        diagnosis = startup_diagnosis(backend, free_port(), timeout=20)
        print(f"[5] no entry -> {diagnosis.splitlines()[0][:110] if diagnosis else '<EMPTY>'}")
        if "no entry module" not in diagnosis:
            failures.append("a backend with no entry module produced no explanation")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if failures:
        print("\nRESULT: FAIL")
        for line in failures:
            print(f"  - {line}")
        return 1
    print("\nRESULT: PASS - every pre-listen death is explained, a healthy boot is not")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
