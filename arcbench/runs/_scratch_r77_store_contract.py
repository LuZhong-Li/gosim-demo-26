"""Does backend_store_contract catch the shape that killed r73's Sheet run?

r73's Sheet stdout ends with:

    [template-app.stderr] TypeError: store.createWorksheet is not a function
    [template-app.stderr]     at seed (/workspace/template/backend/src/seed.js:38:24)

yet that same log has no "[arc-agent] store contract issues" line at all, so the
static check reported clean and the app died the moment it was started. This
script builds the plausible shapes of that call site and prints what the checker
sees for each, so the miss can be pinned down instead of guessed.
"""

from __future__ import annotations

import shutil
import sys
import tempfile
from pathlib import Path

RUNS = Path(__file__).resolve().parent
AGENT = RUNS.parent.parent / "arcbench" / "agent"
sys.path.insert(0, str(AGENT))

from verify import backend_store_contract  # noqa: E402

STORE_JS = """const state = { workbooks: {} };

function getData() {
  return state;
}

function collection(name, fallback) {
  if (!(name in state)) state[name] = fallback === undefined ? null : fallback;
  return state[name];
}

module.exports = { getData, collection };
"""

SEED_JS = """const store = require(__SPECIFIER__);

function seed() {
  const sheet1 = store.createWorksheet('Sheet1', { name: 'Sheet1' });
  state.sheets.push(sheet1);
}

module.exports = { seed };
"""

#: (label, seed path, specifier, must_be_caught). The last shape resolves to
#: `backend/store.js`, which does not exist - that import is broken on its own
#: (MODULE_NOT_FOUND), so the contract check is right to stay quiet.
SHAPES = {
    "src/seed.js  -> require('./store')": ("src/seed.js", "./store", True),
    "src/seed.js  -> require('./store.js')": ("src/seed.js", "./store.js", True),
    "src/db/seed.js -> require('../store')": ("src/db/seed.js", "../store", True),
    "src/sheets/seed.js -> require('../../store')": ("src/sheets/seed.js", "../../store", False),
}


def build(root: Path, seed_path: str, specifier: str) -> None:
    src = root / "backend" / "src"
    (src / "store.js").parent.mkdir(parents=True, exist_ok=True)
    (src / "store.js").write_text(STORE_JS, encoding="utf-8")
    seed = src.parent.parent / "backend" / seed_path
    seed.parent.mkdir(parents=True, exist_ok=True)
    seed.write_text(SEED_JS.replace("__SPECIFIER__", f"'{specifier}'"), encoding="utf-8")


def main() -> int:
    failures: list[str] = []
    for label, (seed_path, specifier, must_catch) in SHAPES.items():
        root = Path(tempfile.mkdtemp(prefix="arc-store-probe-"))
        try:
            build(root, seed_path, specifier)
            findings = backend_store_contract(root)
            caught = any("createWorksheet" in item for item in findings)
            verdict = "CAUGHT " if caught else ("expected-clean " if not must_catch else "MISSED ")
            print(f"{verdict}{label} -> {findings or 'clean'}")
            if must_catch and not caught:
                failures.append(label)
        finally:
            shutil.rmtree(root, ignore_errors=True)
    if failures:
        print(f"{len(failures)} of {len(SHAPES)} shapes are invisible to backend_store_contract")
        return 1
    print("all shapes caught")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
