"""gx trace CLI 单元测试（评审优化第一轮切片 4）。

覆盖：trace check 通过/失败路径；trace export 复制一致、目标被校验、
源==目标报错、源缺失 S001、源非法时不生成目标文件。
"""

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from gx.api.cli import cli

runner = CliRunner(mix_stderr=False)


def _valid_line(event_type: str) -> dict:
    return {
        "timestamp": "2026-09-01T00:00:00Z",
        "type": event_type,
        "actor": "1" if event_type == "api_call" else "human",
        "action": "member.add" if event_type == "api_call" else "human_intervene",
        "resource": "members" if event_type == "api_call" else "",
        "detail": {"ok": True} if event_type == "api_call" else "人工确认",
        "success": True,
        "error_msg": "",
    }


@pytest.fixture
def valid_trace(tmp_path) -> str:
    path = tmp_path / "trace.jsonl"
    path.write_text(
        "\n".join(
            json.dumps(_valid_line(event_type), ensure_ascii=False)
            for event_type in ("api_call", "human_intervene")
        )
        + "\n",
        encoding="utf-8",
    )
    return str(path)


@pytest.fixture
def invalid_trace(tmp_path) -> str:
    path = tmp_path / "bad.jsonl"
    path.write_text("{not-json}\n", encoding="utf-8")
    return str(path)


def test_trace_group_shown_in_help():
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "trace" in result.output


def test_trace_check_ok(valid_trace):
    result = runner.invoke(cli, ["trace", "check", valid_trace])
    assert result.exit_code == 0
    assert "[OK]" in result.output
    assert "2" in result.output


def test_trace_check_fails_on_invalid_json(invalid_trace):
    result = runner.invoke(cli, ["trace", "check", invalid_trace])
    assert result.exit_code == 1
    assert "JSON" in result.stderr


def test_trace_export_copies_and_validates(valid_trace, tmp_path):
    dest = str(tmp_path / "export.jsonl")
    result = runner.invoke(cli, ["trace", "export", dest, "--source", valid_trace])
    assert result.exit_code == 0
    assert Path(dest).read_text(encoding="utf-8") == Path(valid_trace).read_text(
        encoding="utf-8"
    )


def test_trace_export_rejects_same_source_and_dest(valid_trace):
    result = runner.invoke(cli, ["trace", "export", valid_trace, "--source", valid_trace])
    assert result.exit_code == 1
    assert "参数错误" in result.stderr


def test_trace_export_missing_source(tmp_path):
    dest = str(tmp_path / "out.jsonl")
    result = runner.invoke(
        cli,
        ["trace", "export", dest, "--source", str(tmp_path / "no-such.jsonl")],
    )
    assert result.exit_code == 1
    assert "S001" in result.stderr
    assert not Path(dest).exists()


def test_trace_export_rejects_invalid_source(invalid_trace, tmp_path):
    dest = str(tmp_path / "out.jsonl")
    result = runner.invoke(cli, ["trace", "export", dest, "--source", invalid_trace])
    assert result.exit_code == 1
    assert not Path(dest).exists()
