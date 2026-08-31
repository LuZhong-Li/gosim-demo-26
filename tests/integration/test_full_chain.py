"""集成测试：完整管控链路。

创建成员 → 创建 PR → 权限拦截 → Rulesets 阻止非法合并 → 审批 → 合并
→ 审计哈希链 + trace 留痕。
"""

from datetime import datetime, timezone
from pathlib import Path

import pytest

from demo.init_seed import SHEET_COLUMNS
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.domain.enums import PRStatus, Role as RoleEnum
from gx.domain.models import Member, Role, Team
from gx.domain.repositories import AuditRepo, MemberRepo, RoleRepo, TeamRepo
from gx.services.audit.interceptor import audit_hash
from gx.services.audit.trace import TraceWriter
from gx.storage.xlsx import LocalXlsxStorage
from tools.check_trace import check_trace


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=timezone.utc)


@pytest.fixture
def env(tmp_path):
    path = str(tmp_path / "chain.xlsx")
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

    trace_path = str(tmp_path / "trace.jsonl")
    bus = ServiceBus(storage, trace_path=trace_path)
    return bus, storage, trace_path


def test_full_chain(env):
    bus, storage, trace_path = env

    # 创建 PR
    pr = bus.create_pr(subject_id=1, title="demo change")
    assert pr.id == 1

    # 权限拦截：readonly 创建 PR 被拒（P001）
    with pytest.raises(GXError) as exc_info:
        bus.create_pr(subject_id=3, title="hack")
    assert exc_info.value.code == "P001"

    # Rulesets 阻止非法合并（无审批人，R001）
    with pytest.raises(GXError) as exc_info:
        bus.merge_pr(subject_id=1, pr_id=1)
    assert exc_info.value.code == "R001"

    # 审批后合并成功
    bus.approve_pr(subject_id=1, pr_id=1, approver="alice")
    merged = bus.merge_pr(subject_id=1, pr_id=1)
    assert merged.status == PRStatus.MERGED

    # 人工干预留痕
    TraceWriter(trace_path).log_human_intervene("人工确认最终提交")

    # 审计留痕：5 条记录，哈希链逐条可验证
    entries = AuditRepo(storage).list()
    assert len(entries) == 5
    for index in range(1, len(entries)):
        assert entries[index].prev_hash == audit_hash(entries[index - 1].to_row())
    assert {entry.action_type for entry in entries} == {
        "pr.create",
        "permission.deny",
        "pr.merge",
        "pr.approve",
    }

    # trace 留痕：check_trace 校验通过（含 human_intervene）
    assert Path(trace_path).is_file()
    assert check_trace(trace_path) == []
