"""集成测试：工作流失败时 required-check 阻止 PR 合并。"""

from datetime import datetime, timezone

import pytest

from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.domain.enums import PRStatus, Role as RoleEnum, RunStatus
from gx.domain.models import Member, Role, Team, Workflow
from gx.domain.repositories import (
    MemberRepo,
    RoleRepo,
    TeamRepo,
    WorkflowRepo,
)
from gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=timezone.utc)


@pytest.fixture
def env(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "wf.xlsx"))
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
    TeamRepo(storage).create(Team(id=1, name="core", description="核心团队"))

    workflow_repo = WorkflowRepo(storage)
    workflow_repo.create(
        Workflow(id=1, name="ci-check", steps=[{"type": "shell", "command": "echo ok"}])
    )
    workflow_repo.create(
        Workflow(id=2, name="ci-fail", steps=[{"type": "shell", "command": "exit 1"}])
    )
    seed_default_rules(storage)

    bus = ServiceBus(storage, trace_path=str(tmp_path / "trace.jsonl"))
    return bus


def test_failed_workflow_blocks_merge(env):
    env.create_pr(subject_id=1, title="demo")
    env.approve_pr(subject_id=1, pr_id=1, approver="alice")
    run = env.run_workflow(subject_id=1, name="ci-fail")
    assert run.status == RunStatus.FAILED
    with pytest.raises(GXError) as exc_info:
        env.merge_pr(subject_id=1, pr_id=1)
    assert exc_info.value.code == "R001"


def test_successful_workflow_allows_merge(env):
    env.create_pr(subject_id=1, title="demo")
    env.approve_pr(subject_id=1, pr_id=1, approver="alice")
    run = env.run_workflow(subject_id=1, name="ci-check")
    assert run.status == RunStatus.SUCCESS
    merged = env.merge_pr(subject_id=1, pr_id=1)
    assert merged.status == PRStatus.MERGED
