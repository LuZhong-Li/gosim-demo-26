"""Web JSON API 适配层：路由 + 序列化，业务全委托 ServiceBus。

只允许走 ServiceBus；不直接访问仓储/存储。参见
docs/plans/14-评审优化第四轮.md §4。
"""

import json
from pathlib import Path
from typing import Any

from config import CLI_ACTOR_ID, WEB_TRACE_PATH
from constants import ADMIN, MEMBER, OWNER, READONLY
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.storage.xlsx import LocalXlsxStorage

ROLE_OPTIONS = [OWNER, ADMIN, MEMBER, READONLY]


def _dump(value: Any) -> Any:
    """把领域模型/列表转成 JSON 可序列化结构。"""
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_dump(item) for item in value]
    return value


def _http_status(exc: GXError) -> int:
    mapping = {"P": 403, "R": 409, "B": 422, "D": 422}
    return mapping.get(exc.code[:1], 500)


class GxWebApp:
    """标准库 JSON API + 静态页面的最小 Web 应用。"""

    _STATIC = {
        "/": ("index.html", "text/html; charset=utf-8"),
        "/app.js": ("app.js", "application/javascript; charset=utf-8"),
    }

    def __init__(
        self,
        workbook_path: str,
        trace_path: str = WEB_TRACE_PATH,
        actor: int = CLI_ACTOR_ID,
    ) -> None:
        self._workbook_path = workbook_path
        self._trace_path = trace_path
        self._default_actor = actor

    def route(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        actor: int | None = None,
    ) -> tuple[int, str, str]:
        try:
            if method == "GET" and path in self._STATIC:
                return self._serve_static(path)
            return self._handle_api(method, path, body or {}, actor)
        except GXError as exc:
            payload = json.dumps(
                {"ok": False, "code": exc.code, "message": exc.message},
                ensure_ascii=False,
            )
            return _http_status(exc), payload, "application/json"
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            payload = json.dumps(
                {"ok": False, "code": "WEB400", "message": f"请求参数错误: {exc}"},
                ensure_ascii=False,
            )
            return 400, payload, "application/json"

    def _serve_static(self, path: str) -> tuple[int, str, str]:
        filename, content_type = self._STATIC[path]
        text = (Path(__file__).resolve().parent / filename).read_text(encoding="utf-8")
        return 200, text, content_type

    def _handle_api(
        self,
        method: str,
        path: str,
        body: dict[str, Any],
        actor: int | None,
    ) -> tuple[int, str, str]:
        subject = actor if actor is not None else self._default_actor
        if not isinstance(body, dict):
            raise ValueError("请求体必须是 JSON 对象")
        bus = ServiceBus(LocalXlsxStorage(self._workbook_path), trace_path=self._trace_path)
        if method == "GET" and path == "/api/meta":
            payload = {
                "members": _dump(bus.list_members()),
                "teams": _dump(bus.list_teams()),
                "prs": _dump(bus.list_prs()),
                "workflows": _dump(bus.list_workflows()),
                "rulesets": _dump(bus.list_rulesets()),
                "roles": ROLE_OPTIONS,
            }
            return self._ok(payload)
        if method == "GET" and path == "/api/audit":
            return self._ok({"entries": bus.list_audit(subject_id=subject)})
        if method == "GET" and path == "/api/audit/export":
            return self._ok({"entries": bus.list_audit(subject_id=subject)})
        if method == "POST" and path == "/api/members":
            member = bus.member_add(
                subject_id=subject, name=body["name"], role=body["role"]
            )
            return self._ok({"member": _dump(member)})
        if method == "POST" and path == "/api/teams":
            team = bus.team_add(
                subject_id=subject,
                name=body["name"],
                description=body.get("description", ""),
            )
            return self._ok({"team": _dump(team)})
        if method == "POST" and path == "/api/prs":
            pr = bus.create_pr(subject_id=subject, title=body["title"])
            return self._ok({"pr": _dump(pr)})
        segments = [segment for segment in path.split("/") if segment]
        if method == "POST" and len(segments) == 4 and segments[:2] == ["api", "prs"]:
            pr_id = int(segments[2])
            action = segments[3]
            if action == "approve":
                pr = bus.approve_pr(
                    subject_id=subject, pr_id=pr_id, approver=body["approver"]
                )
            elif action == "merge":
                pr = bus.merge_pr(subject_id=subject, pr_id=pr_id)
            elif action == "close":
                pr = bus.close_pr(
                    subject_id=subject, pr_id=pr_id, reason=body.get("reason", "")
                )
            else:
                return self._not_found()
            return self._ok({"pr": _dump(pr)})
        if (
            method == "GET"
            and len(segments) == 4
            and segments[:2] == ["api", "prs"]
            and segments[3] == "history"
        ):
            return self._ok({"events": bus.pr_history(int(segments[2]))})
        if (
            method == "POST"
            and len(segments) == 4
            and segments[:2] == ["api", "workflows"]
            and segments[3] == "run"
        ):
            run = bus.run_workflow(
                subject_id=subject,
                name=segments[2],
                pr_id=body.get("pr_id"),
            )
            return self._ok({"run": _dump(run)})
        if method == "POST" and len(segments) == 3 and segments[:2] == ["api", "rulesets"]:
            ruleset = bus.ruleset_set_enabled(
                subject_id=subject, rule_id=segments[2], enabled=body["enabled"]
            )
            return self._ok({"ruleset": _dump(ruleset)})
        return self._not_found()

    @staticmethod
    def _ok(payload: dict[str, Any]) -> tuple[int, str, str]:
        return (
            200,
            json.dumps({"ok": True, **payload}, ensure_ascii=False),
            "application/json",
        )

    @staticmethod
    def _not_found() -> tuple[int, str, str]:
        return (
            404,
            json.dumps({"ok": False, "code": "WEB404", "message": "not found"}),
            "application/json",
        )
