"""权限引擎：主体-资源-动作权限判定。

角色矩阵对齐 docs/plans/02-核心模块设计.md 3.3；
角色常量从 constants.py 导入，禁止硬编码。
"""

import functools
from collections.abc import Callable
from typing import Any, ParamSpec, TypeVar

from constants import AUDIT_LOG, ERR_PERMISSION_DENIED, RULESETS
from errors import GXError
from gx.domain.enums import Action, Source
from gx.domain.enums import Role as RoleEnum
from gx.domain.repositories import MemberRepo, RoleRepo, TeamRepo
from gx.services.audit.interceptor import AuditInterceptor

P = ParamSpec("P")
T = TypeVar("T")

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
        interceptor: AuditInterceptor | None = None,
    ) -> None:
        self._members = member_repo
        self._teams = team_repo
        self._roles = role_repo
        self._interceptor = interceptor

    def check(
        self,
        subject_id: Any,
        resource_type: str,
        resource_id: str | None,
        action: Action | str,
    ) -> bool:
        """核心校验：主体是否对 (resource_type, resource_id) 拥有 action 权限。

        入参：
            subject_id: 主体（成员 id）。
            resource_type: 资源类型（sheet / workbook / member）。
            resource_id: 资源 id，可为 None。
            action: 权限动作（read / write / admin）。

        返回值：有权限返回 True，否则返回 False（不抛错、不留审计）。

        注意：团队权限并集语义见 limitation.md #1，S3 收敛前保持不变。
        """
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
        """校验失败时写入审计记录并抛 GXError(P001)。

        入参：同 check()。无返回值；权限不足时抛 P001（permission denied），
        由上层（CLI/Mock Agent）统一格式化输出。
        """
        action = _normalize_action(action)
        if self.check(subject_id, resource_type, resource_id, action):
            return
        self._audit_deny(subject_id, resource_type, resource_id, action)
        raise GXError(
            ERR_PERMISSION_DENIED,
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
        """权限变更审计埋点（供角色变更操作调用）。

        入参：
            actor_id: 操作者 id。
            subject_id: 被变更成员 id。
            old_role: 变更前角色。
            new_role: 变更后角色。
        无返回值；拦截器为空时静默跳过（不写审计）。
        """
        if self._interceptor is None:
            return
        self._interceptor.record(
            actor_id=str(actor_id),
            action_type="permission.change",
            resource_type="member",
            resource_id=str(subject_id),
            before_snapshot={"role": str(old_role)},
            after_snapshot={"role": str(new_role)},
            source=Source.CLI,
            success=True,
            trace_type="api_call",
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
            teammate.role for teammate in self._members.list() if teammate.team_id == member.team_id
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
        if action.value not in self._role_permissions(role):
            return False
        if resource_type == "sheet" and resource_id in _ADMIN_ONLY_SHEETS:
            return role in (RoleEnum.OWNER, RoleEnum.ADMIN)
        return True

    def _role_permissions(self, role: RoleEnum) -> frozenset[str]:
        """读取 roles 表的权限配置；缺失时回退到内置默认矩阵。

        S3 目标：roles 表为唯一权限来源，种子补齐 member/readonly 行。
        """
        try:
            configured = self._roles.get(role.value)
        except GXError:
            configured = None
        if configured is not None:
            return frozenset(configured.permissions)
        return frozenset(action.value for action in _ROLE_ACTIONS.get(role, frozenset()))

    def _audit_deny(
        self,
        subject_id: Any,
        resource_type: str,
        resource_id: str | None,
        action: Action,
    ) -> None:
        if self._interceptor is None:
            return
        self._interceptor.record(
            actor_id=str(subject_id),
            action_type="permission.deny",
            resource_type=resource_type,
            resource_id=str(resource_id or ""),
            after_snapshot={"action": action.value},
            source=Source.API,
            success=False,
            error_msg="[P001] permission denied",
            trace_type="api_call",
        )


def require_permission(
    action: Action | str,
    resource_type: str,
    resource_id: str | None = None,
    resource_id_arg: str | None = None,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """方法装饰器：调用前先做权限拦截。

    约定：被装饰方法所在类持有 ``permissions`` 属性（PermissionService 实例）；
    ``subject_id`` 从 kwargs 读取，缺省取第一个位置参数；``resource_id`` 从
    ``resource_id`` 固定值或 ``resource_id_arg`` 指定的 kwargs 读取，
    缺省使用 ``resource_type``。
    校验失败抛 GXError(P001)，由上层统一处理。

    返回：包装后的方法（行为不变）。
    """

    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            self = args[0]
            subject_id = kwargs.get("subject_id", args[0] if args else None)
            if subject_id is None:
                raise GXError(
                    ERR_PERMISSION_DENIED,
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
            self.permissions.enforce(subject_id, resource_type, resolved_resource_id, action)
            return func(*args, **kwargs)

        return wrapper

    return decorator
