"""r87 probe: one collection, three incompatible shapes - and the fix.

Evidence (r85 platform log - the first round where the injected world seeder ran):

    [arc-seed] POST /auth/sign-up -> 500 | TypeError: accounts.some is not a function

Pinned to the source in a real graded project (a128c4309297):

    auth.js:35     const accounts = store.collection('accounts', {});
    auth.js:36     if (accounts.some(...))            <- expects an ARRAY
    auth.js:42     accounts[username] = {...}         <- expects a KEYED DICT
    issues.js:13   const accounts = store.collection('accounts', { users: [] });
    issues.js:14   accounts.users.find(...)           <- expects a nested ARRAY
    gh_store.js    state.users.find(...) / .push(...)  <- ARRAY, different module

So whichever shape `collection()` returns, one caller throws and the seed dies on
its first write: the world stops halfway, which is also why the r72 project's
persisted data.json holds acme-docs but not frontend-team / secret-research /
Acme Demo.

before: `collection('accounts')` -> dict; `.some()` throws; `.users.find()` throws
after : both work against the same object, and a write through one is visible
        through the other

Run: python arcbench/runs/_scratch_r87_collection_shape.py
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent"))

from guard import ARC_COLLECTION_SHAPE_GUARD, ensure_collection_shape  # noqa: E402

#: A store in the shape the generator produced: a keyed dict of accounts, reached
#: through a `collection()` accessor. Both caller styles are exercised.
STORE_JS = """
const state = { accounts: {} };

function collection(name, initial) {
  if (state[name] === undefined || state[name] === null) {
    state[name] = initial === undefined ? {} : initial;
  }
  return state[name];
}

module.exports = { state, collection };
"""

#: auth.js's style: `.some()` on the collection, then a keyed write.
AUTH_PROBE = """
const store = require('./store');
const accounts = store.collection('accounts', {});
const exists = accounts.some((a) => a && a.username === 'alice-dev');
accounts['alice-dev'] = { id: 'alice-dev', username: 'alice-dev' };
console.log(JSON.stringify({ exists, stored: Object.keys(accounts).length,
  found: Object.values(accounts).find((a) => a.username === 'alice-dev') ? 'yes' : 'no' }));
"""

#: issues.js's style: a nested array reached off the same collection.
NESTED_PROBE = """
const store = require('./store');
const accounts = store.collection('accounts', { users: [] });
const found = accounts.users.find((u) => u.id === 'u_org-owner');
console.log(JSON.stringify({ nested: found ? found.id : null, len: accounts.length }));
"""


def run_case(tmp: Path, store_body: str, name: str, probe_body: str) -> tuple[int, str]:
    case = tmp / name
    (case / "src").mkdir(parents=True, exist_ok=True)
    (case / "src" / "store.js").write_text(store_body, encoding="utf-8")
    (case / "src" / "probe.js").write_text(probe_body, encoding="utf-8")
    result = subprocess.run(
        ["node", "src/probe.js"], cwd=case, capture_output=True,
        text=True, encoding="utf-8", errors="replace", timeout=60,
    )
    return result.returncode, ((result.stdout or "") + (result.stderr or "")).strip()


def main() -> int:
    failures: list[str] = []
    tmp = Path(tempfile.mkdtemp(prefix="arc-r87-shape-"))
    try:
        # ---------------------------------------------------------------- 1
        # BEFORE: the two ways this mismatch actually throws in the graded project.
        #   auth style   -> TypeError: accounts.some is not a function      (r85 log)
        #   nested style -> TypeError: Cannot read properties of undefined (reading 'find')
        #                  because a dict has no `.users` for the caller to reach.
        for probe_name, probe in (("auth", AUTH_PROBE), ("nested", NESTED_PROBE)):
            rc, out = run_case(tmp, STORE_JS, f"before_{probe_name}", probe)
            print(f"[before/{probe_name}] rc={rc}: {out.splitlines()[0][:110]}")
            if rc == 0:
                failures.append(f"the {probe_name} fixture did not reproduce a failure - "
                                f"the probe proves nothing")
            elif "TypeError" not in out:
                failures.append(f"{probe_name}: expected a TypeError, got {out.splitlines()[0][:120]}")
            else:
                marker = "is not a function" if probe_name == "auth" else "reading 'find'"
                if marker not in out:
                    failures.append(f"{probe_name}: expected {marker!r} in the error, "
                                    f"got {out[:200]}")
        print("[before] reproduced: a collection used as both a dict and an array throws")

        # ---------------------------------------------------------------- 2
        # AFTER: the guard is installed by the real function, then both callers work.
        project = tmp / "project"
        (project / "backend" / "src").mkdir(parents=True, exist_ok=True)
        (project / "backend" / "src" / "store.js").write_text(STORE_JS, encoding="utf-8")
        changed = ensure_collection_shape(project)
        print(f"[guard] -> {changed}")
        if not changed:
            failures.append("the guard did not touch a store module that defines collection()")
        guarded = (project / "backend" / "src" / "store.js").read_text(encoding="utf-8")
        if "__arcShapeGuarded" not in guarded:
            failures.append("the guard marker is missing from the rewritten store")

        for probe_name, probe in (("auth", AUTH_PROBE), ("nested", NESTED_PROBE)):
            rc, out = run_case(tmp, guarded, f"after_{probe_name}", probe)
            print(f"[after/{probe_name}]  rc={rc}: {out.splitlines()[0][:110] if out else ''}")
            if rc != 0:
                failures.append(f"{probe_name} still throws after the guard: {out[:200]}")
            elif "TypeError" in out:
                failures.append(f"{probe_name} still reports a TypeError: {out[:200]}")

        # ---------------------------------------------------------------- 3
        # The auth probe's own assertions: the keyed write stays visible to the
        # array-style read of the same object (the world must be readable both ways).
        rc, out = run_case(tmp, guarded, "after_auth_assert", AUTH_PROBE)
        try:
            payload = json.loads(out.splitlines()[-1])
        except (ValueError, IndexError):
            failures.append(f"could not parse the auth probe output: {out[:200]}")
        else:
            if payload.get("stored") != 1:
                failures.append(f"a keyed write was not visible: {payload}")
            if payload.get("found") != "yes":
                failures.append(f"an array-style read did not see the keyed write: {payload}")

        # ---------------------------------------------------------------- 4
        # Idempotence and a safety property: a store whose collection() is absent
        # must not be touched, and an unrelated export must be preserved.
        again = ensure_collection_shape(project)
        print(f"[idem]  second run -> {again or 'no-op'}")
        if again:
            failures.append("the guard is not idempotent")
        if "module.exports = { state, collection }" not in guarded:
            failures.append("the original export surface was disturbed")

        untouched = tmp / "other"
        (untouched / "backend" / "src").mkdir(parents=True, exist_ok=True)
        (untouched / "backend" / "src" / "helper.js").write_text(
            "module.exports = { add: (a, b) => a + b };\n", encoding="utf-8")
        result = ensure_collection_shape(untouched)
        print(f"[scope] store with no collection() -> {result or 'untouched (correct)'}")
        if result:
            failures.append("the guard modified a module that has no collection()")

        # ---------------------------------------------------------------- 5
        # Sanity: the guard text is what the assertions above exercised.
        if "__arcArrayView" not in ARC_COLLECTION_SHAPE_GUARD:
            failures.append("the injected guard text lost its array view")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if failures:
        print("\nRESULT: FAIL")
        for line in failures:
            print(f"  - {line}")
        return 1
    print("\nRESULT: PASS - the accounts.some failure is reproduced and fixed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
