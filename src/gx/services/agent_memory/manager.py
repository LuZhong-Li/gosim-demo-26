"""Agent 组织经验库的上层封装。"""

from __future__ import annotations

from gx.services.agent_memory.models import Memory
from gx.services.agent_memory.store import MemoryStore


class AgentMemoryManager:
    """包一层 MemoryStore，方便后续接入 Agent 运行时。"""

    def __init__(self, path) -> None:
        self.store = MemoryStore(path)

    def write(self, content: str, **kwargs) -> Memory:
        return self.store.write(content, **kwargs)

    def edit(self, memory_id: str, new_content: str, **kwargs) -> Memory | None:
        return self.store.edit(memory_id, new_content, **kwargs)

    def rollback(self, memory_id: str) -> Memory | None:
        return self.store.rollback(memory_id)

    def list(self) -> list[Memory]:
        return self.store.list()

    def search(self, query: str) -> list[Memory]:
        return self.store.search(query)
