"""roles 表唯一权限来源测试（S3-A）。"""

from constants import SHEET_NAMES
from demo.init_seed import SHEET_COLUMNS, create_seed_workbook
from gx.domain.enums import Action
from gx.domain.enums import Role as RoleEnum
from gx.domain.models import Member, Role
from gx.domain.repositories import MemberRepo, RoleRepo
from gx.storage.xlsx import LocalXlsxStorage


def _empty_workbook(path, role_rows: dict[RoleEnum, list[str]]) -> LocalXlsxStorage:
    storage = LocalXlsxStorage.create_workbook(path)
    for sheet_name in SHEET_NAMES:
        storage.add_sheet(sheet_name, SHEET_COLUMNS[sheet_name])
    storage.remove_sheet("Sheet")
    role_repo = RoleRepo(storage)
    for role, permissions in role_rows.items():
        role_repo.create(Role(id=role.value, name=role.value, permissions=permissions))
    return storage


def test_seed_creates_all_four_role_rows(tmp_path):
    storage = create_seed_workbook(str(tmp_path / "seed.xlsx"))
    roles = {role.id: set(role.permissions) for role in RoleRepo(storage).list()}
    assert roles[RoleEnum.OWNER.value] == {"read", "write", "admin"}
    assert roles[RoleEnum.ADMIN.value] == {"read", "write", "admin"}
    assert roles[RoleEnum.MEMBER.value] == {"read", "write"}
    assert roles[RoleEnum.READONLY.value] == {"read"}


def test_missing_role_row_denies_instead_of_fallback(tmp_path):
    storage = _empty_workbook(
        str(tmp_path / "perms.xlsx"),
        {
            RoleEnum.OWNER: ["read", "write", "admin"],
            RoleEnum.ADMIN: ["read", "write", "admin"],
        },
    )
    member_repo = MemberRepo(storage)
    member_repo.create(
        Member(id=2, name="alice", role=RoleEnum.MEMBER, created_at="2026-09-01T00:00:00Z")
    )
    from gx.services.perms.permission import PermissionService

    service = PermissionService(member_repo, None, RoleRepo(storage))
    assert service.check(2, "sheet", "members", Action.WRITE) is False


def test_role_config_change_takes_effect(tmp_path):
    storage = _empty_workbook(
        str(tmp_path / "perms.xlsx"),
        {
            RoleEnum.OWNER: ["read", "write", "admin"],
            RoleEnum.MEMBER: ["read", "write"],
        },
    )
    member_repo = MemberRepo(storage)
    member_repo.create(
        Member(id=2, name="alice", role=RoleEnum.MEMBER, created_at="2026-09-01T00:00:00Z")
    )
    role_repo = RoleRepo(storage)
    role_repo.update(RoleEnum.MEMBER.value, {"permissions": ["read"]})
    from gx.services.perms.permission import PermissionService

    service = PermissionService(member_repo, None, role_repo)
    assert service.check(2, "sheet", "members", Action.WRITE) is False
