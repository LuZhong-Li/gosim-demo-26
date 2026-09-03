"""Mock Agent Turn/Step 运行时单元测试（评审优化第二轮 Task 3）。"""

from datetime import UTC, datetime

import pytest

from agent.mock_nl_parser import MockNlParser
from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from gx.core.service_bus import ServiceBus
from gx.domain.enums import Role as RoleEnum
from gx.domain.models import Member, Role
from gx.domain.repositories import MemberRepo, RoleRepo
from gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=UTC)


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
    seed_default_rules(storage)

    trace_path = str(tmp_path / "trace.jsonl")
    bus = ServiceBus(storage, trace_path=trace_path)
    parser = MockNlParser(bus, actor=1, trace_path=trace_path)
    return parser, trace_path


def test_parse_turn_exposes_expected_step_sequence(agent):
    parser, _ = agent
    turn = parser.parse_turn("添加成员 bob 为 member")

    assert turn.response == "[OK] 已添加成员 bob（角色 member）"
    assert [step.kind for step in turn.steps] == ["intent", "tool_call", "result", "stop"]
    assert turn.steps[1].name == "member_add"
    assert turn.steps[1].params == {"name": "bob", "role": "member"}
