"""Rulesets 启用/禁用集成测试（评审优化第一轮切片 7）。

链路：禁用 required_check 后失败工作流不再拦合并；禁用 approval 后无审批可
合并；规则变更全程审计哈希链可验证，trace 通过 check_trace（含 human_intervene）。
"""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.domain.enums import PRStatus, RunStatus
from gx.domain.enums import Role as RoleEnum
from gx.domain.models import Member, Role, Team, Workflow
from gx.domain.repositories import (
    AuditRepo,
    MemberRepo,
    RoleRepo,
    TeamRepo,
    WorkflowRepo,
)
from gx.services.audit.interceptor import audit_hash
from gx.services.audit.trace import TraceWriter
from gx.storage.xlsx import LocalXlsxStorage
from tools.check_trace import check_trace


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=UTC)


@pytest.fixture
def env(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "toggle.xlsx"))
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

    trace_path = str(tmp_path / "trace.jsonl")
    bus = ServiceBus(storage, trace_path=trace_path)
    return bus, storage, trace_path


def test_disable_required_check_allows_merge_after_failed_run(env):
    bus, storage, _ = env
    pr = bus.create_pr(subject_id=1, title="demo")
    bus.approve_pr(subject_id=1, pr_id=pr.id, approver="alice")

    run = bus.run_workflow(subject_id=1, name="ci-fail")
    assert run.status == RunStatus.FAILED
    with pytest.raises(GXError) as exc_info:
        bus.merge_pr(subject_id=1, pr_id=pr.id)
    assert exc_info.value.code == "R001"

    bus.ruleset_set_enabled(subject_id=1, rule_id="required_check", enabled=False)
    merged = bus.merge_pr(subject_id=1, pr_id=pr.id)
    assert merged.status == PRStatus.MERGED


def test_disable_approval_allows_merge_without_approver(env):
    bus, _, _ = env
    pr = bus.create_pr(subject_id=1, title="no-review")
    with pytest.raises(GXError) as exc_info:
        bus.merge_pr(subject_id=1, pr_id=pr.id)
    assert exc_info.value.code == "R001"

    bus.ruleset_set_enabled(subject_id=1, rule_id="approval", enabled=False)
    merged = bus.merge_pr(subject_id=1, pr_id=pr.id)
    assert merged.status == PRStatus.MERGED


def test_toggle_keeps_audit_chain_and_trace_valid(env):
    bus, storage, trace_path = env
    bus.ruleset_set_enabled(subject_id=1, rule_id="approval", enabled=False)
    bus.ruleset_set_enabled(subject_id=1, rule_id="approval", enabled=True)
    bus.ruleset_set_enabled(subject_id=1, rule_id="required_check", enabled=False)
    bus.ruleset_set_enabled(subject_id=1, rule_id="required_check", enabled=True)
    TraceWriter(trace_path).log_human_intervene("人工确认规则切换链路")

    entries = AuditRepo(storage).list()
    actions = [entry.action_type for entry in entries]
    assert actions == ["ruleset.update"] * 4
    for index in range(1, len(entries)):
        assert entries[index].prev_hash == audit_hash(entries[index - 1].to_row())

    assert Path(trace_path).is_file()
    assert check_trace(trace_path) == []
