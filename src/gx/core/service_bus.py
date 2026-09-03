"""业务门面：统一编排权限 + 规则 + 审计 + 业务。

上层（api/agent）只调用本门面，不直接碰存储与零散服务。
参见 docs/plans/03-分层与代码结构.md 4.2。
"""

from datetime import UTC, datetime
from typing import Any

from config import TRACE_OUTPUT_PATH
from constants import (
    ERR_BUSINESS_VALIDATION,
    ERR_RULE_PR_APPROVE,
    MEMBERS,
    PULL_REQUESTS,
    RULESETS,
    TEAMS,
    WORKFLOWS,
)
from errors import GXError
from gx.domain.enums import (
    Action,
    PRStatus,
    RuleStatus,
    Source,
)
from gx.domain.enums import (
    Role as RoleEnum,
)
from gx.domain.models import Member, PullRequest, RuleSet, Team
from gx.domain.repositories import (
    AuditRepo,
    MemberRepo,
    PRRepo,
    RoleRepo,
    RuleSetRepo,
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
        self.audit_repo = AuditRepo(storage)
        trace = TraceWriter(trace_path)
        self.interceptor = AuditInterceptor(self.audit_repo, trace)
        self.permissions = PermissionService(
            self.member_repo, self.team_repo, self.role_repo, self.interceptor
        )
        self.rule_repo = RuleSetRepo(storage)
        self.rules = RuleService(self.rule_repo)
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
            created_at=datetime.now(UTC),
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
        权限不足抛 GXError(P001)；业务校验失败（非有效成员 / 自审批 /
        重复审批 / merged / closed）抛 GXError(B001) 并留失败审计。
        """
        pr = self.pr_repo.get(pr_id)
        if pr.status in (PRStatus.MERGED, PRStatus.CLOSED):
            self._business_fail(
                actor_id=subject_id,
                action_type="pr.approve",
                pr_id=pr_id,
                status=pr.status.value,
                code=ERR_BUSINESS_VALIDATION,
                message=f"PR 已{pr.status.value}，不能审批",
            )
        members = self.member_repo.list()
        matches = [member for member in members if member.name == approver]
        if not matches:
            self._business_fail(
                actor_id=subject_id,
                action_type="pr.approve",
                pr_id=pr_id,
                status=pr.status.value,
                code=ERR_BUSINESS_VALIDATION,
                message=f"审批人不是有效成员: {approver}",
            )
        if len(matches) > 1:
            self._business_fail(
                actor_id=subject_id,
                action_type="pr.approve",
                pr_id=pr_id,
                status=pr.status.value,
                code=ERR_BUSINESS_VALIDATION,
                message=f"成员重名，无法唯一确定审批人: {approver}",
            )
        if pr.author == matches[0].name:
            self._business_fail(
                actor_id=subject_id,
                action_type="pr.approve",
                pr_id=pr_id,
                status=pr.status.value,
                code=ERR_BUSINESS_VALIDATION,
                message="不能审批自己的 PR",
            )
        if approver in pr.approvers:
            self._business_fail(
                actor_id=subject_id,
                action_type="pr.approve",
                pr_id=pr_id,
                status=pr.status.value,
                code=ERR_BUSINESS_VALIDATION,
                message=f"审批人已审批过: {approver}",
            )
        approvers = [*pr.approvers, approver]
        new_status = (
            PRStatus.APPROVED.value if pr.status == PRStatus.OPEN else pr.status.value
        )
        updated = self.pr_repo.update(
            pr_id,
            {"approvers": approvers, "status": new_status},
        )
        self.interceptor.record(
            actor_id=subject_id,
            action_type="pr.approve",
            resource_type="sheet",
            resource_id=str(pr_id),
            after_snapshot={
                "approver": approver,
                "approvers": approvers,
                "status": updated.status.value,
            },
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
        并同步写一条 success=false 的审计 + trace 记录；
        merged / closed 状态抛 GXError(B001)。
        """
        pr = self.pr_repo.get(pr_id)
        if pr.status == PRStatus.MERGED:
            self._business_fail(
                actor_id=subject_id,
                action_type="pr.merge",
                pr_id=pr_id,
                status=pr.status.value,
                code=ERR_BUSINESS_VALIDATION,
                message="PR 已合并，不能重复合并",
            )
        if pr.status == PRStatus.CLOSED:
            self._business_fail(
                actor_id=subject_id,
                action_type="pr.merge",
                pr_id=pr_id,
                status=pr.status.value,
                code=ERR_BUSINESS_VALIDATION,
                message="PR 已关闭，不能合并",
            )
        violations = self.rules.evaluate(
            pr,
            context={"workflow_status": self.workflow_check.latest_status(pr_id=pr_id)},
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
                "merged_at": datetime.now(UTC),
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

    @require_permission(Action.WRITE, "sheet", resource_id=PULL_REQUESTS)
    def close_pr(self, subject_id: int, pr_id: int, reason: str = "") -> PullRequest:
        """关闭/驳回 PR（状态机 S1）：merged/closed 不可再关闭。"""
        pr = self.pr_repo.get(pr_id)
        if pr.status in (PRStatus.MERGED, PRStatus.CLOSED):
            self._business_fail(
                actor_id=subject_id,
                action_type="pr.close",
                pr_id=pr_id,
                status=pr.status.value,
                code=ERR_BUSINESS_VALIDATION,
                message=f"PR 已{pr.status.value}，不能关闭",
            )
        updated = self.pr_repo.update(pr_id, {"status": PRStatus.CLOSED.value})
        self.interceptor.record(
            actor_id=subject_id,
            action_type="pr.close",
            resource_type="sheet",
            resource_id=str(pr_id),
            after_snapshot={"status": PRStatus.CLOSED.value, "reason": reason},
            source=Source.API,
            success=True,
            trace_type="api_call",
        )
        return updated

    def pr_history(self, pr_id: int) -> list[dict[str, Any]]:
        """按 PR 汇总审计中的评审事件（只读，供 CLI 展示）。"""
        self.pr_repo.get(pr_id)
        rows: list[dict[str, Any]] = []
        for entry in self.audit_repo.list():
            if entry.action_type == "pr.create":
                after = entry.after_snapshot or {}
                if str(after.get("id")) != str(pr_id):
                    continue
            elif entry.action_type not in {"pr.approve", "pr.close", "pr.merge"}:
                continue
            elif entry.resource_id != str(pr_id):
                continue
            rows.append(
                {
                    "timestamp": entry.timestamp.isoformat(),
                    "action_type": entry.action_type,
                    "success": entry.success,
                    "error_msg": entry.error_msg,
                    "after_snapshot": entry.after_snapshot,
                }
            )
        return rows

    def _business_fail(
        self,
        *,
        actor_id: Any,
        action_type: str,
        pr_id: int,
        status: str,
        code: str,
        message: str,
    ) -> None:
        """记录失败审计 + trace 后抛业务校验错误（GXError）。"""
        self.interceptor.record(
            actor_id=actor_id,
            action_type=action_type,
            resource_type="sheet",
            resource_id=str(pr_id),
            after_snapshot={"status": status, "error": message},
            source=Source.API,
            success=False,
            error_msg=f"[{code}] {message}",
            trace_type="api_call",
        )
        raise GXError(
            code,
            message,
            module="pr",
            context={"resource_id": str(pr_id), "status": status},
        )

    def list_prs(self) -> list[PullRequest]:
        """返回全部 PR 列表（只读，无需权限）。"""
        return self.pr_repo.list()

    def _org_validation_fail(
        self,
        *,
        actor_id: Any,
        action_type: str,
        resource_type: str,
        resource_id: str,
        message: str,
    ) -> None:
        """记录失败审计 + trace 后抛 B001（组织/权限类业务校验）。"""
        self.interceptor.record(
            actor_id=actor_id,
            action_type=action_type,
            resource_type=resource_type,
            resource_id=resource_id,
            after_snapshot={"error": message},
            source=Source.API,
            success=False,
            error_msg=f"[{ERR_BUSINESS_VALIDATION}] {message}",
            trace_type="api_call",
        )
        raise GXError(
            ERR_BUSINESS_VALIDATION,
            message,
            module="org",
            context={"resource_type": resource_type, "resource_id": resource_id},
        )

    @require_permission(Action.ADMIN, "workbook")
    def member_add(self, subject_id: int, name: str, role: str) -> Member:
        """添加成员（需要 workbook 级 admin 权限）。

        入参：
            subject_id: 操作者成员 id。
            name: 成员名称。
            role: 角色枚举值（owner/admin/member/readonly）。

        返回值：新建的 Member。权限不足抛 GXError(P001)；重名抛 GXError(B001)。
        """
        if any(member.name == name for member in self.member_repo.list()):
            self._org_validation_fail(
                actor_id=subject_id,
                action_type="member.add",
                resource_type="sheet",
                resource_id=MEMBERS,
                message=f"成员名称已存在: {name}",
            )
        member = Member(
            id=self._next_id(self.member_repo),
            name=name,
            role=RoleEnum(role),
            created_at=datetime.now(UTC),
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

        返回值：新建的 Team。权限不足抛 GXError(P001)；重名抛 GXError(B001)。
        """
        if any(team.name == name for team in self.team_repo.list()):
            self._org_validation_fail(
                actor_id=subject_id,
                action_type="team.add",
                resource_type="sheet",
                resource_id=TEAMS,
                message=f"团队名称已存在: {name}",
            )
        team = Team(id=self._next_id(self.team_repo), name=name, description=description)
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

        返回值：更新后的 Member。权限不足抛 GXError(P001)；
        非 owner 授予/修改 owner 角色抛 GXError(B001)。
        """
        actor = self.member_repo.get(subject_id)
        current = self.member_repo.get(member_id)
        new_role = RoleEnum(role)
        if new_role is RoleEnum.OWNER and actor.role is not RoleEnum.OWNER:
            self._org_validation_fail(
                actor_id=subject_id,
                action_type="role.assign",
                resource_type="member",
                resource_id=str(member_id),
                message="只有 owner 可以授予 owner 角色",
            )
        if current.role is RoleEnum.OWNER and actor.role is not RoleEnum.OWNER:
            self._org_validation_fail(
                actor_id=subject_id,
                action_type="role.assign",
                resource_type="member",
                resource_id=str(member_id),
                message="只有 owner 可以修改 owner 成员的角色",
            )
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
    def run_workflow(
        self,
        subject_id: int,
        name: str,
        pr_id: int | None = None,
        head_sha: str = "",
    ):
        """按名称手动触发工作流（需要 sheet:workflows 写权限）。

        入参：
            subject_id: 操作者成员 id。
            name: 工作流名称。
            pr_id: 关联 PR id（required-check 按 PR 精确取状态时使用）。
            head_sha: 关联提交 SHA（可选留痕）。

        返回值：本次 WorkflowRun（含运行状态）。
        权限不足抛 GXError(P001)；工作流不存在抛 GXError(S004)；
        工作流已禁用抛 GXError(W001)。
        """
        return self.workflow_trigger.run_by_name(
            name,
            actor=subject_id,
            pr_id=pr_id,
            head_sha=head_sha,
        )

    def list_workflows(self):
        """返回全部工作流定义列表（只读，无需权限）。"""
        return self.workflow_repo.list()

    def list_rulesets(self) -> list[RuleSet]:
        """返回全部 Rulesets 规则配置（只读，无需权限）。"""
        return self.rule_repo.list()

    @require_permission(Action.WRITE, "sheet", resource_id=RULESETS)
    def ruleset_set_enabled(self, subject_id: int, rule_id: str, enabled: bool) -> RuleSet:
        """启用/禁用一条规则（rulesets 为 admin/owner 特殊表，普通成员被拒）。

        入参：
            subject_id: 操作者成员 id。
            rule_id: 规则 id（approval / required_check）。
            enabled: True=active，False=disabled。

        返回值：更新后的 RuleSet。目标状态与当前一致时幂等返回，不写审计/trace；
        状态变化写 ``ruleset.update`` 审计并联动 trace（type=api_call）。
        """
        current = self.rule_repo.get(rule_id)
        new_status = RuleStatus.ACTIVE if enabled else RuleStatus.DISABLED
        if current.status == new_status:
            return current
        updated = self.rule_repo.update(rule_id, {"status": new_status.value})
        self.interceptor.record(
            actor_id=subject_id,
            action_type="ruleset.update",
            resource_type="rulesets",
            resource_id=str(rule_id),
            before_snapshot={"status": current.status.value},
            after_snapshot={"status": new_status.value},
            source=Source.API,
            success=True,
            trace_type="api_call",
        )
        return updated

    def _next_pr_id(self) -> int:
        """计算下一个 PR id（取现有最大 id + 1）。"""
        return self._next_id(self.pr_repo)

    @staticmethod
    def _next_id(repo) -> int:
        """通用自增 id：取仓库现有最大 id + 1，空表返回 1。"""
        existing = [getattr(item, "id") for item in repo.list()]
        return max(existing, default=0) + 1
