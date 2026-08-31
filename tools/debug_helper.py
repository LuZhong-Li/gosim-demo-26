"""调试辅助：打印指定工作表内容，或打印审计最新记录。

用法：
    python tools/debug_helper.py demo/seed-workbook.xlsx members
    python tools/debug_helper.py demo/seed-workbook.xlsx audit_log --latest 5

对应 docs/plans/05-排期与工程化保障.md 7.2。
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
for path in (ROOT, SRC):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from constants import AUDIT_LOG, SHEET_NAMES
from gx.storage.xlsx import LocalXlsxStorage


def main() -> None:
    parser = argparse.ArgumentParser(description="GX-Sheet 调试数据快照")
    parser.add_argument("workbook", help="工作簿路径")
    parser.add_argument("sheet", help="工作表名")
    parser.add_argument(
        "--latest", type=int, default=10, help="audit_log 显示最新条数（默认 10）"
    )
    args = parser.parse_args()

    if args.sheet not in SHEET_NAMES:
        print(
            f"[FAIL] 未知工作表: {args.sheet}，可选: {', '.join(SHEET_NAMES)}",
            file=sys.stderr,
        )
        raise SystemExit(1)

    storage = LocalXlsxStorage(args.workbook)
    rows = storage.get_sheet(args.sheet)
    if args.sheet == AUDIT_LOG:
        rows = rows[-args.latest :]

    for row in rows:
        print(row)
    print(f"（共 {len(rows)} 行）")


if __name__ == "__main__":
    main()
