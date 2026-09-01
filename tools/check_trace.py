"""校验 trace.jsonl：每行合法 JSON、必填字段齐全、类型合法。

用法：
    python tools/check_trace.py [trace路径]
"""

import json
import sys
from pathlib import Path

REQUIRED_FIELDS = [
    "timestamp",
    "type",
    "actor",
    "action",
    "resource",
    "detail",
    "success",
    "error_msg",
]
VALID_TYPES = {
    "prompt",
    "api_call",
    "tool_call",
    "workflow_run",
    "human_intervene",
}

# 单次 demo（run_demo.py）约产生 10 条事件；行数超过该阈值视为可能残留历史事件。
# 仅输出警告，不影响校验结果。
HISTORICAL_RESIDUE_WARN_THRESHOLD = 20

# trace 未含“来源”字段，无法精确区分 CLI 与脚本；按 type 给出来源提示供排查参考。
TYPE_SOURCE_HINT = {
    "prompt": "Mock Agent/脚本",
    "tool_call": "Mock Agent/脚本",
    "human_intervene": "演示脚本",
    "api_call": "CLI 与脚本共用（trace 无来源字段，无法精确区分）",
    "workflow_run": "CLI 与脚本共用（trace 无来源字段，无法精确区分）",
}


def check_trace(path: str) -> list[str]:
    """返回错误列表；空列表表示校验通过。"""
    errors: list[str] = []
    trace_path = Path(path)
    if not trace_path.is_file():
        return [f"trace 文件不存在: {path}"]
    lines = trace_path.read_text(encoding="utf-8").splitlines()
    if not lines:
        return ["trace 文件为空"]
    for index, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            errors.append(f"第 {index} 行不是合法 JSON")
            continue
        if not isinstance(obj, dict):
            errors.append(f"第 {index} 行不是 JSON 对象")
            continue
        missing = [field for field in REQUIRED_FIELDS if field not in obj]
        if missing:
            errors.append(f"第 {index} 行缺少字段: {', '.join(missing)}")
        if obj.get("type") not in VALID_TYPES:
            errors.append(f"第 {index} 行 type 非法: {obj.get('type')}")
    types_present = set()
    for line in lines:
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and obj.get("type"):
            types_present.add(obj.get("type"))
    if "human_intervene" not in types_present:
        errors.append("缺少 human_intervene 人工干预记录")
    return errors


def _parse_lines(lines: list[str]) -> list[dict]:
    """把非空行解析为 JSON 对象；非法行跳过（合法性由 check_trace 校验）。"""
    parsed: list[dict] = []
    for line in lines:
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            parsed.append(obj)
    return parsed


def _count_by_type(objs: list[dict]) -> dict[str, int]:
    """按 trace type 统计事件条数。"""
    counts: dict[str, int] = {}
    for obj in objs:
        type_name = obj.get("type")
        if type_name:
            counts[type_name] = counts.get(type_name, 0) + 1
    return counts


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else "demo/output/trace.jsonl"
    errors = check_trace(path)
    if errors:
        for error in errors:
            print(f"[FAIL] {error}")
        raise SystemExit(1)
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    objs = _parse_lines(lines)
    total = len(objs)
    print(f"[OK] {path}: 校验通过（共 {total} 条事件）")
    counts = _count_by_type(objs)
    if counts:
        breakdown = ", ".join(
            f"{name}={count}" for name, count in sorted(counts.items())
        )
        print(f"[INFO] 事件构成: {breakdown}")
    hints = [
        f"{name}={TYPE_SOURCE_HINT[name]}"
        for name in sorted(TYPE_SOURCE_HINT)
        if name in counts
    ]
    if hints:
        print("[INFO] 来源提示: " + "；".join(hints))
    if total >= HISTORICAL_RESIDUE_WARN_THRESHOLD:
        print("[WARN] 检测 trace 存在历史残留事件，请执行 init_seed 重置")


if __name__ == "__main__":
    main()
