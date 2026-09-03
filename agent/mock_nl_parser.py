"""Mock Agent：把自然语言映射到核心门面调用。

只调用 core 门面（ServiceBus），不直接碰 storage/domain。
支持的指令清单见 agent/AGENTS.md。
"""

import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
for path in (ROOT, SRC):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from agent.runtime import StepResult, TurnResult
from config import SEED_WORKBOOK_PATH, TRACE_OUTPUT_PATH
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.llm.adapter import LLMAdapter
from gx.services.audit.trace import TraceWriter
from gx.storage.xlsx import LocalXlsxStorage


class MockNlParser:
    """基于字符串匹配的自然语言解析器（原型）。"""

    def __init__(
        self,
        bus: ServiceBus | None = None,
        actor: int = 1,
        trace_path: str | None = None,
        llm: LLMAdapter | None = None,
        request_id_enabled: bool = False,
    ) -> None:
        self._bus = bus
        self._actor = actor
        self._trace = TraceWriter(trace_path) if trace_path else None
        self._llm = llm
        self._request_id_enabled = request_id_enabled

    def parse(self, text: str) -> str:
        return self.parse_turn(text).response

    def parse_turn(self, text: str) -> TurnResult:
        text = text.strip()
        if not text:
            return TurnResult(instruction=text, response="（空指令）")
        request_id = uuid4().hex[:12] if self._request_id_enabled else None
        self._log_prompt(text, request_id)
        turn = TurnResult(instruction=text)
        turn.steps.append(StepResult(kind="intent"))

        if self._match_list(text, "成员"):
            result = self._format_members(self._bus.list_members())
            turn.steps.extend(
                [
                    StepResult(kind="result", name="list_members", output=result),
                    StepResult(kind="stop", output=result),
                ]
            )
            turn.response = result
            return turn
        if self._match_list(text, "团队"):
            result = self._format_teams(self._bus.list_teams())
            turn.steps.extend(
                [
                    StepResult(kind="result", name="list_teams", output=result),
                    StepResult(kind="stop", output=result),
                ]
            )
            turn.response = result
            return turn
        if self._match_list(text, "工作流"):
            result = self._format_workflows(self._bus.list_workflows())
            turn.steps.extend(
                [
                    StepResult(kind="result", name="list_workflows", output=result),
                    StepResult(kind="stop", output=result),
                ]
            )
            turn.response = result
            return turn
        if self._match_list(text, "pr"):
            result = self._format_prs(self._bus.list_prs())
            turn.steps.extend(
                [
                    StepResult(kind="result", name="list_prs", output=result),
                    StepResult(kind="stop", output=result),
                ]
            )
            turn.response = result
            return turn

        match = re.match(
            r"(添加\s*成员|add\s+member)\s+(\S+)(?:\s+(?:为|as)\s+(\S+))?",
            text,
            re.IGNORECASE,
        )
        if match:
            name = match.group(2)
            role = match.group(3) or "member"
            params = {"name": name, "role": role}
            turn.steps.append(StepResult(kind="tool_call", name="member_add", params=params))
            self._log_tool_call("member_add", params, request_id)
            member = self._bus.member_add(subject_id=self._actor, name=name, role=role)
            response = f"[OK] 已添加成员 {member.name}（角色 {member.role.value}）"
            turn.steps.extend(
                [
                    StepResult(kind="result", name="member_add", params=params, output=response),
                    StepResult(kind="stop", output=response),
                ]
            )
            turn.response = response
            return turn

        match = re.match(r"(创建\s*pr|create\s+pr)\s+(.+)", text, re.IGNORECASE)
        if match:
            title = match.group(2).strip()
            params = {"title": title}
            turn.steps.append(StepResult(kind="tool_call", name="create_pr", params=params))
            self._log_tool_call("create_pr", params, request_id)
            pr = self._bus.create_pr(subject_id=self._actor, title=title)
            response = f"[OK] 已创建 PR #{pr.id}: {pr.title}"
            turn.steps.extend(
                [
                    StepResult(kind="result", name="create_pr", params=params, output=response),
                    StepResult(kind="stop", output=response),
                ]
            )
            turn.response = response
            return turn

        match = re.match(r"(审批\s*pr|approve\s+pr)\s+(\d+)\s+(\S+)", text, re.IGNORECASE)
        if match:
            pr_id = int(match.group(2))
            approver = match.group(3)
            params = {"pr_id": pr_id, "approver": approver}
            turn.steps.append(StepResult(kind="tool_call", name="approve_pr", params=params))
            self._log_tool_call("approve_pr", params, request_id)
            pr = self._bus.approve_pr(subject_id=self._actor, pr_id=pr_id, approver=approver)
            response = f"[OK] PR #{pr.id} 已由 {approver} 审批"
            turn.steps.extend(
                [
                    StepResult(kind="result", name="approve_pr", params=params, output=response),
                    StepResult(kind="stop", output=response),
                ]
            )
            turn.response = response
            return turn

        match = re.match(r"(合并\s*pr|merge\s+pr)\s+(\d+)", text, re.IGNORECASE)
        if match:
            pr_id = int(match.group(2))
            params = {"pr_id": pr_id}
            turn.steps.append(StepResult(kind="tool_call", name="merge_pr", params=params))
            self._log_tool_call("merge_pr", params, request_id)
            pr = self._bus.merge_pr(subject_id=self._actor, pr_id=pr_id)
            response = f"[OK] PR #{pr.id} 已合并（{pr.status.value}）"
            turn.steps.extend(
                [
                    StepResult(kind="result", name="merge_pr", params=params, output=response),
                    StepResult(kind="stop", output=response),
                ]
            )
            turn.response = response
            return turn

        match = re.match(r"(运行\s*工作流|run\s+workflow)\s+(\S+)", text, re.IGNORECASE)
        if match:
            name = match.group(2)
            params = {"name": name}
            turn.steps.append(StepResult(kind="tool_call", name="run_workflow", params=params))
            self._log_tool_call("run_workflow", params, request_id)
            run = self._bus.run_workflow(subject_id=self._actor, name=name)
            response = f"[OK] 工作流 {name} 运行结果: {run.status.value}"
            turn.steps.extend(
                [
                    StepResult(kind="result", name="run_workflow", params=params, output=response),
                    StepResult(kind="stop", output=response),
                ]
            )
            turn.response = response
            return turn

        raise ValueError(f"无法理解指令: {text}")

    async def parse_llm(self, text: str) -> TurnResult:
        """使用可选 LLM 适配器处理指令；未配置适配器时抛出 RuntimeError。"""
        if self._llm is None:
            raise RuntimeError("未配置 LLM 适配器")
        response = await self._llm.chat([{"role": "user", "content": text}])
        content = response.get("content", "")
        turn = TurnResult(instruction=text, response=content)
        turn.steps.extend(
            [
                StepResult(kind="intent"),
                StepResult(kind="result", name="llm", output=content),
                StepResult(kind="stop", output=content),
            ]
        )
        return turn

    def _log_prompt(self, text: str, request_id: str | None = None) -> None:
        if self._trace is None:
            return
        detail = {"text": text, "request_id": request_id} if request_id else text
        self._trace.append(
            timestamp=datetime.now(UTC),
            type="prompt",
            actor=self._actor,
            action="prompt",
            resource="",
            detail=detail,
            success=True,
            error_msg="",
        )

    def _log_tool_call(self, action: str, detail, request_id: str | None = None) -> None:
        if self._trace is None:
            return
        payload = {**detail, "request_id": request_id} if request_id else detail
        self._trace.append(
            timestamp=datetime.now(UTC),
            type="tool_call",
            actor=self._actor,
            action=action,
            resource="workbook",
            detail=payload,
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
            f"{p.id}\t{p.title}\t{p.author}\t{p.status.value}\t{','.join(p.approvers) or '-'}"
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
