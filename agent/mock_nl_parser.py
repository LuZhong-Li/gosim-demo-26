"""Mock Agent：把自然语言映射到核心门面调用。

只调用 core 门面（ServiceBus），不直接碰 storage/domain。
支持的指令清单见 agent/AGENTS.md。
"""

import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
for path in (ROOT, SRC):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from config import SEED_WORKBOOK_PATH, TRACE_OUTPUT_PATH
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.services.audit.trace import TraceWriter
from gx.storage.xlsx import LocalXlsxStorage


class MockNlParser:
    """基于字符串匹配的自然语言解析器（原型）。"""

    def __init__(
        self, bus: ServiceBus, actor: int = 1, trace_path: str | None = None
    ) -> None:
        self._bus = bus
        self._actor = actor
        self._trace = TraceWriter(trace_path) if trace_path else None

    def parse(self, text: str) -> str:
        text = text.strip()
        if not text:
            return "（空指令）"
        self._log_prompt(text)

        if self._match_list(text, "成员"):
            return self._format_members(self._bus.list_members())
        if self._match_list(text, "团队"):
            return self._format_teams(self._bus.list_teams())
        if self._match_list(text, "工作流"):
            return self._format_workflows(self._bus.list_workflows())
        if self._match_list(text, "pr"):
            return self._format_prs(self._bus.list_prs())

        match = re.match(
            r"(添加\s*成员|add\s+member)\s+(\S+)(?:\s+(?:为|as)\s+(\S+))?",
            text,
            re.IGNORECASE,
        )
        if match:
            name = match.group(2)
            role = match.group(3) or "member"
            self._log_tool_call("member_add", {"name": name, "role": role})
            member = self._bus.member_add(
                subject_id=self._actor, name=name, role=role
            )
            return f"[OK] 已添加成员 {member.name}（角色 {member.role.value}）"

        match = re.match(
            r"(创建\s*pr|create\s+pr)\s+(.+)", text, re.IGNORECASE
        )
        if match:
            self._log_tool_call("create_pr", {"title": match.group(2).strip()})
            pr = self._bus.create_pr(
                subject_id=self._actor, title=match.group(2).strip()
            )
            return f"[OK] 已创建 PR #{pr.id}: {pr.title}"

        match = re.match(
            r"(审批\s*pr|approve\s+pr)\s+(\d+)\s+(\S+)", text, re.IGNORECASE
        )
        if match:
            pr_id = int(match.group(2))
            approver = match.group(3)
            self._log_tool_call("approve_pr", {"pr_id": pr_id, "approver": approver})
            pr = self._bus.approve_pr(
                subject_id=self._actor, pr_id=pr_id, approver=approver
            )
            return f"[OK] PR #{pr.id} 已由 {approver} 审批"

        match = re.match(r"(合并\s*pr|merge\s+pr)\s+(\d+)", text, re.IGNORECASE)
        if match:
            pr_id = int(match.group(2))
            self._log_tool_call("merge_pr", {"pr_id": pr_id})
            pr = self._bus.merge_pr(
                subject_id=self._actor, pr_id=pr_id
            )
            return f"[OK] PR #{pr.id} 已合并（{pr.status.value}）"

        match = re.match(
            r"(运行\s*工作流|run\s+workflow)\s+(\S+)", text, re.IGNORECASE
        )
        if match:
            name = match.group(2)
            self._log_tool_call("run_workflow", {"name": name})
            run = self._bus.run_workflow(subject_id=self._actor, name=name)
            return f"[OK] 工作流 {name} 运行结果: {run.status.value}"

        raise ValueError(f"无法理解指令: {text}")

    def _log_prompt(self, text: str) -> None:
        if self._trace is None:
            return
        self._trace.append(
            timestamp=datetime.now(timezone.utc),
            type="prompt",
            actor=self._actor,
            action="prompt",
            resource="",
            detail=text,
            success=True,
            error_msg="",
        )

    def _log_tool_call(self, action: str, detail) -> None:
        if self._trace is None:
            return
        self._trace.append(
            timestamp=datetime.now(timezone.utc),
            type="tool_call",
            actor=self._actor,
            action=action,
            resource="workbook",
            detail=detail,
            success=True,
            error_msg="",
        )

    @staticmethod
    def _match_list(text: str, keyword: str) -> bool:
        has_list = any(key in text for key in ("列出", "列表", "list"))
        return has_list and keyword in text.lower()

    @staticmethod
    def _format_members(rows) -> str:
        if not rows:
            return "（暂无成员）"
        return "\n".join(f"{m.id}\t{m.name}\t{m.role.value}" for m in rows)

    @staticmethod
    def _format_teams(rows) -> str:
        if not rows:
            return "（暂无团队）"
        return "\n".join(f"{t.id}\t{t.name}\t{t.description}" for t in rows)

    @staticmethod
    def _format_workflows(rows) -> str:
        if not rows:
            return "（暂无工作流）"
        return "\n".join(f"{w.id}\t{w.name}\t{w.status.value}" for w in rows)

    @staticmethod
    def _format_prs(rows) -> str:
        if not rows:
            return "（暂无 PR）"
        return "\n".join(
            f"{p.id}\t{p.title}\t{p.author}\t{p.status.value}"
            f"\t{','.join(p.approvers) or '-'}"
            for p in rows
        )


def main(argv=None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description="GX-Sheet Mock Agent")
    parser.add_argument("text", help="自然语言指令")
    parser.add_argument("--workbook", default=SEED_WORKBOOK_PATH, help="工作簿路径")
    parser.add_argument("--actor", type=int, default=1, help="操作者成员ID")
    args = parser.parse_args(argv)

    bus = ServiceBus(LocalXlsxStorage(args.workbook))
    agent = MockNlParser(bus, actor=args.actor, trace_path=TRACE_OUTPUT_PATH)
    try:
        print(agent.parse(args.text))
    except (GXError, ValueError) as exc:
        print(f"[错误] {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
