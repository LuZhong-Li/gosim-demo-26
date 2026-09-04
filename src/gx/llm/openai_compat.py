"""OpenAI/DeepSeek 兼容适配器。"""

import json


class OpenAICompatAdapter:
    """把 OpenAI 兼容接口返回标准化为 Agent 内部契约。"""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        client=None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.client = client
        if client is None:
            from openai import AsyncOpenAI

            self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def chat(self, messages: list[dict], tools: list[dict] | None = None) -> dict:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=tools,
        )
        message = response.choices[0].message
        tool_calls = []
        for call in message.tool_calls or []:
            try:
                arguments = json.loads(call.function.arguments)
            except json.JSONDecodeError:
                arguments = {}
            tool_calls.append({"name": call.function.name, "arguments": arguments})
        return {"content": message.content or "", "tool_calls": tool_calls}
