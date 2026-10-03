"""The app.use() type filter must cover every backend module, not just app.js."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

WORK = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r75_use")
NODE = Path("C:/Users/HW/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe")


def main() -> None:
    src = WORK / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "app.js").write_text(
        "const express = require('express');\n"
        "const app = express();\n"
        "app.use(express.json());\n"
        "module.exports = app;\n",
        encoding="utf-8",
    )
    # The r74 pattern: a *second* module mounts middleware on the shared app.
    (src / "index.js").write_text(
        "const app = require('./app');\n"
        "const broken = undefined;\n"
        "app.use('/x', broken);\n"
        "app.use('/ok', (req, res) => res.end('ok'));\n",
        encoding="utf-8",
    )
    changed = guard.guard_app_use(WORK)
    print("sweep ->", changed)
    assert len(changed) == 2, changed
    index = (src / "index.js").read_text(encoding="utf-8")
    assert "__arcUse(app, " in index and "function __arcUse(" in index
    assert guard.guard_app_use(WORK) == [], "idempotent"

    shim = Path("D:/gosim-demo-26/arcbench/runs/_scratch_sheet/lib")
    run = subprocess.run(
        [str(NODE), "-e", "require('./backend/src/index.js'); console.log('loaded');"],
        cwd=str(WORK), capture_output=True, text=True,
        env={**__import__("os").environ, "NODE_PATH": str(shim)},
    )
    print("rc:", run.returncode, "| out:", run.stdout.strip()[:60], "| err:", run.stderr.strip()[:90])
    assert run.returncode == 0, run.stderr
    assert "loaded" in run.stdout
    print("DONE")


if __name__ == "__main__":
    main()
