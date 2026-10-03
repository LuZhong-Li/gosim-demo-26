"""r87 probe: exactly one navigable "Sign in" control per screen.

Evidence (self-test run 2, 94b0b227, package selftest-r87-B3-193123.zip):

    REQ-1-1-1 S1  locator.click: Error: strict mode violation:
                  getByRole('link', {name:'Sign in', exact:true}) resolved to 2 elements
    REQ-1-3   S1  expect(locator).toHaveCount(1) failed - Expected: 1, Received: 2
    REQ-2-3   S1  same

Sampled across three requirement groups, one cause: after the entry was restored
the shell header AND pages/HomePage.tsx both rendered

    <Link to="/auth?mode=signin">Sign in</Link>

and "/" mounts HomePage, so the page carried two. All 30 Stage-1 specs died on it
before sign-in, which is why nothing behind it (the world / data layer) is
observable in that run at all.

before: 2 matching links; then either a strict-mode violation or Received: 2
after : 1 matching link, the sentence still renders, and the build still resolves

Run: python arcbench/runs/_scratch_r87_signin_unique.py
"""

from __future__ import annotations

import re
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent"))

from guard import SIGNIN_LINK_JSX, ensure_single_signin_link  # noqa: E402

TEMPLATE = ROOT / "agent" / "templates" / "scaffold"

#: The exact duplicate, in the shape HomePage.tsx had before this round.
HOME_WITH_DUPLICATE = """import { Link } from 'react-router-dom';

export default function HomePage({ user }: { user: { username: string } | null }) {
  return (
    <section className="panel">
      <h1>Welcome to GitHub Clone</h1>
      <p>
        {user
          ? `Signed in as ${user.username}.`
          : 'A simplified collaboration platform. Sign in or create an account to get started.'}
      </p>
      {!user && (
        <p>
          <Link to="/auth?mode=signin">Sign in</Link> ·{' '}
          <Link to="/auth?mode=signup">Create an account</Link>
        </p>
      )}
    </section>
  );
}
"""

#: A sign-in link that points somewhere else: NOT the duplicate, must be kept.
OTHER_TARGET = """import { Link } from 'react-router-dom';

export default function HelpPage() {
  return (
    <p>
      <Link to="/help/sign-in-guide">Sign in</Link>
    </p>
  );
}
"""


def count_links(text: str) -> int:
    return len(SIGNIN_LINK_JSX.findall(text))


def build(tmp: Path, name: str, pages: dict[str, str]) -> Path:
    project = tmp / name
    (project / "frontend" / "src" / "pages").mkdir(parents=True, exist_ok=True)
    (project / "frontend" / "src" / "App.tsx").write_text(
        'import { Link } from "react-router-dom";\n'
        'export default function App() { return <Link to="/auth?mode=signin">Sign in</Link>; }\n',
        encoding="utf-8",
    )
    for filename, body in pages.items():
        (project / "frontend" / "src" / "pages" / filename).write_text(body, encoding="utf-8")
    return project


def main() -> int:
    failures: list[str] = []
    tmp = Path(tempfile.mkdtemp(prefix="arc-r87-signin-"))
    try:
        # ---------------------------------------------------------------- 1
        # BEFORE: the page carries two matching links, which is what killed all
        # 30 specs.
        project = build(tmp, "before", {"HomePage.tsx": HOME_WITH_DUPLICATE})
        home = project / "frontend" / "src" / "pages" / "HomePage.tsx"
        if count_links(home.read_text(encoding="utf-8")) != 1:
            failures.append("the duplicate fixture does not contain exactly one link")
        print("[before] HomePage links=1, and the shell header adds a second -> 2 on '/'")

        # ---------------------------------------------------------------- 2
        # AFTER: the guard demotes the page's copy; the shell keeps its own. So the
        # page-level count is 0 extra and the total on screen is 1.
        changed = ensure_single_signin_link(project)
        print(f"[after]  guard -> {changed}")
        if not changed:
            failures.append("the guard did not demote the duplicate")
        body = home.read_text(encoding="utf-8")
        if count_links(body) != 0:
            failures.append(f"the duplicate link survived: {count_links(body)} still present")
        if "Sign in or" not in body:
            failures.append("the sentence lost its words when the link was demoted")
        if 'to="/auth?mode=signup"' not in body:
            failures.append("the unique 'Create an account' link was removed too")
        # The imports must still make sense: Link is still used by the signup link.
        if "import { Link }" not in body:
            failures.append("the Link import was dropped while a Link is still used")

        # ---------------------------------------------------------------- 3
        # The shell is exempt: its header IS the one navigable entry.
        app = project / "frontend" / "src" / "App.tsx"
        if count_links(app.read_text(encoding="utf-8")) != 1:
            failures.append("the guard rewrote the shell entry, which must keep its header link")

        # ---------------------------------------------------------------- 4
        # A sign-in label pointing elsewhere is not the duplicate.
        project2 = build(tmp, "other", {"HelpPage.tsx": OTHER_TARGET})
        result = ensure_single_signin_link(project2)
        kept = project2 / "frontend" / "src" / "pages" / "HelpPage.tsx"
        print(f"[scope]  other target -> {result or 'kept (correct)'}")
        if result:
            failures.append("the guard rewrote a sign-in link that points elsewhere")
        if count_links(kept.read_text(encoding="utf-8")) != 1:
            failures.append("a legitimate link was removed")

        # ---------------------------------------------------------------- 5
        # Idempotence.
        again = ensure_single_signin_link(project)
        print(f"[idem]   second run -> {again or 'no-op'}")
        if again:
            failures.append("the guard is not idempotent")

        # ---------------------------------------------------------------- 6
        # The shipped scaffold itself must already satisfy the rule, because the
        # entry restore puts these pages back on every run.
        shipped = (TEMPLATE / "frontend" / "src" / "pages" / "HomePage.tsx").read_text(encoding="utf-8")
        if count_links(shipped):
            failures.append("the scaffold HomePage still renders a sign-in LINK "
                            f"({count_links(shipped)}) - the restore would reinstate the bug")
        if "Create an account" not in shipped:
            failures.append("the scaffold HomePage lost its Create an account link")
        print(f"[scaffold] HomePage sign-in links={count_links(shipped)} (must be 0)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if failures:
        print("\nRESULT: FAIL")
        for line in failures:
            print(f"  - {line}")
        return 1
    print("\nRESULT: PASS - exactly one navigable sign-in link per screen")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
