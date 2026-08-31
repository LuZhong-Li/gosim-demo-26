"""审计拦截器与 Trace 单元测试。"""

import json
from pathlib import Path

import pytest

from demo.init_seed import SHEET_COLUMNS
from errors import GXError
from gx.domain.repositories import AuditRepo
from gx.services.audit.interceptor import AuditInterceptor, audit_hash
from gx.services.audit.trace import TraceWriter
from gx.storage.xlsx import LocalXlsxStorage


@pytest.fixture
def storage(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "audit.xlsx"))
    for sheet_name, columns in SHEET_COLUMNS.items():
        storage.add_sheet(sheet_name, columns)
    storage.remove_sheet("Sheet")
    return storage


def _make_interceptor(storage, tmp_path):
    trace_path = str(tmp_path / "trace.jsonl")
    return AuditInterceptor(AuditRepo(storage), TraceWriter(trace_path)), trace_path


def test_record_appends_audit_and_trace(storage, tmp_path):
    interceptor, trace_path = _make_interceptor(storage, tmp_path)
    entry = interceptor.record(
        actor_id="system",
        action_type="pr.create",
        resource_type="sheet",
        resource_id="pull_requests",
        after_snapshot={"id": 1},
        success=True,
    )
    assert entry.prev_hash == "0" * 64
    rows = AuditRepo(storage).list()
    assert len(rows) == 1
    assert rows[0].action_type == "pr.create"
    lines = Path(trace_path).read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1
    obj = json.loads(lines[0])
    assert obj["type"] == "api_call"
    assert obj["success"] is True


def test_hash_chain(storage, tmp_path):
    interceptor, _ = _make_interceptor(storage, tmp_path)
    first = interceptor.record(
        actor_id="system",
        action_type="pr.create",
        resource_type="sheet",
        resource_id="1",
        success=True,
    )
    second = interceptor.record(
        actor_id="system",
        action_type="pr.approve",
        resource_type="sheet",
        resource_id="1",
        success=True,
    )
    assert first.prev_hash == "0" * 64
    assert second.prev_hash == audit_hash(first.to_row())


def test_human_intervene(storage, tmp_path):
    _, trace_path = _make_interceptor(storage, tmp_path)
    TraceWriter(trace_path).log_human_intervene("人工确认合并")
    obj = json.loads(Path(trace_path).read_text(encoding="utf-8").splitlines()[0])
    assert obj["type"] == "human_intervene"
    assert obj["detail"] == "人工确认合并"


def test_trace_write_failure_raises_a001(storage, tmp_path):
    bad_path = str(tmp_path / "no-such-dir" / "trace.jsonl")
    interceptor = AuditInterceptor(AuditRepo(storage), TraceWriter(bad_path))
    with pytest.raises(GXError) as exc_info:
        interceptor.record(
            actor_id="system",
            action_type="pr.create",
            resource_type="sheet",
            resource_id="1",
            success=True,
        )
    assert exc_info.value.code == "A001"
