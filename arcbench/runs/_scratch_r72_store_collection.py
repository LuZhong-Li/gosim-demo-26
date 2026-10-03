"""collection() must answer .find()/.filter() - r70 Stage 2 threw six times."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

WORK = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r72_collection")
NODE = Path("C:/Users/HW/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe")


def main() -> None:
    src = WORK / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "store.js").write_text(
        "const state = {};\n"
        "module.exports = { state };\n",
        encoding="utf-8",
    )
    (src / "routes.js").write_text(
        "const store = require('./store');\n"
        "store.collection('sessions');\n", encoding="utf-8")
    issues = ["backend/src/routes.js:2: `store.collection()` is called but "
              "backend/src/store.js never defines `collection`"]
    fixed = guard.complete_store_methods(WORK, issues)
    print("complete_store_methods ->", fixed)
    assert fixed == ["collection"], fixed

    probe = src / "probe.js"
    probe.write_text(
        "const store = require('./store');\n"
        "const sessions = store.collection('sessions');\n"
        "sessions.push({ id: 'a', username: 'alice' });\n"
        "const found = sessions.find((entry) => entry.username === 'alice');\n"
        "console.log('find ->', found && found.id);\n"
        "const keyed = store.collection('users', {});\n"
        "keyed.alice = { username: 'alice' };\n"
        "console.log('keyed find type ->', typeof keyed.find);\n"
        "console.log('keyed property ->', keyed.alice.username);\n",
        encoding="utf-8",
    )
    result = subprocess.run([str(NODE), str(probe)], capture_output=True, text=True,
                            cwd=str(WORK))
    print(result.stdout.strip())
    if result.returncode != 0:
        print("stderr:", result.stderr.strip()[:300])
    assert result.returncode == 0, result.stderr
    assert "find -> a" in result.stdout, result.stdout
    assert "keyed find type -> function" in result.stdout
    assert "keyed property -> alice" in result.stdout
    print("DONE")


if __name__ == "__main__":
    main()
