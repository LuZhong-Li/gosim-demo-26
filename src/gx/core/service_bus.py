"""业务门面：统一编排权限 + 规则 + 审计 + 业务。

上层（api/agent）只调用本门面，不直接碰存储与零散服务。
参见 docs/plans/03-分层与代码结构.md 4.2。
"""

from datetime import datetime, timezone

from config import TRACE_OUTPUT_PATH
from constants import ERR_RULE_PR_APPROVE, MEMBERS, PULL_REQUESTS, TEAMS, WORKFLOWS
from errors import GXError
from gx.domain.enums import Action, PRStatus, Role as RoleEnum, Source, TriggerType
from gx.domain.models import Member, PullRequest, Team
from gx.domain.repositories import (
    AuditRepo,
    MemberRepo,
    PRRepo,
    RoleRepo,
    TeamRepo,
    WorkflowRepo,
    WorkflowRunRepo,
)
from gx.services.actions.runner import WorkflowRunner
from gx.services.actions.trigger import WorkflowTrigger
from gx.services.audit.interceptor import AuditInterceptor
from gx.services.audit.trace import TraceWriter
from gx.services.perms.permission import PermissionService, require_permission
from gx.services.rules.service import RuleService
from gx.services.rules.workflow_check import WorkflowCheck
from gx.storage.base import BaseStorage


class ServiceBus:
    """统一业务门面：成员/团队/角色/PR/工作流编排。"""

    def __init__(self, storage: BaseStorage, trace_path: str = TRACE_OUTPUT_PATH) -> None:
        self._storage = storage
        self.member_repo = MemberRepo(storage)
        self.team_repo = TeamRepo(storage)
        self.role_repo = RoleRepo(storage)
        self.pr_repo = PRRepo(storage)
        self.workflow_repo = WorkflowRepo(storage)
        self.workflow_run_repo = WorkflowRunRepo(storage)
        audit_repo = AuditRepo(storage)
        trace = TraceWriter(trace_path)
        self.interceptor = AuditInterceptor(audit_repo, trace)
        self.permissions = PermissionService(
            self.member_repo, self.team_repo, self.role_repo, self.interceptor
        )
        self.rules = RuleService()
        self.workflow_trigger = WorkflowTrigger(
            self.workflow_repo, self.workflow_run_repo, WorkflowRunner(), self.interceptor
        )
        self.workflow_check = WorkflowCheck(self.workflow_run_repo)

    @require_permission(Action.WRITE, "sheet", resource_id=PULL_REQUESTS)
    def create_pr(self, subject_id: int, title: str) -> PullRequest:
        """创建 PR（写 pull_requests 表并留痕）。

        入参：
            subject_id: 操作者成员 id（需有 sheet:pull_requests 写权限）。
            title: PR 标题。

        返回值：新建的 PullRequest。
        权限不足抛 GXError(P001)（permission denied）。
        """
        author = self.member_repo.get(subject_id).name
        pr = PullRequest(
            id=self._next_pr_id(),
            title=title,
            author=author,
            status=PRStatus.OPEN,
            approvers=[],
            created_at=datetime.now(timezone.utc),
        )
        self.pr_repo.create(pr)
        self.interceptor.record(
            actor_id=subject_id,
            action_type="pr.create",
            resource_type="sheet",
            resource_id=PULL_REQUESTS,
            after_snapshot={"id": pr.id, "title": title, "author": author},
            source=Source.API,
            success=True,
            trace_type="api_call",
        )
        return pr

    @require_permission(Action.WRITE, "sheet", resource_id=PULL_REQUESTS)
    def approve_pr(self, subject_id: int, pr_id: int, approver: str) -> PullRequest:
        """审批 PR（追加审批人并留痕）。

        入参：
            subject_id: 操作者成员 id（需有 sheet:pull_requests 写权限）。
            pr_id: PR id。
            approver: 审批人成员名称。

        返回值：更新后的 PullRequest。
        权限不足抛 GXError(P001)。注意：原型未做“自审批/重复审批”校验，
        属已知局限（docs/dev/limitation.md），决赛迭代修复。
        """
        pr = self.pr_repo.get(pr_id)
        approvers = (
            pr.approvers if approver in pr.approvers else [*pr.approvers, approver]
        )
        updated = self.pr_repo.update(pr_id, {"approvers": approvers})
        self.interceptor.record(
            actor_id=subject_id,
            action_type="pr.approve",
            resource_type="sheet",
            resource_id=str(pr_id),
            after_snapshot={"approver": approver, "approvers": approvers},
            source=Source.API,
            success=True,
            trace_type="api_call",
        )
        return updated

    @require_permission(Action.WRITE, "sheet", resource_id=PULL_REQUESTS)
    def merge_pr(self, subject_id: int, pr_id: int) -> PullRequest:
        """合并 PR：先过 Rulesets 规则，违规抛 GXError(R001)。

        入参：
            subject_id: 操作者成员 id（需有 sheet:pull_requests 写权限）。
            pr_id: PR id。

        返回值：合并后的 PullRequest。
        规则不通过（无审批 / required-check 失败）时抛 GXError(R001)，
        并同步写一条 success=false 的审计 + trace 记录。
        """
        pr = self.pr_repo.get(pr_id)
        violations = self.rules.evaluate(
            pr,
            context={"workflow_status": self.workflow_check.latest_status()},
        )
        if violations:
            self.interceptor.record(
                actor_id=subject_id,
                action_type="pr.merge",
                resource_type="sheet",
                resource_id=str(pr_id),
                after_snapshot={
                    "status": pr.status.value,
                    "violations": [violation.rule_id for violation in violations],
                },
                source=Source.API,
                success=False,
                error_msg=f"[{ERR_RULE_PR_APPROVE}] {violations[0].message}",
                trace_type="api_call",
            )
            raise GXError(
                ERR_RULE_PR_APPROVE,
                violations[0].message,
                module="rules",
                context={
                    "rule_id": violations[0].rule_id,
                    "resource_id": str(pr_id),
                },
            )
        updated = self.pr_repo.update(
            pr_id,
            {
                "status": PRStatus.MERGED.value,
                "merged_at": datetime.now(timezone.utc),
            },
        )
        self.interceptor.record(
            actor_id=subject_id,
            action_type="pr.merge",
            resource_type="sheet",
            resource_id=str(pr_id),
            after_snapshot={"status": PRStatus.MERGED.value},
            source=Source.API,
            success=True,
            trace_type="api_call",
        )
        return updated

    def list_prs(self) -> list[PullRequest]:
        """返回全部 PR 列表（只读，无需权限）。"""
        return self.pr_repo.list()

    @require_permission(Action.ADMIN, "workbook")
    def member_add(self, subject_id: int, name: str, role: str) -> Member:
        """添加成员（需要 workbook 级 admin 权限）。

        入参：
            subject_id: 操作者成员 id。
            name: 成员名称。
            role: 角色枚举值（owner/admin/member/readonly）。

        返回值：新建的 Member。权限不足抛 GXError(P001)。
        """
        member = Member(
            id=self._next_id(self.member_repo),
            name=name,
            role=RoleEnum(role),
            created_at=datetime.now(timezone.utc),
        )
        self.member_repo.create(member)
        self.interceptor.record(
            actor_id=subject_id,
            action_type="member.add",
            resource_type="sheet",
            resource_id=MEMBERS,
            after_snapshot={
                "id": member.id,
                "name": member.name,
                "role": member.role.value,
            },
            source=Source.API,
            success=True,
            trace_type="api_call",
        )
        return member

    @require_permission(Action.WRITE, "sheet", resource_id=TEAMS)
    def team_add(self, subject_id: int, name: str, description: str = "") -> Team:
        """创建团队（需要 sheet:teams 写权限）。

        入参：
            subject_id: 操作者成员 id。
            name: 团队名称。
            description: 团队描述（默认空串）。

        返回值：新建的 Team。权限不足抛 GXError(P001)。
        """
        team = Team(
            id=self._next_id(self.team_repo), name=name, description=description
        )
        self.team_repo.create(team)
        self.interceptor.record(
            actor_id=subject_id,
            action_type="team.add",
            resource_type="sheet",
            resource_id=TEAMS,
            after_snapshot={"id": team.id, "name": team.name},
            source=Source.API,
            success=True,
            trace_type="api_call",
        )
        return team

    @require_permission(Action.ADMIN, "workbook")
    def role_assign(self, subject_id: int, member_id: int, role: str) -> Member:
        """调整成员角色（需要 workbook 级 admin 权限），并记录权限变更审计。

        入参：
            subject_id: 操作者成员 id。
            member_id: 被调整成员 id。
            role: 目标角色枚举值（owner/admin/member/readonly）。

        返回值：更新后的 Member。权限不足抛 GXError(P001)。
        """
        current = self.member_repo.get(member_id)
        new_role = RoleEnum(role)
        updated = self.member_repo.update(member_id, {"role": new_role.value})
        self.permissions.record_permission_change(
            actor_id=subject_id,
            subject_id=member_id,
            old_role=current.role.value,
            new_role=new_role.value,
        )
        return updated

    def list_members(self) -> list[Member]:
        """返回全部成员列表（只读，无需权限）。"""
        return self.member_repo.list()

    def list_teams(self) -> list[Team]:
        """返回全部团队列表（只读，无需权限）。"""
        return self.team_repo.list()

    @require_permission(Action.WRITE, "sheet", resource_id=WORKFLOWS)
    def run_workflow(self, subject_id: int, name: str):
        """按名称手动触发工作流（需要 sheet:workflows 写权限）。

        入参：
            subject_id: 操作者成员 id。
            name: 工作流名称。

        返回值：本次 WorkflowRun（含运行状态）。
        权限不足抛 GXError(P001)；工作流不存在抛 GXError(S004)。
        """
        return self.workflow_trigger.run_by_name(name, actor=subject_id)

    def list_workflows(self):
        """返回全部工作流定义列表（只读，无需权限）。"""
        return self.workflow_repo.list()

    def _next_pr_id(self) -> int:
        """计算下一个 PR id（取现有最大 id + 1）。"""
        return self._next_id(self.pr_repo)

    @staticmethod
    def _next_id(repo) -> int:
        """通用自增 id：取仓库现有最大 id + 1，空表返回 1。"""
        existing = [getattr(item, "id") for item in repo.list()]
        return max(existing, default=0) + 1
