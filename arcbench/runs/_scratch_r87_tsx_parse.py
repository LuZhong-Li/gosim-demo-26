"""Packaging gate: every template TSX/JSX file must parse.

A TSX syntax error is not a degraded score, it is a guaranteed zero: the
platform's `npm run build` fails, no dist is produced, and the suite never runs.
The cost of checking is one esbuild invocation per file.

esbuild is the right tool here because it is what Vite actually uses, and it
parses without needing the project's dependencies installed - this box has no
npm. A copy lives in the self-test working trees under
`frontend/node_modules/.pnpm/@esbuild+win32-x64@*/...`, so the gate also checks
that we can find one rather than silently passing.

This exists because r87's fix touched App.tsx and AuthPage.tsx by hand, and the
first attempt put a /* */ comment inside a JSX tag's attribute list - legal in
some parsers and not others. Parsing caught nothing that time, but a single
mistake in a hand-edited template would otherwise only surface as a zero.

Run: python arcbench/runs/_scratch_r87_tsx_parse.py
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / "agent" / "templates"
SUFFIXES = (".tsx", ".jsx", ".ts", ".js")

#: Where an esbuild binary may already be on disk (pnpm's store, inside a
#: self-test working tree). Newest first, so the most recent project wins.
SEARCH_ROOTS = (
    ROOT / "runs",
    ROOT / "reference",
)


def find_esbuild() -> Path | None:
    """An esbuild binary already on disk, newest project first."""
    patterns = ("**/node_modules/**/@esbuild/*/esbuild.exe", "**/@esbuild/*/esbuild.exe")
    for pattern in patterns:
        for root in SEARCH_ROOTS:
            if not root.is_dir():
                continue
            matches = sorted(root.glob(pattern))
            for candidate in reversed(matches):
                if candidate.is_file():
                    return candidate
    return None


def main() -> int:
    esbuild = find_esbuild()
    print(f"esbuild: {esbuild or 'NOT FOUND'}")
    if esbuild is None:
        print("RESULT: FAIL - no esbuild available to parse with")
        print("  (an unverified template is the risk this gate exists to remove)")
        return 1

    targets = [
        path for path in sorted(TEMPLATES.rglob("*"))
        if path.suffix in SUFFIXES and path.is_file()
        and "node_modules" not in path.parts
    ]
    print(f"files to parse: {len(targets)}")
    if not targets:
        print("RESULT: FAIL - no template sources found")
        return 1

    out = Path(tempfile.gettempdir()) / "arc-tsx-parse-check.js"
    failures: list[str] = []
    for path in targets:
        result = subprocess.run(
            [str(esbuild), str(path), f"--outfile={out}"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        if result.returncode != 0:
            first = (result.stderr or result.stdout or "").strip().splitlines()
            failures.append(f"{path.relative_to(TEMPLATES)}: {first[0] if first else 'parse failed'}")
        else:
            print(f"  OK   {path.relative_to(TEMPLATES)}")

    if failures:
        print("\nRESULT: FAIL")
        for line in failures:
            print(f"  - {line}")
        return 1
    print(f"\nRESULT: PASS - {len(targets)} template file(s) parse cleanly")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
