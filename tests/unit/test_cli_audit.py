"""gx audit export CLI 测试（S4）。"""

import json

import pytest
from typer.testing import CliRunner

from demo.init_seed import create_seed_workbook
from gx.api.cli import cli

runner = CliRunner(mix_stderr=False)


@pytest.fixture(autouse=True)
def _trace_tmp(tmp_path, monkeypatch):
    monkeypatch.setattr("gx.api.cli.TRACE_OUTPUT_PATH", str(tmp_path / "trace.jsonl"))


@pytest.fixture
def workbook_path(tmp_path):
    path = str(tmp_path / "seed.xlsx")
    create_seed_workbook(path)
    return path


def test_audit_export_writes_json(workbook_path, tmp_path):
    created = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "pr", "create", "--title", "demo"],
    )
    assert created.exit_code == 0

    dest = str(tmp_path / "audit.json")
    result = runner.invoke(
        cli,
        ["--workbook", workbook_path, "--actor", "1", "audit", "export", dest],
    )
    assert result.exit_code == 0
    assert "审计已导出" in result.output

    rows = json.loads(open(dest, encoding="utf-8").read())
    assert any(row["action_type"] == "pr.create" for row in rows)
