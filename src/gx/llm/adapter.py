"""LLM 适配器协议。"""

from typing import Protocol


class LLMAdapter(Protocol):
    """所有可选 LLM 实现都满足 chat 方法。"""

    async def chat(self, messages: list[dict], tools: list[dict] | None = None) -> dict: ...
