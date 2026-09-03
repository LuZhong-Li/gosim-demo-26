"""gx pr close / history CLI 测试（S1）。"""

import pytest
from typer.testing import CliRunner

from demo.init_seed import create_seed_workbook
from gx.api.cli import cli

runner = CliRunner(mix_stderr=False)


@pytest.fixture(autouse=True)
def _trace_tmp(tmp_path, monkeypatch):
    """CLI 写操作指向临时 trace，避免污染仓库正式轨迹。"""
    monkeypatch.setattr("gx.api.cli.TRACE_OUTPUT_PATH", str(tmp_path / "trace.jsonl"))


@pytest.fixture
def workbook_path(tmp_path):
    path = str(tmp_path / "seed.xlsx")
    create_seed_workbook(path)
    return path


def test_pr_close_via_cli(workbook_path):
    created = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "pr", "create", "--title", "demo"],
    )
    assert created.exit_code == 0

    result = runner.invoke(
        cli,
        [
            "--workbook",
            workbook_path,
            "--actor",
            "1",
            "pr",
            "close",
            "1",
            "--reason",
            "驳回",
        ],
    )
    assert result.exit_code == 0
    assert "已关闭" in result.output


def test_pr_history_via_cli(workbook_path):
    runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "pr", "create", "--title", "demo"],
    )
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "pr", "history", "1"],
    )
    assert result.exit_code == 0
    assert "pr.create" in result.output
