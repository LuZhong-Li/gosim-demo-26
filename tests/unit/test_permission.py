"""权限系统单元测试。

覆盖：owner 全局权限、admin 特殊表权限、普通成员、只读角色、
无权限拒绝、资源-动作组合、团队权限并集、审计埋点、装饰器拦截。
"""

from datetime import datetime, timezone

import pytest

from constants import AUDIT_LOG, MEMBERS, RULESETS
from demo.init_seed import SHEET_COLUMNS
from errors import GXError
from src.gx.domain.enums import Action, Role as RoleEnum
from src.gx.domain.models import Member, Role, Team
from src.gx.domain.repositories import (
    AuditRepo,
    MemberRepo,
    RoleRepo,
    TeamRepo,
)
from src.gx.services.perms.permission import PermissionService, require_permission
from src.gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 8, 31, tzinfo=timezone.utc)


def _seed_role(role_repo: RoleRepo, role: RoleEnum, permissions: list[str]) -> None:
    role_repo.create(Role(id=role.value, name=role.value, permissions=permissions))


@pytest.fixture
def service(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "perms.xlsx"))
    for sheet_name, columns in SHEET_COLUMNS.items():
        storage.add_sheet(sheet_name, columns)
    storage.remove_sheet("Sheet")

    member_repo = MemberRepo(storage)
    team_repo = TeamRepo(storage)
    role_repo = RoleRepo(storage)
    audit_repo = AuditRepo(storage)

    _seed_role(role_repo, RoleEnum.OWNER, ["read", "write", "admin"])
    _seed_role(role_repo, RoleEnum.ADMIN, ["read", "write", "admin"])
    _seed_role(role_repo, RoleEnum.MEMBER, ["read", "write"])
    _seed_role(role_repo, RoleEnum.READONLY, ["read"])

    team_repo.create(Team(id=1, name="core", description="核心团队"))
    # 1 owner / 2 admin / 3 member / 4 readonly / 5 member-in-team / 6 admin-in-team
    member_repo.create(Member(id=1, name="owner1", role=RoleEnum.OWNER, created_at=_ts()))
    member_repo.create(Member(id=2, name="admin1", role=RoleEnum.ADMIN, created_at=_ts()))
    member_repo.create(Member(id=3, name="m1", role=RoleEnum.MEMBER, created_at=_ts()))
    member_repo.create(
        Member(id=4, name="r1", role=RoleEnum.READONLY, created_at=_ts())
    )
    member_repo.create(
        Member(id=5, name="m2", role=RoleEnum.MEMBER, team_id=1, created_at=_ts())
    )
    member_repo.create(
        Member(id=6, name="admin2", role=RoleEnum.ADMIN, team_id=1, created_at=_ts())
    )

    return PermissionService(member_repo, team_repo, role_repo, audit_repo)


def test_owner_global_permission(service):
    for action in Action:
        assert service.check(1, "sheet", AUDIT_LOG, action)
        assert service.check(1, "sheet", RULESETS, action)
        assert service.check(1, "workbook", "workbook", action)


def test_admin_permissions(service):
    assert service.check(2, "sheet", MEMBERS, Action.WRITE)
    assert service.check(2, "sheet", AUDIT_LOG, Action.WRITE)
    assert service.check(2, "sheet", RULESETS, Action.WRITE)
    assert service.check(2, "workbook", "workbook", Action.ADMIN)


def test_member_permissions(service):
    assert service.check(3, "sheet", MEMBERS, Action.READ)
    assert service.check(3, "sheet", MEMBERS, Action.WRITE)
    assert not service.check(3, "sheet", AUDIT_LOG, Action.WRITE)
    assert not service.check(3, "sheet", RULESETS, Action.WRITE)
    assert not service.check(3, "workbook", "workbook", Action.ADMIN)
    assert not service.check(3, "sheet", AUDIT_LOG, Action.READ)


def test_readonly_permissions(service):
    assert service.check(4, "sheet", MEMBERS, Action.READ)
    assert not service.check(4, "sheet", MEMBERS, Action.WRITE)
    assert not service.check(4, "sheet", AUDIT_LOG, Action.WRITE)
    assert not service.check(4, "workbook", "workbook", Action.ADMIN)


def test_action_resource_combinations(service):
    # 普通成员：读普通表允许，读/写审计表均拒绝
    assert not service.check(3, "sheet", AUDIT_LOG, Action.READ)
    assert not service.check(3, "sheet", AUDIT_LOG, Action.WRITE)
    # 只读：任何写都拒绝
    assert not service.check(4, "sheet", MEMBERS, Action.WRITE)
    assert not service.check(4, "sheet", RULESETS, Action.WRITE)
    # admin：特殊表可写
    assert service.check(2, "sheet", RULESETS, Action.WRITE)


def test_team_role_union(service):
    # m2(member) 与 admin2(admin) 同属 core 团队，取并集后可写审计表
    assert service.check(5, "sheet", AUDIT_LOG, Action.WRITE)
    assert service.check(5, "sheet", RULESETS, Action.WRITE)


def test_enforce_denied_raises_p001(service):
    with pytest.raises(GXError) as exc_info:
        service.enforce(4, "sheet", MEMBERS, Action.WRITE)
    assert exc_info.value.code == "P001"
    assert exc_info.value.module == "perms"


def test_enforce_allowed_passes(service):
    assert service.enforce(1, "sheet", AUDIT_LOG, Action.WRITE) is None
    assert service.enforce(2, "sheet", MEMBERS, Action.WRITE) is None


def test_unknown_subject_denied(service):
    assert service.check(999, "sheet", MEMBERS, Action.READ) is False
    with pytest.raises(GXError) as exc_info:
        service.enforce(999, "sheet", MEMBERS, Action.READ)
    assert exc_info.value.code == "P001"


def test_deny_writes_audit_entry(service, tmp_path):
    with pytest.raises(GXError):
        service.enforce(4, "sheet", MEMBERS, Action.WRITE)
    storage = LocalXlsxStorage(str(tmp_path / "perms.xlsx"))
    audit_repo = AuditRepo(storage)
    entries = audit_repo.list()
    assert len(entries) == 1
    assert entries[0].action_type == "permission.deny"
    assert entries[0].success is False
    assert entries[0].error_msg.startswith("[P001]")


def test_record_permission_change_writes_audit(service, tmp_path):
    service.record_permission_change(
        actor_id="system", subject_id=3, old_role="member", new_role="readonly"
    )
    storage = LocalXlsxStorage(str(tmp_path / "perms.xlsx"))
    audit_repo = AuditRepo(storage)
    entries = audit_repo.list()
    assert len(entries) == 1
    assert entries[0].action_type == "permission.change"
    assert entries[0].after_snapshot == {"role": "readonly"}
    assert entries[0].success is True


class _DemoService:
    def __init__(self, permissions: PermissionService) -> None:
        self.permissions = permissions

    @require_permission(Action.WRITE, "sheet", resource_id_arg="sheet_name")
    def write_sheet(self, subject_id: int, sheet_name: str) -> bool:
        return True

    @require_permission(Action.ADMIN, "workbook")
    def manage_member(self, subject_id: int) -> bool:
        return True


def test_require_permission_decorator_allowed(service):
    demo = _DemoService(service)
    assert demo.write_sheet(subject_id=2, sheet_name=MEMBERS) is True
    assert demo.manage_member(subject_id=2) is True


def test_require_permission_decorator_denied(service):
    demo = _DemoService(service)
    with pytest.raises(GXError) as exc_info:
        demo.write_sheet(subject_id=4, sheet_name=MEMBERS)
    assert exc_info.value.code == "P001"
    with pytest.raises(GXError) as exc_info:
        demo.manage_member(subject_id=3)
    assert exc_info.value.code == "P001"
