"""The Sheet crash that survived two rounds: a declared-but-unexported method.

r73's Sheet stdout and r76's Sheet stdout both end the same way:

    [template-app.stderr] TypeError: store.createWorksheet is not a function
    [template-app.stderr]     at seed (/workspace/template/backend/src/seed.js:38:24)
    [template-app.stderr]     at Object.<anonymous> (/workspace/template/backend/src/index.js:7:1)

and neither log contains a "[arc-agent] store contract issues" line, so the
static check thought the method existed. The shape that produces that: the store
declares ``function createWorksheet() {}`` but its
``module.exports = { getData, collection }`` never lists it, so the call is a
TypeError at load time while a "does the file define this name" scan says yes.

This probe runs the whole chain - detect, repair, boot - on that shape.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import re
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

function collection(name, fallback) {
  if (!(name in state)) state[name] = fallback === undefined ? null : fallback;
  return state[name];
}

// Declared here, never listed in module.exports below - the r73/r76 shape.
function createWorksheet(name, options) {
  state.sheets[name] = options || {};
  return name;
}

module.exports = { getData, collection };
"""

SEED_JS = """const store = require('./store');

function seed() {
  const sheet = store.createWorksheet('Sheet1', { name: 'Sheet1' });
  console.log('seeded worksheet:', sheet);
}

module.exports = { seed };
"""

INDEX_JS = """const seed = require('./seed');

seed.seed();
console.log('Backend listening (probe)');
"""


def build() -> Path:
    root = Path(tempfile.mkdtemp(prefix="arc-store-exports-"))
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


def old_definitions(store_text: str) -> set[str]:
    """The pre-r78 rule: every declaration counted, exported or not."""
    defined: set[str] = set()
    for pattern in (re.compile(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\("),
                    re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\()"),
                    re.compile(r"\bexports\.([A-Za-z_$][\w$]*)\s*="),
                    re.compile(r"\bmodule\.exports\.([A-Za-z_$][\w$]*)\s*=")):
        defined.update(pattern.findall(store_text))
    match = re.search(r"module\.exports\s*=\s*\{(.*?)\}", store_text, re.S)
    if match:
        for entry in re.split(r"[,\n]", match.group(1)):
            name = entry.split(":")[0].strip()
            if re.fullmatch(r"[A-Za-z_$][\w$]*", name):
                defined.add(name)
    return defined


def main() -> int:
    root = build()
    failures: list[str] = []
    try:
        # --- why two rounds missed it ----------------------------------------
        blind = "createWorksheet" in old_definitions(STORE_JS)
        print(f"old rule thought createWorksheet was defined: {blind}")
        if not blind:
            failures.append("the old rule would have caught this shape; the repro is wrong")
        rc, out, err = run(root)
        print(f"runtime: node rc={rc} {err.strip().splitlines()[:1]}")
        if "store.createWorksheet is not a function" not in err:
            failures.append(f"the Sheet TypeError did not reproduce: {err.strip().splitlines()[:2]}")

        # --- after: detection drives the mechanical filler -------------------
        issues_now = backend_store_contract(root)
        caught = any("createWorksheet" in item for item in issues_now)
        if not caught:
            failures.append(f"the export-aware check still misses it: {issues_now}")
        filled = complete_store_methods(root, issues_now) if issues_now else []
        rc2, out2, err2 = run(root)
        print(f"after : issues={issues_now}")
        print(f"        filled={filled} node rc={rc2} out={out2.strip().splitlines()[:2]}")
        if rc2 != 0 or "Backend listening" not in out2:
            failures.append(f"the repaired store still failed (rc={rc2}): {err2.strip()[:160]}")
        leftover = backend_store_contract(root)
        if leftover:
            failures.append(f"the contract is still open after the repair: {leftover}")
        # The filler is deliberately a no-op, so the seeded value is undefined;
        # what matters here is that the process boots and the contract closes.
        print(f"        (filler semantics: store.createWorksheet() -> undefined, contract closed={not leftover})")
    finally:
        shutil.rmtree(root, ignore_errors=True)

    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: declared-but-unexported store methods are detected, filled and boot")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
