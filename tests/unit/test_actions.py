"""工作流执行器与触发器单元测试。"""

from pathlib import Path

import pytest

from demo.init_seed import SHEET_COLUMNS
from errors import GXError
from gx.domain.enums import RunStatus
from gx.domain.models import Workflow
from gx.domain.repositories import (
    AuditRepo,
    WorkflowRepo,
    WorkflowRunRepo,
)
from gx.services.actions.runner import WorkflowRunner
from gx.services.actions.trigger import WorkflowTrigger
from gx.services.audit.interceptor import AuditInterceptor
from gx.services.audit.trace import TraceWriter
from gx.storage.xlsx import LocalXlsxStorage


@pytest.fixture
def env(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "actions.xlsx"))
    for sheet_name, columns in SHEET_COLUMNS.items():
        storage.add_sheet(sheet_name, columns)
    storage.remove_sheet("Sheet")
    workflow_repo = WorkflowRepo(storage)
    run_repo = WorkflowRunRepo(storage)
    audit_repo = AuditRepo(storage)
    trace_path = str(tmp_path / "trace.jsonl")
    interceptor = AuditInterceptor(audit_repo, TraceWriter(trace_path))
    runner = WorkflowRunner()
    trigger = WorkflowTrigger(workflow_repo, run_repo, runner, interceptor)
    return {
        "workflow_repo": workflow_repo,
        "run_repo": run_repo,
        "audit_repo": audit_repo,
        "trigger": trigger,
        "runner": runner,
        "trace_path": trace_path,
    }


def _workflow(name, steps):
    return Workflow(id=1, name=name, steps=steps)


def test_runner_shell_success(env):
    result = env["runner"].run(_workflow("ok", [{"type": "shell", "command": "echo ok"}]))
    assert result["ok"] is True


def test_runner_shell_failure(env):
    result = env["runner"].run(_workflow("fail", [{"type": "shell", "command": "exit 1"}]))
    assert result["ok"] is False
    assert result["error"]


def test_runner_python_success(env):
    result = env["runner"].run(_workflow("py", [{"type": "python", "code": "print('hello')"}]))
    assert result["ok"] is True


def test_runner_python_failure(env):
    result = env["runner"].run(
        _workflow("pyfail", [{"type": "python", "code": "import sys; sys.exit(2)"}])
    )
    assert result["ok"] is False


def test_runner_stops_on_first_failure(env):
    workflow = _workflow(
        "stop",
        [
            {"type": "shell", "command": "exit 1"},
            {"type": "shell", "command": "echo not-reached"},
        ],
    )
    result = env["runner"].run(workflow)
    assert result["ok"] is False
    assert len(result["steps"]) == 1


def test_trigger_creates_run_and_audit(env):
    env["workflow_repo"].create(_workflow("ci-check", [{"type": "shell", "command": "echo ok"}]))
    run = env["trigger"].run_by_name("ci-check", actor=1)
    assert run.status == RunStatus.SUCCESS
    runs = env["run_repo"].list()
    assert len(runs) == 1
    assert runs[0].workflow_id == 1
    entries = env["audit_repo"].list()
    assert entries[-1].action_type == "workflow.run"
    assert entries[-1].success is True
    lines = Path(env["trace_path"]).read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1
    assert '"workflow_run"' in lines[0]


def test_trigger_failure_records_failed_run(env):
    env["workflow_repo"].create(_workflow("ci-fail", [{"type": "shell", "command": "exit 1"}]))
    run = env["trigger"].run_by_name("ci-fail", actor=1)
    assert run.status == RunStatus.FAILED
    entries = env["audit_repo"].list()
    assert entries[-1].success is False
    assert entries[-1].action_type == "workflow.run"


def test_run_unknown_workflow_raises_s004(env):
    with pytest.raises(GXError) as exc_info:
        env["trigger"].run_by_name("not-exist", actor=1)
    assert exc_info.value.code == "S004"
