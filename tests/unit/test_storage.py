"""存储层单元测试。

使用 pytest 临时目录，不污染种子工作簿。
"""

import pytest

from constants import AUDIT_LOG, MEMBERS
from errors import GXError
from gx.storage.lock import MemoryLock
from gx.storage.xlsx import LocalXlsxStorage


@pytest.fixture
def storage(tmp_path):
    return LocalXlsxStorage.create_workbook(str(tmp_path / "test.xlsx"))


def test_load_missing_file_raises_s001(tmp_path):
    with pytest.raises(GXError) as exc_info:
        LocalXlsxStorage(str(tmp_path / "not-exist.xlsx"))
    assert exc_info.value.code == "S001"


def test_create_workbook_generates_empty_file(tmp_path):
    path = tmp_path / "created.xlsx"
    storage = LocalXlsxStorage.create_workbook(str(path))
    assert path.is_file()
    with pytest.raises(GXError) as exc_info:
        storage.get_sheet(MEMBERS)
    assert exc_info.value.code == "S002"


def test_add_sheet_and_get_sheet(storage):
    storage.add_sheet(MEMBERS, ["id", "name"])
    assert storage.get_sheet(MEMBERS) == []
    storage.append_row(MEMBERS, {"id": 1, "name": "alice"})
    assert storage.get_sheet(MEMBERS) == [{"id": 1, "name": "alice"}]


def test_add_duplicate_sheet_raises_s002(storage):
    storage.add_sheet(MEMBERS, ["id"])
    with pytest.raises(GXError) as exc_info:
        storage.add_sheet(MEMBERS, ["id", "name"])
    assert exc_info.value.code == "S002"


def test_remove_sheet(storage):
    storage.add_sheet(MEMBERS, ["id", "name"])
    storage.remove_sheet(MEMBERS)
    with pytest.raises(GXError) as exc_info:
        storage.get_sheet(MEMBERS)
    assert exc_info.value.code == "S002"


def test_remove_audit_log_rejected(storage):
    storage.add_sheet(AUDIT_LOG, ["actor_id"])
    with pytest.raises(GXError) as exc_info:
        storage.remove_sheet(AUDIT_LOG)
    assert exc_info.value.code == "A001"


def test_get_missing_sheet_raises_s002(storage):
    with pytest.raises(GXError) as exc_info:
        storage.get_sheet("not-exist")
    assert exc_info.value.code == "S002"


def test_append_row_field_mapping(storage):
    storage.add_sheet(MEMBERS, ["id", "name", "team"])
    storage.append_row(MEMBERS, {"id": 1, "name": "alice", "team": "core"})
    assert storage.get_sheet(MEMBERS) == [{"id": 1, "name": "alice", "team": "core"}]


def test_append_row_ignores_unknown_keys(storage):
    storage.add_sheet(MEMBERS, ["id", "name"])
    storage.append_row(MEMBERS, {"id": 1, "name": "alice", "extra": "ignored"})
    assert storage.get_sheet(MEMBERS) == [{"id": 1, "name": "alice"}]


def test_update_row_updates_specified_columns(storage):
    storage.add_sheet(MEMBERS, ["id", "name", "role"])
    storage.append_row(MEMBERS, {"id": 1, "name": "alice", "role": "member"})
    storage.update_row(MEMBERS, 0, {"role": "admin"})
    assert storage.get_sheet(MEMBERS) == [{"id": 1, "name": "alice", "role": "admin"}]


def test_update_row_out_of_range_raises_s004(storage):
    storage.add_sheet(MEMBERS, ["id", "name"])
    storage.append_row(MEMBERS, {"id": 1, "name": "alice"})
    with pytest.raises(GXError) as exc_info:
        storage.update_row(MEMBERS, 5, {"name": "bob"})
    assert exc_info.value.code == "S004"


def test_update_audit_log_rejected(storage):
    storage.add_sheet(AUDIT_LOG, ["actor_id", "action_type"])
    storage.append_row(AUDIT_LOG, {"actor_id": "system", "action_type": "create"})
    with pytest.raises(GXError) as exc_info:
        storage.update_row(AUDIT_LOG, 0, {"action_type": "hacked"})
    assert exc_info.value.code == "A001"


def test_lock_rejects_concurrent_enter():
    lock = MemoryLock()
    with lock:
        with pytest.raises(GXError) as exc_info:
            with lock:
                pass
        assert exc_info.value.code == "S003"


def test_save_persists_file(tmp_path):
    path = str(tmp_path / "persist.xlsx")
    storage = LocalXlsxStorage.create_workbook(path)
    storage.add_sheet(MEMBERS, ["id", "name"])
    storage.append_row(MEMBERS, {"id": 1, "name": "admin"})
    reloaded = LocalXlsxStorage(path)
    assert reloaded.get_sheet(MEMBERS) == [{"id": 1, "name": "admin"}]
