"""Role-contract check: two synthetic front ends (kept on purpose, not deleted)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(r"D:\gosim-demo-26\arcbench\agent")))
from guard import accessibility_contract_issues  # noqa: E402

BUTTON_APP = """
export default function Home() {
  return <header><button onClick={go}>Sign in</button></header>;
}
"""
LINK_APP = """
export default function Home() {
  return <header><Link to="/login">Login</Link>
    <Link to="/signout">Sign out</Link></header>;
}
"""


def check(label, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + label + ("  " + detail if detail else ""))
    return bool(ok)


results = []
for name, body, expect_issue in (("button-login", BUTTON_APP, True), ("link-login", LINK_APP, False)):
    root = Path(r"D:\gosim-demo-26\arcbench\runs") / ("_scratch_app_" + name)
    (root / "frontend" / "src").mkdir(parents=True, exist_ok=True)
    (root / "frontend" / "src" / "Home.tsx").write_text(body, encoding="utf-8")
    issues = accessibility_contract_issues(root)
    results.append(check(name, bool(issues) is expect_issue, str(issues)[:150]))

print()
print(str(sum(results)) + "/" + str(len(results)) + " checks passed")
