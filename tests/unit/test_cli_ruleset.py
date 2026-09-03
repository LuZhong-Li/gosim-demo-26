"""gx ruleset CLI 单元测试（评审优化第一轮切片 3）。

覆盖：list 展示两条规则、enable/disable 成功、readonly 越权 P001、
未知 rule_id S004。trace 全部指向临时路径。
"""

from datetime import UTC, datetime

import pytest
from typer.testing import CliRunner

from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from gx.api.cli import cli
from gx.domain.enums import Role as RoleEnum
from gx.domain.enums import RuleStatus
from gx.domain.models import Member, Role
from gx.domain.repositories import MemberRepo, RoleRepo, RuleSetRepo
from gx.storage.xlsx import LocalXlsxStorage

runner = CliRunner(mix_stderr=False)


@pytest.fixture(autouse=True)
def _trace_tmp(tmp_path, monkeypatch):
    """trace 输出指向临时文件，避免污染仓库基线。"""
    monkeypatch.setattr("gx.api.cli.TRACE_OUTPUT_PATH", str(tmp_path / "trace.jsonl"))


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=UTC)


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
        role_repo.create(Role(id=role.value, name=role.value, permissions=permissions))

    member_repo = MemberRepo(storage)
    member_repo.create(Member(id=1, name="admin", role=RoleEnum.ADMIN, created_at=_ts()))
    member_repo.create(Member(id=2, name="bob", role=RoleEnum.MEMBER, created_at=_ts()))
    member_repo.create(Member(id=3, name="carol", role=RoleEnum.READONLY, created_at=_ts()))
    seed_default_rules(storage)


@pytest.fixture
def workbook_path(tmp_path):
    path = str(tmp_path / "cli_ruleset.xlsx")
    _build_workbook(path)
    return path


def test_ruleset_group_shown_in_help():
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "ruleset" in result.output


def test_ruleset_list_shows_two_rules(workbook_path):
    result = runner.invoke(cli, ["--workbook", workbook_path, "--actor", "1", "ruleset", "list"])
    assert result.exit_code == 0
    assert "approval" in result.output
    assert "required_check" in result.output
    assert "active" in result.output


def test_ruleset_disable_then_enable(workbook_path):
    disabled = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "ruleset", "disable", "approval"],
    )
    assert disabled.exit_code == 0
    assert "disabled" in disabled.output

    listed = runner.invoke(cli, ["--workbook", workbook_path, "--actor", "1", "ruleset", "list"])
    assert "approval\tapproval\tdisabled" in listed.output

    enabled = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "ruleset", "enable", "approval"],
    )
    assert enabled.exit_code == 0
    assert "active" in enabled.output


def test_ruleset_disable_is_idempotent_for_cli(workbook_path):
    first = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "ruleset", "disable", "approval"],
    )
    assert first.exit_code == 0
    second = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "ruleset", "disable", "approval"],
    )
    assert second.exit_code == 0
    storage = LocalXlsxStorage(workbook_path)
    assert RuleSetRepo(storage).get("approval").status == RuleStatus.DISABLED


def test_ruleset_disable_denied_for_readonly(workbook_path):
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "3", "ruleset", "disable", "approval"],
    )
    assert result.exit_code == 1
    assert "P001" in result.stderr
    storage = LocalXlsxStorage(workbook_path)
    assert RuleSetRepo(storage).get("approval").status == RuleStatus.ACTIVE


def test_ruleset_unknown_id_reports_s004(workbook_path):
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "ruleset", "disable", "nope"],
    )
    assert result.exit_code == 1
    assert "S004" in result.stderr
