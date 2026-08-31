"""领域仓储层：封装 BaseStorage，向业务层提供模型级 CRUD。

只依赖 BaseStorage 抽象接口，不直接操作 openpyxl；
写操作由存储层内部锁机制保证并发安全。
参见 docs/plans/02-核心模块设计.md 3.1、04-里程碑任务.md Phase1。
"""

from typing import Any

from constants import (
    AUDIT_LOG,
    MEMBERS,
    PULL_REQUESTS,
    ROLES,
    RULESETS,
    TEAMS,
    WORKFLOWS,
    WORKFLOW_RUNS,
)
from errors import GXError
from src.gx.domain.models import (
    AuditLogEntry,
    DomainModel,
    Member,
    PullRequest,
    Role,
    RuleSet,
    Team,
    Workflow,
    WorkflowRun,
)
from src.gx.storage.base import BaseStorage


class _IdRepo:
    """按实体 id 定位的仓储公共实现。"""

    _sheet: str = ""
    _model: type[DomainModel] = DomainModel

    def __init__(self, storage: BaseStorage) -> None:
        self._storage = storage

    def get(self, entity_id: Any) -> DomainModel:
        row_id = self._find_row_id(entity_id)
        return self._model.parse_raw(self._storage.get_sheet(self._sheet)[row_id])

    def list(self) -> list[DomainModel]:
        return [
            self._model.parse_raw(row) for row in self._storage.get_sheet(self._sheet)
        ]

    def create(self, model: DomainModel) -> DomainModel:
        self._storage.append_row(self._sheet, model.to_row())
        return model

    def update(self, entity_id: Any, data: dict[str, Any]) -> DomainModel:
        row_id = self._find_row_id(entity_id)
        rows = self._storage.get_sheet(self._sheet)
        merged = {**rows[row_id], **data}
        updated = self._model.parse_raw(merged)
        self._storage.update_row(self._sheet, row_id, updated.to_row())
        return updated

    def _find_row_id(self, entity_id: Any) -> int:
        for row_id, row in enumerate(self._storage.get_sheet(self._sheet)):
            if self._id_matches(row, entity_id):
                return row_id
        raise GXError(
            "S004",
            f"记录不存在: {self._sheet} id={entity_id}",
            module="domain",
            context={"sheet": self._sheet, "id": entity_id},
        )

    def _id_matches(self, row: dict[str, Any], entity_id: Any) -> bool:
        raw_id = row.get("id")
        try:
            return int(raw_id) == int(entity_id)
        except (TypeError, ValueError):
            return str(raw_id) == str(entity_id)


class MemberRepo(_IdRepo):
    _sheet = MEMBERS
    _model = Member


class TeamRepo(_IdRepo):
    _sheet = TEAMS
    _model = Team


class RoleRepo(_IdRepo):
    _sheet = ROLES
    _model = Role


class WorkflowRepo(_IdRepo):
    _sheet = WORKFLOWS
    _model = Workflow


class WorkflowRunRepo(_IdRepo):
    _sheet = WORKFLOW_RUNS
    _model = WorkflowRun


class PRRepo(_IdRepo):
    _sheet = PULL_REQUESTS
    _model = PullRequest


class RuleSetRepo(_IdRepo):
    _sheet = RULESETS
    _model = RuleSet


class AuditRepo:
    """审计仓储：只允许追加，禁止修改/删除。"""

    _sheet = AUDIT_LOG

    def __init__(self, storage: BaseStorage) -> None:
        self._storage = storage

    def get(self, row_id: int) -> AuditLogEntry:
        rows = self._storage.get_sheet(self._sheet)
        if row_id < 0 or row_id >= len(rows):
            raise GXError(
                "S004",
                f"审计记录不存在或越界: row_id={row_id}",
                module="domain",
                context={"sheet": self._sheet, "row_id": row_id},
            )
        return AuditLogEntry.parse_raw(rows[row_id])

    def list(self) -> list[AuditLogEntry]:
        return [
            AuditLogEntry.parse_raw(row) for row in self._storage.get_sheet(self._sheet)
        ]

    def create(self, entry: AuditLogEntry) -> AuditLogEntry:
        self._storage.append_row(self._sheet, entry.to_row())
        return entry

    def update(self, row_id: int, data: dict[str, Any]) -> None:
        raise GXError(
            "A001",
            "audit_log 只允许追加，禁止修改",
            module="domain",
            context={"sheet": self._sheet, "row_id": row_id},
        )

    def delete(self, row_id: int) -> None:
        raise GXError(
            "A001",
            "audit_log 只允许追加，禁止删除",
            module="domain",
            context={"sheet": self._sheet, "row_id": row_id},
        )
