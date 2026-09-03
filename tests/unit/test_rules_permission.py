"""Rulesets 启用/禁用权限与留痕单元测试（评审优化第一轮切片 2）。

豆包验收点：普通角色 enable/disable 规则 → P001 + permission.deny 审计 +
trace api_call 三件齐全；admin 操作成功 → ruleset.update 审计 + trace，
哈希链完整。
"""

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.domain.enums import Role as RoleEnum
from gx.domain.enums import RuleStatus
from gx.domain.models import Member, Role, Team
from gx.domain.repositories import AuditRepo, MemberRepo, RoleRepo, RuleSetRepo, TeamRepo
from gx.services.audit.interceptor import audit_hash
from gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=UTC)


@pytest.fixture
def env(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "rules.xlsx"))
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
    member_repo.create(Member(id=2, name="bob", role=RoleEnum.MEMBER, created_at=_ts()))
    member_repo.create(Member(id=3, name="carol", role=RoleEnum.READONLY, created_at=_ts()))
    TeamRepo(storage).create(Team(id=1, name="core", description="核心团队"))
    seed_default_rules(storage)

    trace_path = str(tmp_path / "trace.jsonl")
    bus = ServiceBus(storage, trace_path=trace_path)
    return bus, storage, trace_path


def _last_trace(trace_path: str) -> dict:
    lines = Path(trace_path).read_text(encoding="utf-8").splitlines()
    return json.loads(lines[-1])


@pytest.mark.parametrize("actor_id,actor_name", [(2, "member"), (3, "readonly")])
def test_non_admin_cannot_toggle_rule(env, actor_id, actor_name):
    bus, storage, trace_path = env
    before = RuleSetRepo(storage).get("approval").status
    with pytest.raises(GXError) as exc_info:
        bus.ruleset_set_enabled(subject_id=actor_id, rule_id="approval", enabled=False)
    assert exc_info.value.code == "P001"

    entries = AuditRepo(storage).list()
    last = entries[-1]
    assert last.action_type == "permission.deny"
    assert last.success is False
    assert last.actor_id == str(actor_id)

    event = _last_trace(trace_path)
    assert event["type"] == "api_call"
    assert event["action"] == "permission.deny"
    assert event["success"] is False

    assert RuleSetRepo(storage).get("approval").status == before


def test_admin_disable_writes_audit_and_trace(env):
    bus, storage, trace_path = env
    updated = bus.ruleset_set_enabled(subject_id=1, rule_id="approval", enabled=False)
    assert updated.status == RuleStatus.DISABLED

    entries = AuditRepo(storage).list()
    last = entries[-1]
    assert last.action_type == "ruleset.update"
    assert last.resource_id == "approval"
    assert last.before_snapshot == {"status": "active"}
    assert last.after_snapshot == {"status": "disabled"}
    assert last.success is True
    for index in range(1, len(entries)):
        assert entries[index].prev_hash == audit_hash(entries[index - 1].to_row())

    event = _last_trace(trace_path)
    assert event["type"] == "api_call"
    assert event["action"] == "ruleset.update"
    assert event["detail"] == {"status": "disabled"}


def test_enable_and_idempotent_noop(env):
    bus, storage, _ = env
    bus.ruleset_set_enabled(subject_id=1, rule_id="required_check", enabled=False)
    assert RuleSetRepo(storage).get("required_check").status == RuleStatus.DISABLED
    count_after_disable = len(AuditRepo(storage).list())

    bus.ruleset_set_enabled(subject_id=1, rule_id="required_check", enabled=False)
    assert len(AuditRepo(storage).list()) == count_after_disable

    bus.ruleset_set_enabled(subject_id=1, rule_id="required_check", enabled=True)
    assert RuleSetRepo(storage).get("required_check").status == RuleStatus.ACTIVE


def test_list_rulesets_returns_seeded_rules(env):
    bus, _, _ = env
    rules = bus.list_rulesets()
    assert {rule.id for rule in rules} == {"approval", "required_check"}
