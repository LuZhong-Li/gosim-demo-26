"""Web JSON API 集成测试（S1）：直调 GxWebApp.route，不起真实 socket。"""

import json

import pytest

from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from gx.domain.enums import Role as RoleEnum
from gx.domain.enums import TriggerType, WorkflowStatus
from gx.domain.models import Member, Role, Team, Workflow
from gx.domain.repositories import (
    MemberRepo,
    RoleRepo,
    TeamRepo,
    WorkflowRepo,
)
from gx.storage.xlsx import LocalXlsxStorage
from web.app import GxWebApp


@pytest.fixture
def app(tmp_path):
    path = str(tmp_path / "web.xlsx")
    storage = LocalXlsxStorage.create_workbook(path)
    for sheet_name, columns in SHEET_COLUMNS.items():
        storage.add_sheet(sheet_name, columns)
    storage.remove_sheet("Sheet")
    for role, permissions in {
        RoleEnum.OWNER: ["read", "write", "admin"],
        RoleEnum.ADMIN: ["read", "write", "admin"],
        RoleEnum.MEMBER: ["read", "write"],
        RoleEnum.READONLY: ["read"],
    }.items():
        RoleRepo(storage).create(
            Role(id=role.value, name=role.value, permissions=permissions)
        )
    MemberRepo(storage).create(
        Member(id=1, name="admin", role=RoleEnum.ADMIN, created_at="2026-09-01T00:00:00Z")
    )
    MemberRepo(storage).create(
        Member(id=2, name="alice", role=RoleEnum.MEMBER, created_at="2026-09-01T00:00:00Z")
    )
    MemberRepo(storage).create(
        Member(id=3, name="reader", role=RoleEnum.READONLY, created_at="2026-09-01T00:00:00Z")
    )
    TeamRepo(storage).create(Team(id=1, name="core", description="核心团队"))
    WorkflowRepo(storage).create(
        Workflow(
            id=1,
            name="ci-check",
            steps=[{"type": "shell", "command": "echo ok"}],
            trigger=TriggerType.MANUAL,
            status=WorkflowStatus.ACTIVE,
        )
    )
    seed_default_rules(storage)
    return GxWebApp(path, trace_path=str(tmp_path / "trace-web.jsonl"))


def _post(app, path, body, actor=None):
    return app.route("POST", path, body, actor=actor)


def test_meta_lists_resources(app):
    status, raw, ctype = app.route("GET", "/api/meta")
    assert status == 200
    assert ctype == "application/json"
    data = json.loads(raw)
    assert data["ok"] is True
    assert [m["name"] for m in data["members"]] == ["admin", "alice", "reader"]
    assert "approval" in [r["id"] for r in data["rulesets"]]
    assert data["roles"] == ["owner", "admin", "member", "readonly"]


def test_pr_full_flow_via_api(app):
    _, raw, _ = _post(app, "/api/prs", {"title": "demo change"})
    pr = json.loads(raw)["pr"]
    assert pr["status"] == "open"

    status, raw, _ = _post(app, "/api/prs", {"title": "hack"}, actor=3)
    assert status == 403
    assert json.loads(raw)["code"] == "P001"

    status, raw, _ = _post(app, f"/api/prs/{pr['id']}/merge", {})
    assert status == 409  # R001 无审批
    assert json.loads(raw)["code"] == "R001"

    status, raw, _ = _post(
        app, f"/api/prs/{pr['id']}/approve", {"approver": "alice"}
    )
    assert status == 200
    assert json.loads(raw)["pr"]["status"] == "approved"

    status, raw, _ = _post(app, "/api/workflows/ci-check/run", {})
    assert status == 200
    assert json.loads(raw)["run"]["status"] == "success"

    status, raw, _ = _post(app, f"/api/prs/{pr['id']}/merge", {})
    assert status == 200
    assert json.loads(raw)["pr"]["status"] == "merged"


def test_audit_permission_and_history(app):
    _post(app, "/api/prs", {"title": "audited"})
    status, raw, _ = app.route("GET", "/api/audit")
    assert status == 200
    assert any(e["action_type"] == "pr.create" for e in json.loads(raw)["entries"])

    status, raw, _ = app.route("GET", "/api/audit", actor=3)
    assert status == 403
    assert json.loads(raw)["code"] == "P001"

    _, raw, _ = app.route("GET", "/api/prs/1/history")
    assert [e["action_type"] for e in json.loads(raw)["events"]] == ["pr.create"]


def test_ruleset_toggle_via_api(app):
    status, raw, _ = _post(app, "/api/rulesets/approval", {"enabled": False})
    assert status == 200
    assert json.loads(raw)["ruleset"]["status"] == "disabled"


def test_index_page_exposes_ui_hooks(app):
    status, raw, ctype = app.route("GET", "/")
    assert status == 200
    assert "text/html" in ctype
    for element_id in (
        "id=\"actor\"",
        "id=\"msg\"",
        "id=\"members-tbody\"",
        "id=\"teams-tbody\"",
        "id=\"btn-team-add\"",
        "id=\"pr-tbody\"",
        "id=\"workflows-tbody\"",
        "id=\"rulesets-tbody\"",
        "id=\"audit-tbody\"",
    ):
        assert element_id in raw

    status, raw, ctype = app.route("GET", "/app.js")
    assert status == 200
    assert "application/javascript" in ctype
    assert "fetch(" in raw
