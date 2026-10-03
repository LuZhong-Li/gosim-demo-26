"""collection() must never answer undefined/null - r71 logged a wall of 500s."""

from __future__ import annotations

import shutil
import subprocess
import sys
import time
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

SOURCE = Path("D:/gosim-demo-26/arcbench/runs/_r71_artifacts/205ed8a34f2f/template")
# A fresh copy per run: a reused work dir already carries the guard, so the
# "before" state would silently vanish and the pass would report no change.
WORK = Path(f"D:/gosim-demo-26/arcbench/runs/_scratch_r73_collection_{int(time.time())}")
NODE = Path("C:/Users/HW/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe")


def main() -> None:
    target = WORK / "backend" / "src"
    shutil.copytree(SOURCE / "backend" / "src", target, dirs_exist_ok=True)

    store = target / "store.js"
    probe = target / "probe.js"
    probe.write_text(
        "const store = require('./store');\n"
        "const accounts = store.collection('accounts');\n"
        "console.log('typeof:', typeof accounts);\n"
        "console.log('Object.values ok:', Object.values(accounts).length);\n"
        "console.log('find ok:', typeof accounts.find);\n",
        encoding="utf-8",
    )

    before = subprocess.run([str(NODE), str(probe)], capture_output=True, text=True,
                            cwd=str(WORK))
    print("BEFORE rc:", before.returncode)
    print("BEFORE out:", before.stdout.strip().replace("\n", " | ")[:160])
    print("BEFORE err:", before.stderr.strip().splitlines()[:1])

    changed = guard.ensure_collection_never_empty(WORK)
    print("guard ->", changed)
    assert changed, "the store accessor must be guarded"
    assert guard.ensure_collection_never_empty(WORK) == [], "guard must be idempotent"

    after = subprocess.run([str(NODE), str(probe)], capture_output=True, text=True,
                           cwd=str(WORK))
    print("AFTER rc:", after.returncode)
    print("AFTER out:", after.stdout.strip().replace("\n", " | "))
    assert after.returncode == 0, after.stderr
    assert "typeof: object" in after.stdout
    assert "Object.values ok: 0" in after.stdout
    assert "find ok: function" in after.stdout
    print("DONE")


if __name__ == "__main__":
    main()
