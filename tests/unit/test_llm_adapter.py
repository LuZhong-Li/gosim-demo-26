"""可选 LLM 适配器单元测试（评审优化第二轮 Task 5）。"""

import asyncio
import json

from gx.llm.openai_compat import OpenAICompatAdapter


class FakeFunction:
    name = "memory_write"
    arguments = json.dumps({"content": "remember me"})


class FakeToolCall:
    function = FakeFunction()


class FakeMessage:
    content = "done"
    tool_calls = [FakeToolCall()]


class FakeChoice:
    message = FakeMessage()


class FakeResponse:
    choices = [FakeChoice()]


class FakeCompletions:
    def __init__(self):
        self.last_kwargs = None

    async def create(self, **kwargs):
        self.last_kwargs = kwargs
        return FakeResponse()


class FakeChat:
    completions = FakeCompletions()


class FakeClient:
    chat = FakeChat()


def test_adapter_translates_fake_response_to_contract():
    client = FakeClient()
    adapter = OpenAICompatAdapter(
        api_key="test-key",
        base_url="https://example.invalid/v1",
        model="deepseek-chat",
        client=client,
    )
    messages = [{"role": "user", "content": "hi"}]
    tools = [{"type": "function", "function": {"name": "memory_write", "parameters": {}}}]

    result = asyncio.run(adapter.chat(messages, tools))

    assert result["content"] == "done"
    assert result["tool_calls"] == [
        {"name": "memory_write", "arguments": {"content": "remember me"}}
    ]
    assert client.chat.completions.last_kwargs["model"] == "deepseek-chat"
    assert client.chat.completions.last_kwargs["messages"] == messages
    assert client.chat.completions.last_kwargs["tools"] == tools
