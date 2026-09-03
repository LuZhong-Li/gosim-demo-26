"""领域层单元测试：模型解析/校验、仓储 CRUD、audit 只追加约束。

使用 pytest 临时工作簿，不污染种子工作簿。
"""

from datetime import UTC, datetime

import pytest

from demo.init_seed import SHEET_COLUMNS
from errors import GXError
from gx.domain.enums import (
    PRStatus,
    RunStatus,
    Source,
    TriggerType,
)
from gx.domain.enums import (
    Role as RoleEnum,
)
from gx.domain.models import (
    AuditLogEntry,
    Member,
    PullRequest,
    Role,
    Team,
    Workflow,
    WorkflowRun,
)
from gx.domain.repositories import (
    AuditRepo,
    MemberRepo,
    PRRepo,
    RoleRepo,
    TeamRepo,
    WorkflowRepo,
    WorkflowRunRepo,
)
from gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 8, 31, tzinfo=UTC)


@pytest.fixture
def storage(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "domain.xlsx"))
    for sheet_name, columns in SHEET_COLUMNS.items():
        storage.add_sheet(sheet_name, columns)
    storage.remove_sheet("Sheet")
    return storage


@pytest.fixture
def member_repo(storage):
    return MemberRepo(storage)


def test_member_parse_raw():
    member = Member.parse_raw(
        {
            "id": 1,
            "name": "alice",
            "role": "member",
            "team_id": None,
            "created_at": "2026-08-31T00:00:00+00:00",
        }
    )
    assert member.id == 1
    assert member.role == RoleEnum.MEMBER
    assert member.created_at == _ts()


def test_member_parse_invalid_role_raises_d001():
    with pytest.raises(GXError) as exc_info:
        Member.parse_raw(
            {
                "id": 1,
                "name": "alice",
                "role": "superuser",
                "created_at": "2026-08-31T00:00:00+00:00",
            }
        )
    assert exc_info.value.code == "D001"


def test_member_parse_empty_name_raises_d001():
    with pytest.raises(GXError) as exc_info:
        Member.parse_raw(
            {
                "id": 1,
                "name": "",
                "role": "member",
                "created_at": "2026-08-31T00:00:00+00:00",
            }
        )
    assert exc_info.value.code == "D001"


def test_member_parse_invalid_id_raises_d001():
    with pytest.raises(GXError) as exc_info:
        Member.parse_raw(
            {
                "id": 0,
                "name": "alice",
                "role": "member",
                "created_at": "2026-08-31T00:00:00+00:00",
            }
        )
    assert exc_info.value.code == "D001"


def test_member_parse_invalid_timestamp_raises_d001():
    with pytest.raises(GXError) as exc_info:
        Member.parse_raw({"id": 1, "name": "alice", "role": "member", "created_at": "not-a-date"})
    assert exc_info.value.code == "D001"


def test_member_parse_unknown_field_rejected():
    with pytest.raises(GXError) as exc_info:
        Member.parse_raw(
            {
                "id": 1,
                "name": "alice",
                "role": "member",
                "created_at": "2026-08-31T00:00:00+00:00",
                "extra": 1,
            }
        )
    assert exc_info.value.code == "D001"


def test_member_to_row_round_trip():
    member = Member(id=1, name="alice", role=RoleEnum.MEMBER, created_at=_ts())
    row = member.to_row()
    assert row["role"] == "member"
    assert Member.parse_raw(row) == member


def test_role_permissions_json_round_trip():
    role = Role(id="admin", name="admin", permissions=["read", "write", "admin"])
    row = role.to_row()
    assert isinstance(row["permissions"], str)
    assert Role.parse_raw(row).permissions == ["read", "write", "admin"]


def test_role_parse_comma_separated_legacy():
    role = Role.parse_raw({"id": "owner", "name": "owner", "permissions": "read,write,admin"})
    assert role.permissions == ["read", "write", "admin"]


def test_empty_string_field_round_trip(storage):
    team_repo = TeamRepo(storage)
    team_repo.create(Team(id=1, name="core", description=""))
    loaded = team_repo.get(1)
    assert loaded.description == ""


def test_audit_entry_snapshot_round_trip():
    entry = AuditLogEntry(
        actor_id="system",
        action_type="create",
        resource_type="member",
        resource_id="1",
        after_snapshot={"name": "alice"},
        timestamp=_ts(),
    )
    row = entry.to_row()
    assert isinstance(row["after_snapshot"], str)
    reparsed = AuditLogEntry.parse_raw(row)
    assert reparsed.after_snapshot == {"name": "alice"}
    assert reparsed.source == Source.CLI
    assert len(reparsed.prev_hash) == 64


def test_member_repo_crud(member_repo):
    member = Member(id=1, name="alice", role=RoleEnum.MEMBER, created_at=_ts())
    member_repo.create(member)
    assert member_repo.get(1) == member
    updated = member_repo.update(1, {"role": "admin"})
    assert updated.role == RoleEnum.ADMIN
    assert member_repo.get(1).role == RoleEnum.ADMIN
    assert [m.name for m in member_repo.list()] == ["alice"]


def test_member_repo_get_missing_raises_s004(member_repo):
    with pytest.raises(GXError) as exc_info:
        member_repo.get(99)
    assert exc_info.value.code == "S004"


def test_role_and_team_repo(storage):
    role_repo = RoleRepo(storage)
    team_repo = TeamRepo(storage)
    role_repo.create(Role(id="owner", name="owner", permissions=["read", "write", "admin"]))
    team_repo.create(Team(id=1, name="core", description="核心团队"))
    assert role_repo.get("owner").permissions == ["read", "write", "admin"]
    assert team_repo.get(1).name == "core"
    assert role_repo.update("owner", {"permissions": ["read"]}).permissions == ["read"]


def test_pr_repo_approvers(storage):
    pr_repo = PRRepo(storage)
    pr = PullRequest(
        id=1,
        title="demo change",
        author="alice",
        status=PRStatus.OPEN,
        approvers=["alice"],
        created_at=_ts(),
    )
    pr_repo.create(pr)
    loaded = pr_repo.get(1)
    assert loaded.approvers == ["alice"]
    assert loaded.status == PRStatus.OPEN


def test_workflow_repo_steps(storage):
    workflow_repo = WorkflowRepo(storage)
    workflow = Workflow(
        id=1,
        name="ci-check",
        steps=[{"run": "echo ok"}],
        trigger=TriggerType.MANUAL,
    )
    workflow_repo.create(workflow)
    loaded = workflow_repo.get(1)
    assert loaded.steps == [{"run": "echo ok"}]


def test_workflow_run_repo(storage):
    run_repo = WorkflowRunRepo(storage)
    run = WorkflowRun(
        id=1,
        workflow_id=1,
        status=RunStatus.SUCCESS,
        started_at=_ts(),
        finished_at=_ts(),
    )
    run_repo.create(run)
    loaded = run_repo.get(1)
    assert loaded.status == RunStatus.SUCCESS
    assert loaded.finished_at == _ts()


def test_audit_repo_append_only(storage):
    audit_repo = AuditRepo(storage)
    entry = AuditLogEntry(
        actor_id="system",
        action_type="create",
        resource_type="member",
        resource_id="1",
        timestamp=_ts(),
    )
    audit_repo.create(entry)
    assert len(audit_repo.list()) == 1
    assert audit_repo.get(0).actor_id == "system"
    with pytest.raises(GXError) as exc_info:
        audit_repo.update(0, {"action_type": "hacked"})
    assert exc_info.value.code == "A001"
    with pytest.raises(GXError) as exc_info:
        audit_repo.delete(0)
    assert exc_info.value.code == "A001"
