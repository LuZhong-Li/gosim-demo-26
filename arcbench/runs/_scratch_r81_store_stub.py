"""A store method the contract filler missed still has to not throw.

r80's GitHub stdout:
    [arc-agent] store contract issues: ['backend/src/auth.js:14: `store.isTokenValid()` ...']
    [arc-agent] added store compatibility methods: ['isTokenValid', 'getSessionByToken', 'getAccountByUser...']
    ...
    TypeError: store.getAccountByUsernameOrEmail is not a function
        at /workspace/template/backend/src/auth.js:26:25

The name *was* filled in, on the module the checker resolved - but the module
auth.js actually holds is a different object, so the fill never reached it and the
first sign-up request answered 500. This probe reproduces that shape (the caller
holds a copy of the export) and checks that ``ensure_store_method_stub`` closes it.
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

from guard import ensure_store_method_stub  # noqa: E402
from verify import backend_store_contract  # noqa: E402

STORE_JS = """const state = { accounts: {} };

function getData() {
  return state;
}

module.exports = { getData };
"""

#: ``auth.js`` takes a *copy* of the export object, which is exactly why a filler
#: appended to ``store.js``'s module.exports never reached it.
AUTH_JS = """const store = Object.assign({}, require('./store'));

function signIn(username) {
  const account = store.getAccountByUsernameOrEmail(username);
  return account ? account.username : 'no-account';
}

module.exports = { signIn, store };
"""

INDEX_JS = """const auth = require('./auth');

console.log('sign-in result:', auth.signIn('repo-owner'));
console.log('Backend listening (probe)');
"""


def build() -> Path:
    root = Path(tempfile.mkdtemp(prefix="arc-store-stub-"))
    src = root / "backend" / "src"
    src.mkdir(parents=True, exist_ok=True)
    (src / "store.js").write_text(STORE_JS, encoding="utf-8")
    (src / "auth.js").write_text(AUTH_JS, encoding="utf-8")
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
        rc, out, err = run(root)
        print(f"before: rc={rc} {err.strip().splitlines()[:2]}")
        if "is not a function" not in err:
            failures.append("the r80 TypeError did not reproduce")

        changes = ensure_store_method_stub(root, backend_store_contract(root))
        print(f"guard -> {changes}")
        if not changes:
            failures.append("ensure_store_method_stub reported no change")
        if ensure_store_method_stub(root, backend_store_contract(root)):
            failures.append("the stub is not idempotent")

        rc2, out2, err2 = run(root)
        print(f"after : rc={rc2} out={out2.strip().splitlines()[:2]}")
        if rc2 != 0 or "Backend listening" not in out2:
            failures.append(f"still failing after the stub: {err2.strip()[:140]}")
        if "sign-in result: no-account" not in out2:
            failures.append("the stub did not return a falsy default for the finder")

        # The r80 Stage-3 shape: a route reads a *collection* that was never
        # seeded (`store.organizations.find(...)`) and answered 500. The stub has
        # to hand out an empty array, not a function.
        (root / "backend" / "src" / "index.js").write_text(
            "const store = require('./store');\n"
            "const found = store.organizations.find((entry) => entry.name === 'acme');\n"
            "console.log('collection lookup:', found);\n"
            "console.log('Backend listening (probe)');\n",
            encoding="utf-8",
        )
        rc3, out3, err3 = run(root)
        print(f"collection: rc={rc3} out={out3.strip().splitlines()[:1]}")
        if rc3 != 0 or "collection lookup: undefined" not in out3:
            failures.append(f"an unseeded collection still throws: {err3.strip()[:140]}")

        # A missing *writer* must not look like success, and a missing predicate
        # must fail closed rather than letting the negative scenarios through.
        (root / "backend" / "src" / "index.js").write_text(
            "const store = require('./store');\n"
            "try { store.createWidget('x'); console.log('writer did not throw'); }\n"
            "catch (error) { console.log('writer threw:', error.message); }\n"
            "console.log('predicate:', store.isTokenValid('t'));\n"
            "console.log('Backend listening (probe)');\n",
            encoding="utf-8",
        )
        rc4, out4, err4 = run(root)
        print(f"writer/predicate: rc={rc4} err={err4.strip().splitlines()[:1]}")
        if "missing writer `createWidget`" not in err4:
            failures.append("a missing writer was not reported loudly")
        if "writer threw: arc-store" not in out4:
            failures.append("a missing writer did not raise (a silent 2xx hid the lost write)")
        if "predicate: false" not in out4:
            failures.append("a missing predicate did not fail closed")
    finally:
        shutil.rmtree(root, ignore_errors=True)

    if failures:
        for item in failures:
            print(f"FAIL: {item}")
        return 1
    print("OK: an unfilled store method answers a benign default instead of throwing")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
