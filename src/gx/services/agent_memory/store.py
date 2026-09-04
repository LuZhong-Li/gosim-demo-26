"""Agent 组织经验库的 JSONL 追加式存储。"""

from __future__ import annotations

import json
import uuid
from pathlib import Path

from gx.services.agent_memory.models import Memory, MemoryRevision, utc_now


class MemoryStore:
    """追加写 JSONL；按 id 取最后一条作为当前状态。"""

    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._latest = self._load()

    def _load(self) -> dict[str, Memory]:
        latest: dict[str, Memory] = {}
        if not self.path.exists():
            return latest
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            raw = json.loads(line)
            memory = Memory.model_validate(raw)
            latest[memory.id] = memory
        return latest

    def _append(self, memory: Memory) -> Memory:
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(memory.model_dump_json() + "\n")
        self._latest[memory.id] = memory
        return memory

    def write(
        self,
        content: str,
        layer: str = "recent",
        importance: float = 0.5,
        tags: list[str] | None = None,
        source: str = "llm",
    ) -> Memory:
        now = utc_now()
        memory = Memory(
            id=uuid.uuid4().hex,
            content=content,
            layer=layer,
            importance=importance,
            tags=tags or [],
            source=source,
            revisions=[
                MemoryRevision(content=content, author=source, reason="initial", created_at=now)
            ],
            created_at=now,
            updated_at=now,
        )
        return self._append(memory)

    def read(self, memory_id: str) -> Memory | None:
        return self._latest.get(memory_id)

    def edit(
        self,
        memory_id: str,
        new_content: str,
        author: str = "llm",
        reason: str = "",
    ) -> Memory | None:
        memory = self._latest.get(memory_id)
        if memory is None or memory.status != "active":
            return None
        memory.revisions.append(MemoryRevision(content=new_content, author=author, reason=reason))
        memory.content = new_content
        memory.updated_at = utc_now()
        return self._append(memory)

    def delete(self, memory_id: str) -> bool:
        memory = self._latest.get(memory_id)
        if memory is None:
            return False
        memory.status = "deleted"
        memory.updated_at = utc_now()
        self._append(memory)
        return True

    def rollback(self, memory_id: str) -> Memory | None:
        memory = self._latest.get(memory_id)
        if memory is None or memory.status != "active":
            return None
        memory.status = "rolled_back"
        memory.updated_at = utc_now()
        return self._append(memory)

    def list(self, status: str = "active") -> list[Memory]:
        return [memory for memory in self._latest.values() if memory.status == status]

    def search(self, query: str, status: str = "active") -> list[Memory]:
        needle = query.casefold()
        return [
            memory
            for memory in self.list(status)
            if needle in memory.content.casefold() or any(needle in tag for tag in memory.tags)
        ]
