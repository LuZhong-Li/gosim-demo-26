"""r87 probe step: pin down the `accounts.some is not a function` failure.

r85's platform log (the first round where the seeder actually ran) died on:

    [arc-seed] POST /auth/sign-up -> 500 | TypeError: accounts.some is not a function

That is a store-SHAPE failure, not an authentication one, so the fix has to know
which module holds `accounts` and what shape it has. This script reads a real
graded project and reports:

  * which store module each backend file requires (`./store` vs `./gh_store`),
  * every array-method call on a collection identifier,
  * the shape of each collection in the persisted data.json.

Run: python arcbench/runs/_scratch_r87_accounts_shape.py [project-template-dir]
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

DEFAULT = Path(r"C:\Users\HW\AppData\Local\Temp\arc-mine\a128c4309297-template\template")

REQUIRE_STORE = re.compile(r"""require\(\s*['"]\./([\w.-]*(?:store|Store)[\w.-]*)['"]\s*\)""")
ARRAY_CALL = re.compile(r"\b([A-Za-z_$][\w$]*)\.(some|find|filter|map|push|forEach|indexOf)\s*\(")
IDENT = re.compile(r"\b(accounts?|users?|repos(?:itories)?|orgs?|organizations?|teams?|memberships?|"
                   r"branches?|commits?|issues?|pull_requests?|pullRequests?|sessions?)\b")
ARRAY_METHODS = {"some", "find", "filter", "map", "push", "forEach", "indexOf"}


def main(argv: list[str]) -> int:
    project = Path(argv[0]) if argv else DEFAULT
    src = project / "backend" / "src"
    if not src.is_dir():
        print(f"SKIP: {src} is not a directory")
        return 0

    print("=== which store module does each file require? ===")
    users: dict[str, list[str]] = {}
    for path in sorted(src.glob("*.js")):
        text = path.read_text(encoding="utf-8", errors="replace")
        hits = sorted(set(REQUIRE_STORE.findall(text)))
        if hits:
            users[path.name] = hits
            print(f"  {path.name:<26} -> {', '.join(hits)}")
    if not users:
        print("  (none)")

    print("\n=== array-method calls on collection-ish identifiers ===")
    found: Counter[tuple[str, str]] = Counter()
    for path in sorted(src.glob("*.js")):
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in ARRAY_CALL.finditer(text):
            name, method = match.group(1), match.group(2)
            if method not in ARRAY_METHODS:
                continue
            if not IDENT.search(name):
                continue
            line = text[: match.start()].count("\n") + 1
            found[(f"{path.name}:{line}", f"{name}.{method}")] += 1
    for (where, what), count in sorted(found.items()):
        print(f"  {where:<34} {what}   x{count}")
    if not found:
        print("  (none)")

    print("\n=== persisted collection shapes (data.json) ===")
    data_file = src / "data.json"
    if not data_file.is_file():
        print("  no data.json in the delivered project")
        return 0
    data = json.loads(data_file.read_text(encoding="utf-8", errors="replace"))
    for key, value in data.items():
        kind = type(value).__name__
        note = ""
        if isinstance(value, dict):
            sample = next(iter(value.values()), None)
            note = f" first={json.dumps(sample, ensure_ascii=False)[:80]}"
        print(f"  {key:<18} {kind:<6} n={len(value):<4}{note}")
    print("\n  a keyed DICT where the scaffold's gh_store.js calls .find()/.push() is the")
    print("  shape mismatch that aborts the seed partway (r85: 'accounts.some is not a")
    print("  function' at POST /auth/sign-up).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
