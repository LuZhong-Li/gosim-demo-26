"""集成测试：成员/团队唯一性与 owner 角色防提权（S3）。"""

from datetime import UTC, datetime

import pytest

from constants import ERR_BUSINESS_VALIDATION
from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.domain.enums import Role as RoleEnum
from gx.domain.models import Member, Role, Team
from gx.domain.repositories import MemberRepo, RoleRepo, TeamRepo
from gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=UTC)


@pytest.fixture
def env(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "org.xlsx"))
    for sheet_name, columns in SHEET_COLUMNS.items():
        storage.add_sheet(sheet_name, columns)
    storage.remove_sheet("Sheet")

    role_repo = RoleRepo(storage)
    for role, permissions in {
        RoleEnum.OWNER: ["read", "write", "admin"],
        RoleEnum.ADMIN: ["read", "write", "admin"],
        RoleEnum.MEMBER: ["read", "write"],
        RoleEnum.READONLY: ["read"],
    }.items():
        role_repo.create(Role(id=role.value, name=role.value, permissions=permissions))

    member_repo = MemberRepo(storage)
    member_repo.create(Member(id=1, name="owner", role=RoleEnum.OWNER, created_at=_ts()))
    member_repo.create(Member(id=2, name="admin", role=RoleEnum.ADMIN, created_at=_ts()))
    member_repo.create(Member(id=3, name="alice", role=RoleEnum.MEMBER, created_at=_ts()))
    TeamRepo(storage).create(Team(id=1, name="core", description="核心团队"))
    seed_default_rules(storage)

    return ServiceBus(storage, trace_path=str(tmp_path / "trace.jsonl"))


def test_duplicate_member_name_denied(env):
    with pytest.raises(GXError) as exc:
        env.member_add(subject_id=2, name="alice", role="member")
    assert exc.value.code == ERR_BUSINESS_VALIDATION


def test_duplicate_team_name_denied(env):
    with pytest.raises(GXError) as exc:
        env.team_add(subject_id=2, name="core")
    assert exc.value.code == ERR_BUSINESS_VALIDATION


def test_admin_cannot_grant_owner(env):
    with pytest.raises(GXError) as exc:
        env.role_assign(subject_id=2, member_id=3, role="owner")
    assert exc.value.code == ERR_BUSINESS_VALIDATION


def test_admin_cannot_modify_owner_member(env):
    with pytest.raises(GXError) as exc:
        env.role_assign(subject_id=2, member_id=1, role="member")
    assert exc.value.code == ERR_BUSINESS_VALIDATION


def test_owner_can_grant_owner(env):
    updated = env.role_assign(subject_id=1, member_id=3, role="owner")
    assert updated.role == RoleEnum.OWNER
