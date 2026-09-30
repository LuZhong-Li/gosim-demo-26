"""Minimal OpenAI-compatible chat client (stdlib only).

The competition injects OPENAI_API_KEY / OPENAI_BASE_URL / MODEL for the agent
process. The rules require the agent to actually call a model, so this module is
the single place that talks to it.

Everything is defensive: when no key is configured, or the endpoint fails, the
callers fall back to a deterministic path instead of crashing the run.

Two settings here are not guesswork - they come from the official reference
adapter's incident log (``octos-org/arc-adapter``, ``build_octos_env``):

* the platform's model proxy does **not** support SSE streaming, so a request is
  always one non-streaming JSON body;
* a reasoning model with a small ``max_tokens`` spends the whole budget on
  ``reasoning_content`` and comes back with ``finish_reason=length``, an EMPTY
  ``content`` and no tool calls. The reference raises the floor to 32768 and
  pins ``reasoning_effort`` low on DeepSeek routes. Both happen here, and a
  truncated or empty reply is retried with a larger budget instead of being
  silently treated as "the model produced no files".
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field


DEFAULT_MAX_TOKENS = 32768


def log_line(message: str) -> None:
    """Diagnostics go to stdout and stderr alike (imported lazily, no cycle)."""
    try:
        from verify import log
    except Exception:  # pragma: no cover - standalone import
        log = print
    log(message)


@dataclass
class LlmUsage:
    """Token accounting so the run visibly consumes the model."""

    calls: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    errors: list[str] = field(default_factory=list)
    truncated_replies: int = 0
    empty_replies: int = 0

    def add(self, payload: dict, finish_reason: str | None = None) -> None:
        usage = (payload or {}).get("usage") or {}
        self.calls += 1
        self.prompt_tokens += int(usage.get("prompt_tokens") or 0)
        self.completion_tokens += int(usage.get("completion_tokens") or 0)
        self.total_tokens += int(usage.get("total_tokens") or 0)
        if finish_reason == "length":
            self.truncated_replies += 1

    def as_dict(self) -> dict:
        return {
            "calls": self.calls,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "truncated_replies": self.truncated_replies,
            "empty_replies": self.empty_replies,
            "errors": self.errors,
        }


class LlmClient:
    def __init__(self) -> None:
        self.api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.base_url = os.environ.get("OPENAI_BASE_URL", "").strip().rstrip("/")
        self.model = os.environ.get("MODEL", "").strip() or "deepseek-v4-flash"
        # One non-streaming reasoning turn routinely runs for minutes; the
        # reference adapter allows 900s for a single request. 120s was cutting
        # replies off and looked like an empty-response bug.
        self.timeout = float(os.environ.get("ARC_LLM_TIMEOUT", "600"))
        self.max_tokens = int(os.environ.get("ARC_LLM_MAX_TOKENS", str(DEFAULT_MAX_TOKENS)))
        self.reasoning_effort = os.environ.get("ARC_LLM_REASONING_EFFORT")
        self.usage = LlmUsage()

    @property
    def available(self) -> bool:
        return bool(self.api_key and self.base_url)

    @property
    def _is_reasoning_route(self) -> bool:
        blob = f"{self.base_url} {self.model}".lower()
        return "deepseek" in blob or "-v4" in blob or "reason" in blob

    def _effort(self) -> str | None:
        if self.reasoning_effort is not None:
            return self.reasoning_effort.strip() or None
        return "low" if self._is_reasoning_route else None

    def _payload(self, messages: list[dict], max_tokens: int, temperature: float) -> bytes:
        body: dict = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        effort = self._effort()
        if effort:
            body["reasoning_effort"] = effort
        return json.dumps(body).encode("utf-8")

    def _post(self, messages: list[dict], max_tokens: int, temperature: float) -> dict:
        request = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=self._payload(messages, max_tokens, temperature),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            return json.loads(response.read().decode("utf-8"))

    def probe(self) -> bool:
        """Cheapest possible round trip, to tell a dead endpoint from a bad request."""
        if not self.available:
            log_line("[probe] no model endpoint configured")
            return False
        try:
            payload = self._post([{"role": "user", "content": "Reply with exactly: OK"}], 8, 0.0)
        except Exception as exc:  # noqa: BLE001 - diagnostics only
            log_line(f"[probe] endpoint unreachable: {type(exc).__name__}: {exc}")
            return False
        choices = (payload or {}).get("choices") or []
        text = ""
        if choices:
            text = str((choices[0].get("message") or {}).get("content") or "").strip()
        log_line(f"[probe] model={self.model} effort={self._effort()} answered {text[:60]!r}")
        return bool(text)

    def chat(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float = 0.0,
    ) -> str | None:
        """Return the assistant message content, or None when unavailable."""
        if not self.available:
            self.usage.errors.append("model not configured (OPENAI_API_KEY/OPENAI_BASE_URL missing)")
            return None

        budget = max_tokens or self.max_tokens
        last_error = ""
        for attempt in range(4):
            try:
                payload = self._post(messages, budget, temperature) or {}
                choices = payload.get("choices") or []
                if not choices:
                    self.usage.add(payload)
                    last_error = "response contained no choices"
                else:
                    choice = choices[0]
                    finish_reason = choice.get("finish_reason")
                    self.usage.add(payload, finish_reason)
                    message = choice.get("message") or {}
                    content = message.get("content")
                    if isinstance(content, str) and content.strip():
                        if finish_reason == "length":
                            # Truncated JSON cannot be parsed; a larger budget is
                            # the only fix that keeps the reply usable.
                            last_error = f"reply truncated at max_tokens={budget}"
                            log_line(f"[llm] {last_error}; retrying with a larger budget")
                            budget *= 2
                        else:
                            return content
                    else:
                        self.usage.empty_replies += 1
                        reasoning = str(message.get("reasoning_content") or "")
                        last_error = (
                            f"assistant message was empty (finish_reason={finish_reason}, "
                            f"reasoning_chars={len(reasoning)}, max_tokens={budget})"
                        )
                        log_line(f"[llm] {last_error}")
                        if finish_reason == "length" or len(reasoning) > 200:
                            budget *= 2
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")[:300]
                last_error = f"HTTP {exc.code}: {detail}"
                if exc.code in {400, 401, 403, 404}:
                    break
            except Exception as exc:  # noqa: BLE001 - network problems are retryable
                last_error = f"{type(exc).__name__}: {exc}"
            time.sleep(min(2 ** attempt, 20))

        self.usage.errors.append(last_error or "unknown failure")
        return None
