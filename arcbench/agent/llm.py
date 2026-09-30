"""Minimal OpenAI-compatible chat client (stdlib only).

The competition injects OPENAI_API_KEY / OPENAI_BASE_URL / MODEL for the agent
process (see the official local-simulation ``env.example``). The rules require
the agent to actually call a model, so this module is the single place that
talks to it.

Everything is defensive: when no key is configured, or the endpoint fails, the
callers fall back to a deterministic path instead of crashing the run.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field


@dataclass
class LlmUsage:
    """Token accounting so the run visibly consumes the model."""

    calls: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    errors: list[str] = field(default_factory=list)

    def add(self, payload: dict) -> None:
        usage = (payload or {}).get("usage") or {}
        self.calls += 1
        self.prompt_tokens += int(usage.get("prompt_tokens") or 0)
        self.completion_tokens += int(usage.get("completion_tokens") or 0)
        self.total_tokens += int(usage.get("total_tokens") or 0)

    def as_dict(self) -> dict:
        return {
            "calls": self.calls,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "errors": self.errors,
        }


class LlmClient:
    def __init__(self) -> None:
        self.api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.base_url = os.environ.get("OPENAI_BASE_URL", "").strip().rstrip("/")
        self.model = os.environ.get("MODEL", "").strip() or "deepseek-v4-flash"
        self.timeout = float(os.environ.get("ARC_LLM_TIMEOUT", "120"))
        self.usage = LlmUsage()

    @property
    def available(self) -> bool:
        return bool(self.api_key and self.base_url)

    def chat(self, messages: list[dict], *, max_tokens: int = 4096, temperature: float = 0.0) -> str | None:
        """Return the assistant message content, or None when unavailable."""
        if not self.available:
            self.usage.errors.append("model not configured (OPENAI_API_KEY/OPENAI_BASE_URL missing)")
            return None

        body = json.dumps(
            {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )

        last_error = ""
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                self.usage.add(payload)
                choices = payload.get("choices") or []
                if not choices:
                    last_error = "response contained no choices"
                    continue
                message = choices[0].get("message") or {}
                content = message.get("content")
                if isinstance(content, str) and content.strip():
                    return content
                last_error = "assistant message was empty"
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")[:300]
                last_error = f"HTTP {exc.code}: {detail}"
                if exc.code in {400, 401, 403, 404}:
                    break
            except Exception as exc:  # noqa: BLE001 - network problems are retryable
                last_error = f"{type(exc).__name__}: {exc}"
            time.sleep(min(2 ** attempt, 8))

        self.usage.errors.append(last_error or "unknown failure")
        return None
