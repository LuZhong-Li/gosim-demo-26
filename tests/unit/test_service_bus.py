"""ServiceBus（PR 编排）单元测试。"""

from datetime import datetime, timezone

import pytest

from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.domain.enums import PRStatus, Role as RoleEnum
from gx.domain.models import Member, Role, Team
from gx.domain.repositories import AuditRepo, MemberRepo, RoleRepo, TeamRepo
from gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=timezone.utc)


@pytest.fixture
def bus(tmp_path):
    path = str(tmp_path / "bus.xlsx")
    storage = LocalXlsxStorage.create_workbook(path)
    for sheet_name, columns in SHEET_COLUMNS.items():
        storage.add_sheet(sheet_name, columns)
    storage.remove_sheet("Sheet")

    role_repo = RoleRepo(storage)
    permissions_by_role = {
        RoleEnum.OWNER: ["read", "write", "admin"],
        RoleEnum.ADMIN: ["read", "write", "admin"],
        RoleEnum.MEMBER: ["read", "write"],
        RoleEnum.READONLY: ["read"],
    }
    for role, permissions in permissions_by_role.items():
        role_repo.create(Role(id=role.value, name=role.value, permissions=permissions))

    member_repo = MemberRepo(storage)
    member_repo.create(Member(id=1, name="admin", role=RoleEnum.ADMIN, created_at=_ts()))
    member_repo.create(Member(id=2, name="alice", role=RoleEnum.MEMBER, created_at=_ts()))
    member_repo.create(
        Member(id=3, name="carol", role=RoleEnum.READONLY, created_at=_ts())
    )
    TeamRepo(storage).create(Team(id=1, name="core", description="核心团队"))
    seed_default_rules(storage)

    return ServiceBus(storage, trace_path=str(tmp_path / "trace.jsonl")), storage


def test_create_pr(bus):
    service, storage = bus
    pr = service.create_pr(subject_id=1, title="demo change")
    assert pr.id == 1
    assert pr.author == "admin"
    assert pr.status == PRStatus.OPEN
    assert [item.title for item in service.list_prs()] == ["demo change"]
    entries = AuditRepo(storage).list()
    assert [entry.action_type for entry in entries] == ["pr.create"]


def test_merge_without_approval_raises_r001(bus):
    service, storage = bus
    service.create_pr(subject_id=1, title="demo")
    with pytest.raises(GXError) as exc_info:
        service.merge_pr(subject_id=1, pr_id=1)
    assert exc_info.value.code == "R001"
    entries = AuditRepo(storage).list()
    assert entries[-1].action_type == "pr.merge"
    assert entries[-1].success is False


def test_approve_then_merge(bus):
    service, storage = bus
    service.create_pr(subject_id=1, title="demo")
    service.approve_pr(subject_id=1, pr_id=1, approver="alice")
    merged = service.merge_pr(subject_id=1, pr_id=1)
    assert merged.status == PRStatus.MERGED
    entries = AuditRepo(storage).list()
    assert [entry.action_type for entry in entries] == [
        "pr.create",
        "pr.approve",
        "pr.merge",
    ]


def test_readonly_cannot_create_pr(bus):
    service, storage = bus
    with pytest.raises(GXError) as exc_info:
        service.create_pr(subject_id=3, title="hack")
    assert exc_info.value.code == "P001"
    entries = AuditRepo(storage).list()
    assert entries[-1].action_type == "permission.deny"
    assert entries[-1].success is False
