"""Local OpenAI-compatible stub used to verify the agent's model path.

Serves POST /v1/chat/completions and answers with a fixed file payload plus a
usage block, so the agent can be exercised without a real key:

    python arcbench/notes/llm_stub.py 8765
    OPENAI_BASE_URL=http://127.0.0.1:8765/v1 OPENAI_API_KEY=stub \
      python arcbench/agent/main.py <requirements> --output-dir <out>
"""

from __future__ import annotations

import json
import os
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
    ],
    "covered": ["REQ-1-1-1"],
}

# ARC_STUB_BROKEN=1 makes the stub vandalise build-critical files, so the
# post-generation guard can be exercised.
BROKEN_FILES = {
    "files": [
        {"path": "frontend/vite.config.js", "content": "this is not javascript {{{\n"},
        {"path": "backend/src/app.js", "content": ""},
        {"path": "backend/package.json", "content": "{ not json"},
        {"path": "frontend/src/generated-probe.txt", "content": "still generated\n"},
    ],
    "covered": ["REQ-1-1-1"],
}

# ARC_STUB_PROSE_FIRST=1 makes every *first* call per module answer with prose
# instead of the JSON envelope, so the agent's unusable-reply retry can be
# exercised end to end.
PROSE = "Sure! Here is my plan: I will create the frontend and backend files.\n"

_calls = {"n": 0}


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 - http.server naming
        length = int(self.headers.get("Content-Length") or 0)
        self.rfile.read(length)
        _calls["n"] += 1
        if os.environ.get("ARC_STUB_PROSE_FIRST") == "1" and _calls["n"] % 2 == 1:
            content = PROSE
        else:
            content = json.dumps(
                BROKEN_FILES if os.environ.get("ARC_STUB_BROKEN") == "1" else FILES
            )
        payload = {
            "id": "stub-1",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": content},
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
