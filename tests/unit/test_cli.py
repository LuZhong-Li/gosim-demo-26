"""CLI 单元测试：使用 typer CliRunner 与临时工作簿。"""

from datetime import datetime, timezone

import pytest
from typer.testing import CliRunner

from demo.init_seed import SHEET_COLUMNS
from gx.api.cli import cli
from gx.domain.enums import Role as RoleEnum
from gx.domain.models import Member, Role, Team
from gx.domain.repositories import MemberRepo, RoleRepo, TeamRepo
from gx.storage.xlsx import LocalXlsxStorage

runner = CliRunner(mix_stderr=False)


@pytest.fixture(autouse=True)
def _trace_tmp(tmp_path, monkeypatch):
    """所有 CLI 用例的 trace 输出指向临时文件，避免污染仓库。"""
    monkeypatch.setattr(
        "gx.api.cli.TRACE_OUTPUT_PATH", str(tmp_path / "trace.jsonl")
    )


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=timezone.utc)


def _build_workbook(path: str) -> None:
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
        role_repo.create(
            Role(id=role.value, name=role.value, permissions=permissions)
        )

    member_repo = MemberRepo(storage)
    member_repo.create(
        Member(id=1, name="admin", role=RoleEnum.ADMIN, created_at=_ts())
    )
    member_repo.create(
        Member(id=2, name="alice", role=RoleEnum.MEMBER, created_at=_ts())
    )
    member_repo.create(
        Member(id=3, name="bob", role=RoleEnum.MEMBER, created_at=_ts())
    )
    member_repo.create(
        Member(id=4, name="carol", role=RoleEnum.READONLY, created_at=_ts())
    )

    team_repo = TeamRepo(storage)
    team_repo.create(Team(id=1, name="core", description="核心团队"))


@pytest.fixture
def workbook_path(tmp_path):
    path = str(tmp_path / "cli.xlsx")
    _build_workbook(path)
    return path


def test_cli_help_shows_groups():
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "member" in result.output
    assert "team" in result.output
    assert "role" in result.output
    assert "pr" in result.output


def test_member_list(workbook_path):
    result = runner.invoke(cli, ["--workbook", workbook_path, "member", "list"])
    assert result.exit_code == 0
    assert "admin" in result.output
    assert "alice" in result.output
    assert "carol" in result.output


def test_member_add(workbook_path):
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "member", "add", "dave", "member"],
    )
    assert result.exit_code == 0
    assert "dave" in result.output
    listed = runner.invoke(cli, ["--workbook", workbook_path, "member", "list"])
    assert "dave" in listed.output


def test_member_add_denied_for_readonly(workbook_path):
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "4", "member", "add", "eve", "member"],
    )
    assert result.exit_code == 1
    assert "P001" in result.stderr


def test_member_add_invalid_role(workbook_path):
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "member", "add", "eve", "superuser"],
    )
    assert result.exit_code == 1
    assert "参数错误" in result.stderr


def test_team_add_and_list(workbook_path):
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "team", "add", "data", "数据团队"],
    )
    assert result.exit_code == 0
    assert "data" in result.output
    listed = runner.invoke(cli, ["--workbook", workbook_path, "team", "list"])
    assert "core" in listed.output
    assert "data" in listed.output


def test_role_assign(workbook_path):
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "role", "assign", "3", "readonly"],
    )
    assert result.exit_code == 0
    assert "readonly" in result.output
    listed = runner.invoke(cli, ["--workbook", workbook_path, "member", "list"])
    assert "3\tbob\treadonly" in listed.output


def test_role_assign_missing_member(workbook_path):
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "role", "assign", "99", "readonly"],
    )
    assert result.exit_code == 1
    assert "S004" in result.stderr


def test_pr_full_flow(workbook_path):
    created = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "pr", "create", "--title", "demo change"],
    )
    assert created.exit_code == 0
    assert "demo change" in created.output

    blocked = runner.invoke(
        cli, ["--workbook", workbook_path, "--actor", "1", "pr", "merge", "1"]
    )
    assert blocked.exit_code == 1
    assert "R001" in blocked.stderr

    approved = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "pr", "approve", "1", "alice"],
    )
    assert approved.exit_code == 0

    merged = runner.invoke(
        cli, ["--workbook", workbook_path, "--actor", "1", "pr", "merge", "1"]
    )
    assert merged.exit_code == 0
    assert "merged" in merged.output

    listed = runner.invoke(cli, ["--workbook", workbook_path, "pr", "list"])
    assert "demo change" in listed.output
    assert "merged" in listed.output
