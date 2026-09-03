"""Trace 只读 HTML 回放。"""

import html
import json
from typing import Any


def render_trace(events: list[dict[str, Any]], title: str = "GX-Sheet Trace") -> str:
    """把 trace 事件列表渲染成 HTML 时间线；只读，不修改源事件。"""
    rows = []
    for event in events:
        actor = html.escape(str(event.get("actor", "")))
        event_type = html.escape(str(event.get("type", "")))
        action = html.escape(str(event.get("action", "")))
        resource = html.escape(str(event.get("resource", "")))
        success = "success" if event.get("success") else "failed"
        detail = html.escape(json.dumps(event.get("detail", ""), ensure_ascii=False))
        rows.append(
            f"<li class='{success}'><strong>{event_type}</strong> {action} "
            f"by {actor} on {resource} :: {detail}</li>"
        )
    body = "\n".join(rows)
    return (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<title>{html.escape(title)}</title></head><body>"
        f"<h1>{html.escape(title)}</h1><ul>{body}</ul></body></html>"
    )
