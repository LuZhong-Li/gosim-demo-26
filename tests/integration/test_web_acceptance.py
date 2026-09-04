"""GUI 验收矩阵（N1-T4）：四大功能域的成功与拒绝路径回归。

被测形态为 Web JSON API + GUI-hook 页面（沿用 14 §5：不依赖真实浏览器）。
每一行断言「如果该域回归，本测试立即红灯」。
"""

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


def _get(app, path, actor=None):
    return app.route("GET", path, actor=actor)


def test_matrix_org_permission_readonly_denied(app):
    status, raw, _ = _post(app, "/api/prs", {"title": "hack"}, actor=3)
    assert status == 403
    assert json.loads(raw)["code"] == "P001"

    status, raw, _ = _get(app, "/api/audit", actor=3)
    assert status == 403
    assert json.loads(raw)["code"] == "P001"


def test_matrix_org_permission_team_create_and_list(app):
    status, raw, _ = _post(
        app, "/api/teams", {"name": "data", "description": "数据团队"}
    )
    assert status == 200
    assert json.loads(raw)["ok"] is True

    status, raw, _ = _get(app, "/api/meta")
    assert status == 200
    teams = json.loads(raw)["teams"]
    assert [team["name"] for team in teams] == ["core", "data"]


def test_matrix_rulesets_merge_without_approval_blocked(app):
    _, raw, _ = _post(app, "/api/prs", {"title": "no-review"})
    pr_id = json.loads(raw)["pr"]["id"]

    status, raw, _ = _post(app, f"/api/prs/{pr_id}/merge", {})
    assert status == 409
    assert json.loads(raw)["code"] == "R001"


def test_matrix_rulesets_disable_approval_allows_merge(app):
    _, raw, _ = _post(app, "/api/prs", {"title": "no-review-after-toggle"})
    pr_id = json.loads(raw)["pr"]["id"]

    status, raw, _ = _post(app, "/api/rulesets/approval", {"enabled": False})
    assert status == 200
    assert json.loads(raw)["ruleset"]["status"] == "disabled"

    status, raw, _ = _post(app, f"/api/prs/{pr_id}/merge", {})
    assert status == 200
    assert json.loads(raw)["pr"]["status"] == "merged"


def test_matrix_pr_review_flow_approve_ci_merge(app):
    _, raw, _ = _post(app, "/api/prs", {"title": "full-flow"})
    pr_id = json.loads(raw)["pr"]["id"]

    status, raw, _ = _post(
        app, f"/api/prs/{pr_id}/approve", {"approver": "alice"}
    )
    assert status == 200

    status, raw, _ = _post(app, "/api/workflows/ci-check/run", {"pr_id": pr_id})
    assert status == 200
    assert json.loads(raw)["run"]["status"] == "success"

    status, raw, _ = _post(app, f"/api/prs/{pr_id}/merge", {})
    assert status == 200
    assert json.loads(raw)["pr"]["status"] == "merged"


def test_matrix_pr_history_records_create(app):
    _, raw, _ = _post(app, "/api/prs", {"title": "history-row"})
    pr_id = json.loads(raw)["pr"]["id"]

    status, raw, _ = _get(app, f"/api/prs/{pr_id}/history")
    assert status == 200
    events = json.loads(raw)["events"]
    assert [event["action_type"] for event in events] == ["pr.create"]


def test_matrix_actions_run_ci_check_success(app):
    status, raw, _ = _post(app, "/api/workflows/ci-check/run", {})
    assert status == 200
    assert json.loads(raw)["run"]["status"] == "success"


def test_matrix_audit_admin_list_reader_denied(app):
    status, raw, _ = _get(app, "/api/audit")
    assert status == 200
    assert json.loads(raw)["ok"] is True

    status, raw, _ = _get(app, "/api/audit", actor=3)
    assert status == 403
    assert json.loads(raw)["code"] == "P001"
