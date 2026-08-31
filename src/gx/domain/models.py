"""领域层 Pydantic 模型。

纯数据模型、无 IO；存储层原始 dict 通过 ``parse_raw`` 解析为模型，
模型通过 ``to_row`` 序列化回存储行（列表/字典字段写入 JSON 字符串）。
参见 docs/plans/02-核心模块设计.md 3.2-3.4。
"""

import json
from datetime import datetime
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)

from errors import GXError
from gx.domain.enums import (
    PRStatus,
    Role as RoleEnum,
    RuleType,
    RunStatus,
    Source,
    TriggerType,
    WorkflowStatus,
)


class DomainModel(BaseModel):
    """领域模型基类：提供存储行解析与序列化。"""

    model_config = ConfigDict(extra="forbid")

    @classmethod
    def parse_raw(cls, data: dict[str, Any]) -> "DomainModel":
        """从存储层原始 dict 解析为领域模型；校验失败抛 GXError(D001)。"""
        try:
            return cls(**data)
        except ValidationError as exc:
            errors = [
                {
                    "loc": ".".join(str(part) for part in err.get("loc", ())),
                    "msg": err.get("msg"),
                    "type": err.get("type"),
                }
                for err in exc.errors()
            ]
            raise GXError(
                "D001",
                f"领域模型校验失败: {cls.__name__}",
                module="domain",
                context={"errors": errors},
            ) from exc

    def to_row(self) -> dict[str, Any]:
        """序列化为存储行 dict；列表/字典字段写入 JSON 字符串。"""
        row = json.loads(self.model_dump_json())
        return {
            key: json.dumps(value, ensure_ascii=False)
            if isinstance(value, (list, dict))
            else value
            for key, value in row.items()
        }

    @field_validator("*", mode="before")
    @classmethod
    def _parse_json_values(cls, value: Any) -> Any:
        """把存储层写入的 JSON 字符串还原为列表/字典。"""
        if isinstance(value, str) and value.strip().startswith(("[", "{")):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value

    @model_validator(mode="before")
    @classmethod
    def _normalize_empty_strings(cls, data: Any) -> Any:
        """openpyxl 将空单元格读回为 None；str 字段统一还原为空串。"""
        if isinstance(data, dict):
            for name, field in cls.model_fields.items():
                if field.annotation is str and name in data and data[name] is None:
                    data[name] = ""
        return data


class Member(DomainModel):
    """组织成员（constants.MEMBERS 表）。"""

    id: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=64)
    role: RoleEnum
    team_id: int | None = Field(default=None)
    created_at: datetime


class Team(DomainModel):
    """团队（constants.TEAMS 表）。"""

    id: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=64)
    description: str = Field(default="", max_length=200)


class Role(DomainModel):
    """角色与权限配置（constants.ROLES 表）。"""

    id: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=32)
    permissions: list[str] = Field(default_factory=list, max_length=16)

    @field_validator("permissions", mode="before")
    @classmethod
    def _parse_permissions(cls, value: Any) -> Any:
        if isinstance(value, str) and "," in value and not value.strip().startswith("["):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


class Workflow(DomainModel):
    """工作流定义（constants.WORKFLOWS 表）。"""

    id: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=64)
    steps: list[dict[str, Any]] = Field(default_factory=list)
    trigger: TriggerType = TriggerType.MANUAL
    status: WorkflowStatus = WorkflowStatus.ACTIVE


class WorkflowRun(DomainModel):
    """工作流运行实例（constants.WORKFLOW_RUNS 表）。"""

    id: int = Field(ge=1)
    workflow_id: int = Field(ge=1)
    status: RunStatus = RunStatus.PENDING
    trigger: TriggerType = TriggerType.MANUAL
    started_at: datetime | None = Field(default=None)
    finished_at: datetime | None = Field(default=None)
    detail: str = Field(default="", max_length=500)


class PullRequest(DomainModel):
    """PR 模拟记录（constants.PULL_REQUESTS 表）。"""

    id: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=64)
    status: PRStatus = PRStatus.OPEN
    approvers: list[str] = Field(default_factory=list, max_length=32)
    created_at: datetime
    merged_at: datetime | None = Field(default=None)

    @field_validator("approvers", mode="before")
    @classmethod
    def _parse_approvers(cls, value: Any) -> Any:
        if isinstance(value, str) and "," in value and not value.strip().startswith("["):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


class AuditLogEntry(DomainModel):
    """审计日志条目（constants.AUDIT_LOG 表，只追加）。

    字段对齐 docs/plans/02-核心模块设计.md 3.2。
    """

    actor_id: str = Field(min_length=1, max_length=64)
    action_type: str = Field(min_length=1, max_length=64)
    resource_type: str = Field(min_length=1, max_length=64)
    resource_id: str = Field(default="", max_length=128)
    before_snapshot: dict[str, Any] | None = Field(default=None)
    after_snapshot: dict[str, Any] | None = Field(default=None)
    timestamp: datetime
    source: Source = Source.CLI
    success: bool = True
    error_msg: str = Field(default="", max_length=500)
    prev_hash: str = Field(default="0" * 64, min_length=64, max_length=64)

    @field_validator("actor_id", "resource_id", mode="before")
    @classmethod
    def _coerce_str_ids(cls, value: Any) -> Any:
        if value is None:
            return ""
        return str(value) if not isinstance(value, str) else value


class RuleSet(DomainModel):
    """规则配置（constants.RULESETS 表）。"""

    id: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=64)
    rule_type: RuleType
    config: dict[str, Any] = Field(default_factory=dict)


class RuleViolation(DomainModel):
    """规则违规结果（docs/plans/02-核心模块设计.md 3.4）。"""

    rule_id: str = Field(min_length=1, max_length=32)
    message: str = Field(min_length=1, max_length=200)
    resource_id: str = Field(default="", max_length=128)
