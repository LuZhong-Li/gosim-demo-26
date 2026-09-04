"""trace replay HTML 只读渲染单元测试（评审优化第二轮 Task 6）。"""

import json
from pathlib import Path

from typer.testing import CliRunner

from gx.api.cli import cli
from gx.services.trace_replay import render_trace

runner = CliRunner(mix_stderr=False)


def test_render_trace_includes_events_and_escapes_html():
    events = [
        {
            "timestamp": "2026-09-01T00:00:00Z",
            "type": "api_call",
            "actor": "1",
            "action": "member.add",
            "resource": "sheet:members",
            "detail": {"name": "a<b>c"},
            "success": True,
            "error_msg": "",
        }
    ]

    html = render_trace(events)

    assert "member.add" in html
    assert "api_call" in html
    assert "a&lt;b&gt;c" in html


def test_trace_replay_cli_writes_html(tmp_path):
    source = tmp_path / "trace.jsonl"
    source.write_text(
        json.dumps(
            {
                "timestamp": "2026-09-01T00:00:00Z",
                "type": "api_call",
                "actor": "1",
                "action": "member.add",
                "resource": "sheet:members",
                "detail": {"name": "bob"},
                "success": True,
                "error_msg": "",
            }
        )
        + "\n",
        encoding="utf-8",
    )
    out = tmp_path / "trace.html"

    result = runner.invoke(
        cli,
        ["trace", "replay", "--source", str(source), "--out", str(out)],
    )

    assert result.exit_code == 0
    assert Path(out).is_file()
    assert "member.add" in Path(out).read_text(encoding="utf-8")
