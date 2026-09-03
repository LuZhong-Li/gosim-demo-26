"""集成测试：PR 评审流 GitHub 语义（S1）。"""

from datetime import UTC, datetime

import pytest

from constants import ERR_BUSINESS_VALIDATION
from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.domain.enums import Role as RoleEnum
from gx.domain.models import Member, Role, Team
from gx.domain.repositories import AuditRepo, MemberRepo, RoleRepo, TeamRepo
from gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=UTC)


@pytest.fixture
def pr_env(tmp_path):
    path = str(tmp_path / "pr.xlsx")
    storage = LocalXlsxStorage.create_workbook(path)
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
    member_repo.create(Member(id=1, name="admin", role=RoleEnum.ADMIN, created_at=_ts()))
    member_repo.create(Member(id=2, name="alice", role=RoleEnum.MEMBER, created_at=_ts()))
    member_repo.create(Member(id=3, name="carol", role=RoleEnum.READONLY, created_at=_ts()))
    TeamRepo(storage).create(Team(id=1, name="core", description="核心团队"))
    seed_default_rules(storage)

    bus = ServiceBus(storage, trace_path=str(tmp_path / "trace.jsonl"))
    return bus, storage


def test_approve_self_denied(pr_env):
    bus, _ = pr_env
    bus.create_pr(subject_id=2, title="mine")
    with pytest.raises(GXError) as exc:
        bus.approve_pr(subject_id=2, pr_id=1, approver="alice")
    assert exc.value.code == ERR_BUSINESS_VALIDATION


def test_approve_unknown_member_denied(pr_env):
    bus, storage = pr_env
    bus.create_pr(subject_id=1, title="demo")
    with pytest.raises(GXError) as exc:
        bus.approve_pr(subject_id=1, pr_id=1, approver="ghost")
    assert exc.value.code == ERR_BUSINESS_VALIDATION
    entries = AuditRepo(storage).list()
    assert entries[-1].action_type == "pr.approve"
    assert entries[-1].success is False


def test_duplicate_approval_denied(pr_env):
    bus, _ = pr_env
    bus.create_pr(subject_id=1, title="demo")
    bus.approve_pr(subject_id=1, pr_id=1, approver="alice")
    with pytest.raises(GXError) as exc:
        bus.approve_pr(subject_id=1, pr_id=1, approver="alice")
    assert exc.value.code == ERR_BUSINESS_VALIDATION


def test_approve_merged_pr_denied(pr_env):
    bus, _ = pr_env
    bus.create_pr(subject_id=1, title="demo")
    bus.approve_pr(subject_id=1, pr_id=1, approver="alice")
    bus.merge_pr(subject_id=1, pr_id=1)
    with pytest.raises(GXError) as exc:
        bus.approve_pr(subject_id=1, pr_id=1, approver="carol")
    assert exc.value.code == ERR_BUSINESS_VALIDATION


def test_merge_merged_pr_denied(pr_env):
    bus, _ = pr_env
    bus.create_pr(subject_id=1, title="demo")
    bus.approve_pr(subject_id=1, pr_id=1, approver="alice")
    bus.merge_pr(subject_id=1, pr_id=1)
    with pytest.raises(GXError) as exc:
        bus.merge_pr(subject_id=1, pr_id=1)
    assert exc.value.code == ERR_BUSINESS_VALIDATION
