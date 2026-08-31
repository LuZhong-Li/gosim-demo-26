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

from config import TRACE_OUTPUT_PATH
from agent.mock_nl_parser import MockNlParser
from demo.init_seed import create_seed_workbook
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.services.audit.trace import TraceWriter
from tools.check_trace import check_trace


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
    print(f"[OK] PR #{pr.id}: {pr.title}")

    print("== 3. 权限拦截（readonly 创建 PR）==")
    try:
        bus.create_pr(subject_id=reader.id, title="hack")
    except GXError as exc:
        print(f"[EXPECTED] {exc.code} {exc.message}")

    print("== 4. Rulesets 拦截（无审批合并）==")
    try:
        bus.merge_pr(subject_id=1, pr_id=pr.id)
    except GXError as exc:
        print(f"[EXPECTED] {exc.code} {exc.message}")

    print("== 5. 审批 ==")
    bus.approve_pr(subject_id=1, pr_id=pr.id, approver="alice")
    print("[OK] approved by alice")

    print("== 6. 运行工作流 ci-check ==")
    run = bus.run_workflow(subject_id=1, name="ci-check")
    print(f"[OK] {run.status.value}")

    print("== 7. 合并 PR ==")
    merged = bus.merge_pr(subject_id=1, pr_id=pr.id)
    print(f"[OK] {merged.status.value}")

    print("== 8. 人工干预留痕 ==")
    TraceWriter(str(trace_path)).log_human_intervene("人工确认最终提交")
    print("[OK] human_intervene")

    print("== 9. 校验 trace ==")
    errors = check_trace(str(trace_path))
    if errors:
        for error in errors:
            print(f"[FAIL] {error}")
        raise SystemExit(1)
    print(f"[OK] trace 校验通过: {trace_path}")


if __name__ == "__main__":
    main()
