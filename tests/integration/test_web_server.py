"""HTTP 端到端测试（S1）：真实 socket + urllib 请求。"""

import json
import threading
import urllib.request

from demo.init_seed import create_seed_workbook
from web.run import build_app_args
from web.server import make_server


def _request(port, path, method="GET", body=None, actor=None):
    url = f"http://127.0.0.1:{port}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        url, data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    if actor is not None:
        request.add_header("X-GX-Actor", str(actor))
    with urllib.request.urlopen(request) as response:
        text = response.read().decode("utf-8")
        try:
            return response.status, json.loads(text)
        except json.JSONDecodeError:
            return response.status, text


def test_http_pr_flow(tmp_path):
    workbook = str(tmp_path / "seed.xlsx")
    create_seed_workbook(workbook)
    server = make_server(
        workbook,
        trace_path=str(tmp_path / "trace-web.jsonl"),
        host="127.0.0.1",
        port=0,
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        port = server.server_address[1]
        status, data = _request(port, "/api/meta")
        assert status == 200
        assert data["ok"] is True

        status, data = _request(port, "/api/prs", method="POST", body={"title": "http demo"})
        assert status == 200
        pr_id = data["pr"]["id"]

        status, data = _request(
            port, f"/api/prs/{pr_id}/approve", method="POST", body={"approver": "alice"}
        )
        assert status == 200

        status, data = _request(
            port, "/api/workflows/ci-check/run", method="POST", body={}
        )
        assert status == 200

        status, data = _request(port, f"/api/prs/{pr_id}/merge", method="POST", body={})
        assert status == 200
        assert data["pr"]["status"] == "merged"

        status, html = _request(port, "/", actor=1)
        assert status == 200
        assert 'id="members-tbody"' in html
    finally:
        server.shutdown()
        server.server_close()


def test_build_app_args_defaults(tmp_path):
    args = build_app_args(["--workbook", str(tmp_path / "a.xlsx"), "--port", "0"])
    assert args.port == 0
    assert args.reset is False
