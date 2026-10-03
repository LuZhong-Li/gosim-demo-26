"""Summarise an official Playwright JSON report from a graded platform zip.

These reports are the only per-spec evidence we have. They live inside the run's
project zip at ``template/.arc/playwright-report.json`` - the handover originally
said they did not exist, which is why r79-r83 diagnosed the zeros from
pre-test state alone.

Usage:
    python arcbench/runs/_report_digest.py <playwright-report.json> [...]

Prints the summary line, the status split, and the distinct error fingerprints.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ANSI = re.compile(r"\x1b\[[0-9;]*m")


def walk(suites, out):
    for suite in suites or []:
        for spec in suite.get("specs") or []:
            for test in spec.get("tests") or []:
                for result in test.get("results") or []:
                    message = ""
                    error = result.get("error")
                    if error and error.get("message"):
                        message = error["message"]
                    else:
                        errors = result.get("errors") or []
                        if errors and errors[0].get("message"):
                            message = errors[0]["message"]
                    clean = ANSI.sub("", message.replace("\r", " ").replace("\n", " "))
                    out.append({
                        "spec": spec.get("title") or "",
                        "status": result.get("status") or "",
                        "error": clean.strip(),
                    })
        walk(suite.get("suites"), out)


def first_line(text: str, limit: int = 160) -> str:
    """The actionable part of a Playwright error, not the call log that follows."""
    text = text.strip()
    if not text:
        return ""
    for marker in ("Call log:", "- waiting for", "=========="):
        index = text.find(marker)
        if index > 0:
            text = text[:index]
    return text.strip()[:limit]


def fingerprint(text: str) -> str:
    return re.sub(r"\d+", "N", first_line(text))


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    for name in argv:
        path = Path(name)
        print("=" * 100)
        print(f"REPORT {path}")
        if not path.is_file():
            print("  <missing>")
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
        except (OSError, ValueError) as exc:
            print(f"  <unreadable: {exc}>")
            continue
        stats = data.get("stats") or {}
        config = data.get("config") or {}
        print(f"  expected={stats.get('expected')} unexpected={stats.get('unexpected')} "
              f"flaky={stats.get('flaky')} skipped={stats.get('skipped')} "
              f"duration={stats.get('duration')}")
        print(f"  testDir={config.get('testDir')} timeout={config.get('timeout')}")

        results: list[dict] = []
        walk(data.get("suites"), results)
        print(f"  results collected={len(results)}")
        for status, count in Counter(r["status"] for r in results).most_common():
            print(f"    {status:<10} {count}")

        print("  --- error fingerprints (most common first) ---")
        counts = Counter(fingerprint(r["error"]) for r in results if r["error"])
        for text, count in counts.most_common(15):
            print(f"    {count:>3}x  {text or '<no message>'}")

        print("  --- failing specs ---")
        for r in results:
            if r["status"] != "passed":
                print(f"    [{r['status']}] {r['spec'][:90]}")
                if r["error"]:
                    print(f"            {first_line(r['error'], 140)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
