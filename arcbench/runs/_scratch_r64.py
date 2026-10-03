"""Check ensure_app_router against the real r62 Stage-1 product (kept, not deleted)."""

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(r"D:\gosim-demo-26\arcbench\agent")))
from guard import ensure_app_router  # noqa: E402

source = Path(r"D:\gosim-demo-26\arcbench\runs\selftest-r62-stage1\template")
target = Path(r"D:\gosim-demo-26\arcbench\runs\_scratch_app_r64")
if target.exists():
    print("scratch already exists, reusing")
else:
    shutil.copytree(source, target)

changed = ensure_app_router(target)
app = (target / "frontend" / "src" / "App.tsx").read_text(encoding="utf-8")
main = (target / "frontend" / "src" / "main.tsx").read_text(encoding="utf-8")

checks = [
    ("App.tsx rewritten", bool(changed), str(changed)[:120]),
    ("App imports pages", app.count("from './pages/") >= 20, "imports=" + str(app.count("from './pages/"))),
    ("App renders Routes", "<Routes>" in app and "<Route path=" in app, ""),
    ("App has nav links", "<Link to=" in app, ""),
    ("main has BrowserRouter", "BrowserRouter" in main, main.splitlines()[0][:60]),
]
ok = True
for label, passed, detail in checks:
    print(("PASS  " if passed else "FAIL  ") + label + ("  " + detail if detail else ""))
    ok = ok and passed
print()
print("ALL PASS" if ok else "SOME FAILED")
