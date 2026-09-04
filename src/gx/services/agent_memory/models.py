"""Agent 组织经验库的领域模型。"""

from datetime import UTC, datetime

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(UTC)


class MemoryRevision(BaseModel):
    """一条记忆的某个历史版本。"""

    content: str
    author: str = "llm"
    reason: str = ""
    created_at: datetime = Field(default_factory=utc_now)


class Memory(BaseModel):
    """Agent 组织经验库中的一条记忆。"""

    id: str
    content: str
    layer: str = "recent"
    importance: float = 0.5
    tags: list[str] = Field(default_factory=list)
    source: str = "llm"
    status: str = "active"
    revisions: list[MemoryRevision] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
