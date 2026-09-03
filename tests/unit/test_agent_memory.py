"""Agent 组织经验库单元测试（评审优化第二轮 Task 4）。"""

from pathlib import Path

from gx.services.agent_memory.manager import AgentMemoryManager
from gx.services.agent_memory.store import MemoryStore


def test_write_edit_and_rollback_keep_revision_chain(tmp_path):
    path = Path(tmp_path / "memories.jsonl")
    store = MemoryStore(path)

    created = store.write("The deadline is August 30th.", importance=0.5)
    edited = store.edit(
        created.id,
        "The deadline has been moved to September 15th.",
        author="llm",
        reason="User informed of deadline extension",
    )

    assert edited.content == "The deadline has been moved to September 15th."
    assert [revision.content for revision in edited.revisions] == [
        "The deadline is August 30th.",
        "The deadline has been moved to September 15th.",
    ]
    assert edited.revisions[-1].author == "llm"
    assert edited.revisions[-1].reason == "User informed of deadline extension"

    rolled = store.rollback(created.id)
    assert rolled.status == "rolled_back"
    assert [memory.id for memory in store.list()] == []
    assert path.read_text(encoding="utf-8").count("\n") >= 3


def test_search_finds_by_content_and_tag(tmp_path):
    store = MemoryStore(tmp_path / "memories.jsonl")
    store.write("Deploy is scheduled for Friday.", tags=["release"])
    store.write("Alice prefers concise reports.", tags=["style"])

    assert [memory.content for memory in store.search("friday")] == [
        "Deploy is scheduled for Friday."
    ]
    assert [memory.content for memory in store.search("release")] == [
        "Deploy is scheduled for Friday."
    ]


def test_delete_is_soft_and_excluded_from_list(tmp_path):
    store = MemoryStore(tmp_path / "memories.jsonl")
    memory = store.write("Temporary thought")

    assert store.delete(memory.id) is True
    assert store.read(memory.id).status == "deleted"
    assert store.list() == []


def test_manager_wraps_store(tmp_path):
    manager = AgentMemoryManager(tmp_path / "memories.jsonl")
    memory = manager.write("First memory")
    edited = manager.edit(memory.id, "Updated memory")

    assert edited.content == "Updated memory"
    assert [item.content for item in manager.search("updated")] == ["Updated memory"]
