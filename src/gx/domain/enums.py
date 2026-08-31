"""领域层枚举定义。

角色、来源、触发方式、状态等枚举统一在此定义；
角色取值从 constants.py 导入，禁止硬编码。
"""

from enum import Enum

from constants import ADMIN, MEMBER, OWNER, READONLY


class Role(str, Enum):
    """预置角色（docs/plans/02-核心模块设计.md 3.3 权限矩阵）。"""

    OWNER = OWNER
    ADMIN = ADMIN
    MEMBER = MEMBER
    READONLY = READONLY


class Action(str, Enum):
    """权限动作（docs/plans/02-核心模块设计.md 3.3）。"""

    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class Source(str, Enum):
    """审计来源（docs/plans/02-核心模块设计.md 3.2）。"""

    AGENT = "agent"
    CLI = "cli"
    API = "api"


class TriggerType(str, Enum):
    """工作流触发方式（docs/plans/01-项目定位与执行策略.md 1.2）。"""

    MANUAL = "manual"
    DATA_CHANGE = "data_change"
    SCHEDULE = "schedule"


class WorkflowStatus(str, Enum):
    """工作流定义状态。"""

    ACTIVE = "active"
    DISABLED = "disabled"


class RunStatus(str, Enum):
    """工作流运行状态。"""

    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PRStatus(str, Enum):
    """PR 模拟状态。"""

    OPEN = "open"
    APPROVED = "approved"
    MERGED = "merged"
    CLOSED = "closed"


class RuleType(str, Enum):
    """Rulesets 规则类型（docs/plans/02-核心模块设计.md 3.4）。"""

    APPROVAL = "approval"
    REQUIRED_CHECK = "required_check"
