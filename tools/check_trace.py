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


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else "demo/output/trace.jsonl"
    errors = check_trace(path)
    if errors:
        for error in errors:
            print(f"[FAIL] {error}")
        raise SystemExit(1)
    print(f"[OK] {path}: 校验通过（{len(Path(path).read_text(encoding='utf-8').splitlines())} 行）")


if __name__ == "__main__":
    main()
