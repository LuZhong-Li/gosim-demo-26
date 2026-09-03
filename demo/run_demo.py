"""一键 demo：跑通完整管控链路并生成 trace.jsonl。

链路：创建成员 → 创建 PR → 权限拦截 → Rulesets 拦截 → 审批
→ 运行工作流 → 合并 PR → 人工干预 → 校验 trace。
"""

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
for path in (ROOT, SRC):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from typer import colors, style

from agent.mock_nl_parser import MockNlParser
from config import TRACE_OUTPUT_PATH
from demo.init_seed import create_seed_workbook
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.services.audit.trace import TraceWriter
from tools.check_trace import check_trace


def _ok(text: str) -> str:
    """绿色 [OK] 标记（仅控制台显示，不影响 trace 事件）。"""
    return style(f"[OK] {text}", fg=colors.GREEN)


def _expected(text: str) -> str:
    """黄色 [EXPECTED] 标记（预期内的拦截，非真实错误）。"""
    return style(f"[EXPECTED] {text}", fg=colors.YELLOW)


def _fail(text: str) -> str:
    """红色 [FAIL] 标记（校验失败，仅控制台显示）。"""
    return style(f"[FAIL] {text}", fg=colors.RED)


def main() -> None:
    trace_path = Path(TRACE_OUTPUT_PATH)
    trace_path.parent.mkdir(parents=True, exist_ok=True)
    if trace_path.exists():
        trace_path.unlink()

    workdir = Path(tempfile.mkdtemp(prefix="gx-demo-"))
    storage = create_seed_workbook(str(workdir / "demo.xlsx"))
    bus = ServiceBus(storage, trace_path=str(trace_path))

    print("== 1. 通过 Agent 创建只读成员 ==")
    agent = MockNlParser(bus, actor=1, trace_path=str(trace_path))
    print(agent.parse("添加成员 reader 为 readonly"))
    reader = next(member for member in bus.list_members() if member.name == "reader")

    print("== 2. 创建 PR ==")
    pr = bus.create_pr(subject_id=1, title="demo change")
    print(_ok(f"PR #{pr.id}: {pr.title}"))

    print("== 3. 权限拦截（readonly 创建 PR）==")
    try:
        bus.create_pr(subject_id=reader.id, title="hack")
    except GXError as exc:
        print(_expected(f"{exc.code} {exc.message}"))

    print("== 4. Rulesets 拦截（无审批合并）==")
    try:
        bus.merge_pr(subject_id=1, pr_id=pr.id)
    except GXError as exc:
        print(_expected(f"{exc.code} {exc.message}"))

    print("== 5. 审批 ==")
    bus.approve_pr(subject_id=1, pr_id=pr.id, approver="alice")
    print(_ok("approved by alice"))

    print("== 6. 运行工作流 ci-check ==")
    run = bus.run_workflow(subject_id=1, name="ci-check")
    print(_ok(run.status.value))

    print("== 7. 合并 PR ==")
    merged = bus.merge_pr(subject_id=1, pr_id=pr.id)
    print(_ok(merged.status.value))

    print("== 8. 人工干预留痕 ==")
    TraceWriter(str(trace_path)).log_human_intervene("人工确认最终提交")
    print(_ok("human_intervene"))

    print("== 9. 校验 trace ==")
    errors = check_trace(str(trace_path))
    if errors:
        for error in errors:
            print(_fail(error))
        raise SystemExit(1)
    print(_ok(f"trace 校验通过: {trace_path}"))


if __name__ == "__main__":
    main()
