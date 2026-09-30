"""Local OpenAI-compatible stub used to verify the agent's model path.

Serves POST /v1/chat/completions and answers with a fixed file payload plus a
usage block, so the agent can be exercised without a real key:

    python arcbench/notes/llm_stub.py 8765
    OPENAI_BASE_URL=http://127.0.0.1:8765/v1 OPENAI_API_KEY=stub \
      python arcbench/agent/main.py <requirements> --output-dir <out>
"""

from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

FILES = {
    "files": [
        {
            "path": "frontend/src/generated-probe.txt",
            "content": "written by the model\n",
        },
        {
            "path": "../escape.txt",
            "content": "must never be written",
        },
    ]
}


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 - http.server naming
        length = int(self.headers.get("Content-Length") or 0)
        self.rfile.read(length)
        payload = {
            "id": "stub-1",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": json.dumps(FILES)},
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 11, "completion_tokens": 22, "total_tokens": 33},
        }
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args) -> None:  # keep the console quiet
        return


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
