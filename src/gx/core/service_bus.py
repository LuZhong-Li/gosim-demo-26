"""业务门面：统一编排权限 + 规则 + 审计 + 业务。

上层（api/agent）只调用本门面，不直接碰存储与零散服务。
参见 docs/plans/03-分层与代码结构.md 4.2。
"""

from datetime import datetime, timezone

from config import TRACE_OUTPUT_PATH
from constants import MEMBERS, PULL_REQUESTS, TEAMS, WORKFLOWS
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
                error_msg=f"[R001] {violations[0].message}",
                trace_type="api_call",
            )
            raise GXError(
                "R001",
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
        return self.pr_repo.list()

    @require_permission(Action.ADMIN, "workbook")
    def member_add(self, subject_id: int, name: str, role: str) -> Member:
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
        return self.member_repo.list()

    def list_teams(self) -> list[Team]:
        return self.team_repo.list()

    @require_permission(Action.WRITE, "sheet", resource_id=WORKFLOWS)
    def run_workflow(self, subject_id: int, name: str):
        """按名称手动触发工作流。"""
        return self.workflow_trigger.run_by_name(name, actor=subject_id)

    def list_workflows(self):
        return self.workflow_repo.list()

    def _next_pr_id(self) -> int:
        return self._next_id(self.pr_repo)

    @staticmethod
    def _next_id(repo) -> int:
        existing = [getattr(item, "id") for item in repo.list()]
        return max(existing, default=0) + 1
