"""app.use(undefined) must not be able to kill the server (r68 / r70 Stage 1)."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

WORK = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r70_appuse")
NODE = Path("C:/Users/HW/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe")


def main() -> None:
    src = WORK / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "index.js").write_text("require('./app');\n", encoding="utf-8")
    (src / "app.js").write_text(
        "const express = require('express');\n"
        "const app = express();\n"
        "function makeRoutes() { return undefined; }\n"
        "app.use(express.json());\n"
        "app.use('/api', makeRoutes());\n"
        "app.get('/api/health', (req, res) => res.json({ ok: true }));\n"
        "module.exports = app;\n",
        encoding="utf-8",
    )
    changed = guard.guard_app_use(WORK)
    print("guard_app_use ->", changed)
    assert changed, "the app.use call sites must be guarded"
    body = (src / "app.js").read_text(encoding="utf-8")
    assert "__arcUse(app, " in body and "function __arcUse(" in body
    assert body.count("__arcUse(app, ") == 2, body.count("__arcUse(app, ")

    check = subprocess.run([str(NODE), "--check", str(src / "app.js")],
                           capture_output=True, text=True)
    print("node --check rc:", check.returncode, check.stderr[:200])
    assert check.returncode == 0, check.stderr

    # Running it must log the dropped argument instead of throwing.
    shim = Path("D:/gosim-demo-26/arcbench/runs/_scratch_sheet/lib")
    import os
    env = dict(os.environ)
    env["NODE_PATH"] = str(shim)
    env["PATH"] = f"{NODE.parent}{os.pathsep}{env.get('PATH', '')}"
    run = subprocess.run(
        [str(NODE), "-e", "require('./backend/src/app.js'); console.log('loaded');"],
        cwd=str(WORK), capture_output=True, text=True,
        env=env,
    )
    print("run rc:", run.returncode)
    print("stdout:", run.stdout.strip()[:200])
    print("stderr:", run.stderr.strip()[:300])
    assert run.returncode == 0, run.stderr
    assert "loaded" in run.stdout
    assert "dropped" in run.stderr and "instead of crashing" in run.stderr

    # A second pass is a no-op.
    assert guard.guard_app_use(WORK) == []
    print("DONE")


if __name__ == "__main__":
    main()
