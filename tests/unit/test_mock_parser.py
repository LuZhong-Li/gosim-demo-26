"""Mock Agent 自然语言解析单元测试。"""

from datetime import datetime, timezone

import pytest

from agent.mock_nl_parser import MockNlParser
from demo.init_seed import SHEET_COLUMNS
from gx.core.service_bus import ServiceBus
from gx.domain.enums import Role as RoleEnum
from gx.domain.models import Member, Role, Team, Workflow
from gx.domain.repositories import MemberRepo, RoleRepo, TeamRepo, WorkflowRepo
from gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=timezone.utc)


@pytest.fixture
def agent(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "agent.xlsx"))
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
    TeamRepo(storage).create(Team(id=1, name="core", description="核心团队"))
    WorkflowRepo(storage).create(
        Workflow(id=1, name="ci-check", steps=[{"type": "shell", "command": "echo ok"}])
    )

    bus = ServiceBus(storage, trace_path=str(tmp_path / "trace.jsonl"))
    return MockNlParser(bus, actor=1), bus


def test_add_member(agent):
    parser, bus = agent
    result = parser.parse("添加成员 bob 为 member")
    assert "bob" in result
    assert any(
        member.name == "bob" and member.role == RoleEnum.MEMBER
        for member in bus.list_members()
    )


def test_add_member_default_role(agent):
    parser, _ = agent
    result = parser.parse("添加成员 carol")
    assert "member" in result


def test_list_members(agent):
    parser, _ = agent
    result = parser.parse("列出成员")
    assert "admin" in result


def test_run_workflow(agent):
    parser, _ = agent
    result = parser.parse("运行工作流 ci-check")
    assert "success" in result


def test_create_pr(agent):
    parser, bus = agent
    result = parser.parse("创建 PR demo change")
    assert "demo change" in result
    assert [pr.title for pr in bus.list_prs()] == ["demo change"]


def test_approve_and_merge_pr(agent):
    parser, bus = agent
    parser.parse("创建 PR demo change")
    parser.parse("审批 PR 1 admin")
    result = parser.parse("合并 PR 1")
    assert "merged" in result
    assert bus.list_prs()[0].status.value == "merged"


def test_unknown_instruction(agent):
    parser, _ = agent
    with pytest.raises(ValueError):
        parser.parse("来杯咖啡")
