"""权限引擎：主体-资源-动作权限判定。

角色矩阵对齐 docs/plans/02-核心模块设计.md 3.3；
角色常量从 constants.py 导入，禁止硬编码。
"""

import functools
from datetime import datetime, timezone
from typing import Any, Callable

from constants import AUDIT_LOG, RULESETS
from errors import GXError
from gx.domain.enums import Action, Role as RoleEnum, Source
from gx.domain.models import AuditLogEntry
from gx.domain.repositories import AuditRepo, MemberRepo, RoleRepo, TeamRepo

# 通用动作矩阵（owner 全局权限与特殊表限制在 _role_allows 中额外处理）
_ROLE_ACTIONS: dict[RoleEnum, frozenset[Action]] = {
    RoleEnum.OWNER: frozenset({Action.READ, Action.WRITE, Action.ADMIN}),
    RoleEnum.ADMIN: frozenset({Action.READ, Action.WRITE, Action.ADMIN}),
    RoleEnum.MEMBER: frozenset({Action.READ, Action.WRITE}),
    RoleEnum.READONLY: frozenset({Action.READ}),
}

# 仅 owner/admin 可写的特殊表（写审计/规则表）
_ADMIN_ONLY_SHEETS: frozenset[str] = frozenset({AUDIT_LOG, RULESETS})


def _normalize_action(action: Action | str) -> Action:
    return action if isinstance(action, Action) else Action(action)


class PermissionService:
    """权限校验服务：读取仓储解析主体角色，按角色矩阵判定。"""

    def __init__(
        self,
        member_repo: MemberRepo,
        team_repo: TeamRepo,
        role_repo: RoleRepo,
        audit_repo: AuditRepo | None = None,
    ) -> None:
        self._members = member_repo
        self._teams = team_repo
        self._roles = role_repo
        self._audit = audit_repo

    def check(
        self,
        subject_id: Any,
        resource_type: str,
        resource_id: str | None,
        action: Action | str,
    ) -> bool:
        """核心校验：主体是否对 (resource_type, resource_id) 拥有 action 权限。"""
        action = _normalize_action(action)
        return any(
            self._role_allows(role, resource_type, resource_id, action)
            for role in self._resolve_roles(subject_id)
        )

    def enforce(
        self,
        subject_id: Any,
        resource_type: str,
        resource_id: str | None,
        action: Action | str,
    ) -> None:
        """校验失败时写入审计记录并抛 GXError(P001)。"""
        action = _normalize_action(action)
        if self.check(subject_id, resource_type, resource_id, action):
            return
        self._audit_deny(subject_id, resource_type, resource_id, action)
        raise GXError(
            "P001",
            "permission denied",
            module="perms",
            context={
                "subject_id": str(subject_id),
                "resource_type": resource_type,
                "resource_id": str(resource_id or ""),
                "action": action.value,
            },
        )

    def record_permission_change(
        self, actor_id: Any, subject_id: Any, old_role: str, new_role: str
    ) -> None:
        """权限变更审计埋点（供后续角色变更操作调用）。"""
        if self._audit is None:
            return
        self._audit.create(
            AuditLogEntry(
                actor_id=str(actor_id),
                action_type="permission.change",
                resource_type="member",
                resource_id=str(subject_id),
                before_snapshot={"role": str(old_role)},
                after_snapshot={"role": str(new_role)},
                timestamp=datetime.now(timezone.utc),
                source=Source.CLI,
                success=True,
            )
        )

    def _resolve_roles(self, subject_id: Any) -> set[RoleEnum]:
        try:
            member = self._members.get(subject_id)
        except GXError:
            return set()
        roles = {member.role}
        if member.team_id is None:
            return roles
        try:
            self._teams.get(member.team_id)
        except GXError:
            return roles  # 团队不存在则跳过继承
        roles.update(
            teammate.role
            for teammate in self._members.list()
            if teammate.team_id == member.team_id
        )
        return roles

    def _role_allows(
        self,
        role: RoleEnum,
        resource_type: str,
        resource_id: str | None,
        action: Action,
    ) -> bool:
        if role is RoleEnum.OWNER:
            return True  # owner 全局最高权限，不受资源限制
        if action not in _ROLE_ACTIONS.get(role, frozenset()):
            return False
        if resource_type == "sheet" and resource_id in _ADMIN_ONLY_SHEETS:
            return role in (RoleEnum.OWNER, RoleEnum.ADMIN)
        return True

    def _audit_deny(
        self,
        subject_id: Any,
        resource_type: str,
        resource_id: str | None,
        action: Action,
    ) -> None:
        if self._audit is None:
            return
        self._audit.create(
            AuditLogEntry(
                actor_id=str(subject_id),
                action_type="permission.deny",
                resource_type=resource_type,
                resource_id=str(resource_id or ""),
                after_snapshot={"action": action.value},
                timestamp=datetime.now(timezone.utc),
                source=Source.API,
                success=False,
                error_msg="[P001] permission denied",
            )
        )


def require_permission(
    action: Action | str,
    resource_type: str,
    resource_id: str | None = None,
    resource_id_arg: str | None = None,
) -> Callable:
    """方法装饰器：调用前先做权限拦截。

    约定：被装饰方法所在类持有 ``permissions`` 属性（PermissionService 实例）；
    ``subject_id`` 从 kwargs 读取，缺省取第一个位置参数；``resource_id`` 从
    ``resource_id`` 固定值或 ``resource_id_arg`` 指定的 kwargs 读取，
    缺省使用 ``resource_type``。
    校验失败抛 GXError(P001)，由上层统一处理。
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            subject_id = kwargs.get("subject_id", args[0] if args else None)
            if subject_id is None:
                raise GXError(
                    "P001",
                    "缺少 subject_id，无法执行权限校验",
                    module="perms",
                    context={
                        "resource_type": resource_type,
                        "action": str(action),
                    },
                )
            if resource_id is not None:
                resolved_resource_id = resource_id
            elif resource_id_arg:
                resolved_resource_id = kwargs.get(resource_id_arg)
            else:
                resolved_resource_id = resource_type
            self.permissions.enforce(
                subject_id, resource_type, resolved_resource_id, action
            )
            return func(self, *args, **kwargs)

        return wrapper

    return decorator
