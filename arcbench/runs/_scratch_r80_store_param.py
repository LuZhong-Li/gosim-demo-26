"""The Sheet contract blind spot: the store arrives as a *parameter*.

r78's Sheet stdout:
    TypeError: store.findWorkbook is not a function
        at seed (/workspace/template/backend/src/seed.js:35:26)
and r79's:
    TypeError: store.createWorksheet is not a function
        at Object.<anonymous> (/workspace/template/backend/src/app.js:67:24)

Neither run logged a "[arc-agent] store contract issues" line, because the
checker only bound aliases created by ``const store = require('./store')``. A
generated seed that receives the store as a parameter (``function seed(store)``)
has no such import, so every call went unchecked and the process died at load
time. This probe runs detect -> fill -> boot on that shape.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

RUNS = Path(__file__).resolve().parent
AGENT = RUNS.parent.parent / "arcbench" / "agent"
sys.path.insert(0, str(AGENT))

from guard import complete_store_methods  # noqa: E402
from verify import backend_store_contract  # noqa: E402

STORE_JS = """const state = { workbooks: {}, sheets: {} };

function getData() {
  return state;
}

function collection(name) {
  return state[name] || {};
}

module.exports = { getData, collection };
"""

SEED_JS = """// The r78/r79 shape: the store is a parameter, so no require() to bind.
function seed(store) {
  const book = store.findWorkbook('Sheet1');
  const sheet = store.createWorksheet('Sheet1', { name: 'Sheet1' });
  return [book, sheet];
}

module.exports = { seed };
"""

INDEX_JS = """const store = require('./store');
const { seed } = require('./seed');

seed(store);
console.log('Backend listening (probe)');
"""


def build() -> Path:
    root = Path(tempfile.mkdtemp(prefix="arc-store-param-"))
    src = root / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "store.js").write_text(STORE_JS, encoding="utf-8")
    (src / "seed.js").write_text(SEED_JS, encoding="utf-8")
    (src / "index.js").write_text(INDEX_JS, encoding="utf-8")
    return root


def run(root: Path) -> tuple[int, str, str]:
    proc = subprocess.run(["node", "backend/src/index.js"], cwd=str(root),
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    return proc.returncode, proc.stdout, proc.stderr


def main() -> int:
    root = build()
    failures: list[str] = []
    try:
        issues = backend_store_contract(root)
        caught = [item for item in issues if "findWorkbook" in item or "createWorksheet" in item]
        print(f"contract issues: {len(issues)} -> {[item.split(': ')[-1][:48] for item in caught]}")
        if len(caught) < 2:
            failures.append(f"a parameter-carried store is still invisible: {issues}")
        rc, out, err = run(root)
        print(f"before: rc={rc} {err.strip().splitlines()[:1]}")
        if "is not a function" not in err:
            failures.append("the Sheet TypeError did not reproduce")
        filled = complete_store_methods(root, issues)
        rc2, out2, err2 = run(root)
        print(f"after : filled={filled} rc={rc2} out={out2.strip().splitlines()[:1]}")
        if rc2 != 0 or "Backend listening" not in out2:
            failures.append(f"the repaired store still failed: {err2.strip()[:120]}")
        if backend_store_contract(root):
            failures.append("the contract is still open after the repair")
    finally:
        shutil.rmtree(root, ignore_errors=True)

    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: store calls through a parameter are detected, filled and boot")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
