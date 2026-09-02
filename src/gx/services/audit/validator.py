"""Trace 文件校验规则（单一事实源）。

规则与字段定义集中在本模块，供 gx.api.cli 的 trace 命令与 tools/check_trace.py
共用，避免两处维护导致 schema 漂移。schema 规则与评审要求保持一致：
8 个必填字段、5 种 type、human_intervene 强制校验。
参见 docs/plans/10-评审优化第一轮.md 6.2。
"""

import json
from pathlib import Path
from typing import Any

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


def parse_trace(path: str) -> list[dict[str, Any]]:
    """把文件中的非空行解析为 JSON 对象；非法行跳过（合法性由 check_trace 校验）。"""
    parsed: list[dict[str, Any]] = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            parsed.append(obj)
    return parsed


def count_by_type(objs: list[dict[str, Any]]) -> dict[str, int]:
    """按 trace type 统计事件条数。"""
    counts: dict[str, int] = {}
    for obj in objs:
        type_name = obj.get("type")
        if type_name:
            counts[type_name] = counts.get(type_name, 0) + 1
    return counts
