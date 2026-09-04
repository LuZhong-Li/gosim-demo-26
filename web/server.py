"""标准库 HTTP 服务器：把 GxWebApp 暴露为可访问服务。"""

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
for path in (ROOT, SRC):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from config import CLI_ACTOR_ID, WEB_TRACE_PATH
from web.app import GxWebApp


class GxHandler(BaseHTTPRequestHandler):
    """每个实例共享同一 app；X-GX-Actor 请求头切换操作者。"""

    app: GxWebApp | None = None

    def do_GET(self) -> None:  # noqa: N802
        self._handle("GET")

    def do_POST(self) -> None:  # noqa: N802
        self._handle("POST")

    def _handle(self, method: str) -> None:
        length = int(self.headers.get("Content-Length") or 0)
        raw_body = self.rfile.read(length) if length else b""
        body: dict[str, Any] = {}
        if raw_body:
            body = json.loads(raw_body.decode("utf-8"))
        actor_header = self.headers.get("X-GX-Actor")
        actor = int(actor_header) if actor_header else None
        status, payload, content_type = self.app.route(
            method, self.path, body, actor=actor
        )
        encoded = payload.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def make_server(
    workbook_path: str,
    trace_path: str = WEB_TRACE_PATH,
    host: str = "127.0.0.1",
    port: int = 8765,
    actor: int = CLI_ACTOR_ID,
) -> HTTPServer:
    """构造并绑定 HTTP 服务器；port=0 表示随机端口（测试用）。"""
    GxHandler.app = GxWebApp(workbook_path, trace_path=trace_path, actor=actor)
    return HTTPServer((host, port), GxHandler)
