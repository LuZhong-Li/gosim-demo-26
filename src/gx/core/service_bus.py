"""业务门面：统一编排权限 + 规则 + 审计 + 业务。

上层（api/agent）只调用本门面，不直接碰存储与零散服务。
参见 docs/plans/03-分层与代码结构.md 4.2。
"""

from datetime import datetime, timezone

from config import TRACE_OUTPUT_PATH
from constants import PULL_REQUESTS
from errors import GXError
from gx.domain.enums import Action, PRStatus, Source
from gx.domain.models import PullRequest
from gx.domain.repositories import (
    AuditRepo,
    MemberRepo,
    PRRepo,
    RoleRepo,
    TeamRepo,
    WorkflowRunRepo,
)
from gx.services.audit.interceptor import AuditInterceptor
from gx.services.audit.trace import TraceWriter
from gx.services.perms.permission import PermissionService, require_permission
from gx.services.rules.service import RuleService
from gx.storage.base import BaseStorage


class ServiceBus:
    """统一业务门面：PR 创建 / 审批 / 合并编排。"""

    def __init__(self, storage: BaseStorage, trace_path: str = TRACE_OUTPUT_PATH) -> None:
        self._storage = storage
        self.member_repo = MemberRepo(storage)
        self.team_repo = TeamRepo(storage)
        self.role_repo = RoleRepo(storage)
        self.pr_repo = PRRepo(storage)
        self.workflow_run_repo = WorkflowRunRepo(storage)
        audit_repo = AuditRepo(storage)
        trace = TraceWriter(trace_path)
        self.interceptor = AuditInterceptor(audit_repo, trace)
        self.permissions = PermissionService(
            self.member_repo, self.team_repo, self.role_repo, self.interceptor
        )
        self.rules = RuleService()

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
        violations = self.rules.evaluate(pr)
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

    def _next_pr_id(self) -> int:
        existing = [pr.id for pr in self.pr_repo.list()]
        return max(existing, default=0) + 1
