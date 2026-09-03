"""校验 trace.jsonl：每行合法 JSON、必填字段齐全、类型合法。

校验规则与实现集中在 gx.services.audit.validator（单一事实源），本文件仅保留
命令行入口与汇总输出，schema 规则不变。

用法：
    python tools/check_trace.py [trace路径]
"""

import sys

from gx.services.audit.validator import (
    HISTORICAL_RESIDUE_WARN_THRESHOLD,
    TYPE_SOURCE_HINT,
    check_trace,
    count_by_type,
    parse_trace,
)


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else "demo/output/trace.jsonl"
    errors = check_trace(path)
    if errors:
        for error in errors:
            print(f"[FAIL] {error}")
        raise SystemExit(1)
    objs = parse_trace(path)
    total = len(objs)
    print(f"[OK] {path}: 校验通过（共 {total} 条事件）")
    counts = count_by_type(objs)
    if counts:
        breakdown = ", ".join(f"{name}={count}" for name, count in sorted(counts.items()))
        print(f"[INFO] 事件构成: {breakdown}")
    hints = [
        f"{name}={TYPE_SOURCE_HINT[name]}" for name in sorted(TYPE_SOURCE_HINT) if name in counts
    ]
    if hints:
        print("[INFO] 来源提示: " + "；".join(hints))
    if total >= HISTORICAL_RESIDUE_WARN_THRESHOLD:
        print("[WARN] 检测 trace 存在历史残留事件，请执行 init_seed 重置")


if __name__ == "__main__":
    main()
