"""生成种子工作簿 demo/seed-workbook.xlsx。

包含 8 张固定工作表，并通过领域 Repository 接口预置角色/团队/成员。
参见 docs/plans/04-里程碑任务.md Phase0。
"""

import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from config import SEED_WORKBOOK_PATH, TRACE_OUTPUT_PATH
from constants import (
    ADMIN,
    AUDIT_LOG,
    MEMBERS,
    OWNER,
    PULL_REQUESTS,
    ROLES,
    RULESETS,
    SHEET_NAMES,
    TEAMS,
    WORKFLOW_RUNS,
    WORKFLOWS,
)
from gx.domain.enums import (
    Role as RoleEnum,
)
from gx.domain.enums import (
    RuleStatus,
    RuleType,
    TriggerType,
    WorkflowStatus,
)
from gx.domain.models import Member, Role, RuleSet, Team, Workflow
from gx.domain.repositories import (
    MemberRepo,
    RoleRepo,
    RuleSetRepo,
    TeamRepo,
    WorkflowRepo,
)
from gx.storage.xlsx import LocalXlsxStorage

# 各工作表表头（首行）；audit_log 字段严格对齐 docs/plans/02-核心模块设计.md 3.2
SHEET_COLUMNS: dict[str, list[str]] = {
    MEMBERS: ["id", "name", "role", "team_id", "created_at"],
    TEAMS: ["id", "name", "description"],
    ROLES: ["id", "name", "permissions"],
    WORKFLOWS: ["id", "name", "steps", "trigger", "status"],
    WORKFLOW_RUNS: [
        "id",
        "workflow_id",
        "status",
        "trigger",
        "started_at",
        "finished_at",
        "detail",
    ],
    PULL_REQUESTS: [
        "id",
        "title",
        "author",
        "status",
        "approvers",
        "created_at",
        "merged_at",
    ],
    AUDIT_LOG: [
        "actor_id",
        "action_type",
        "resource_type",
        "resource_id",
        "before_snapshot",
        "after_snapshot",
        "timestamp",
        "source",
        "success",
        "error_msg",
        "prev_hash",
    ],
    RULESETS: ["id", "name", "rule_type", "status", "config"],
}

# 默认规则：demo 与测试工作簿统一预置两条 active 规则（RuleSet.id = rule_type）。
# 规则引擎按 status=active 参与判定（见 docs/plans/10-评审优化第一轮.md 5.1）。
DEFAULT_RULESETS: tuple[tuple[str, str, str], ...] = (
    ("approval", "PR 合并需要至少 1 个审批人", "approval"),
    ("required_check", "required-check 工作流需通过", "required_check"),
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def create_seed_workbook(path: str) -> LocalXlsxStorage:
    """新建空工作簿并预置种子数据，返回已就绪的存储实例。"""
    storage = LocalXlsxStorage.create_workbook(path)
    for sheet_name in SHEET_NAMES:
        storage.add_sheet(sheet_name, SHEET_COLUMNS[sheet_name])
    # 清理 openpyxl 默认工作表，保证恰好 8 张表
    storage.remove_sheet("Sheet")
    build_seed(storage)
    return storage


def build_seed(storage: LocalXlsxStorage) -> None:
    """向已建表的工作簿写入预置角色/团队/成员/工作流。"""
    role_repo = RoleRepo(storage)
    team_repo = TeamRepo(storage)
    member_repo = MemberRepo(storage)
    workflow_repo = WorkflowRepo(storage)

    role_repo.create(Role(id=OWNER, name=OWNER, permissions=["read", "write", "admin"]))
    role_repo.create(Role(id=ADMIN, name=ADMIN, permissions=["read", "write", "admin"]))
    team_repo.create(Team(id=1, name="core", description="核心团队"))
    member_repo.create(
        Member(id=1, name="admin", role=RoleEnum.ADMIN, team_id=None, created_at=now_iso())
    )
    member_repo.create(
        Member(id=2, name="alice", role=RoleEnum.MEMBER, team_id=1, created_at=now_iso())
    )
    workflow_repo.create(
        Workflow(
            id=1,
            name="ci-check",
            steps=[{"type": "shell", "command": "echo ok"}],
            trigger=TriggerType.MANUAL,
            status=WorkflowStatus.ACTIVE,
        )
    )
    seed_default_rules(storage)


def seed_default_rules(storage: LocalXlsxStorage) -> None:
    """幂等写入两条默认 active 规则，供 init_seed 与测试 fixture 复用。"""
    repo = RuleSetRepo(storage)
    existing = {rule.id for rule in repo.list()}
    for rule_id, name, rule_type in DEFAULT_RULESETS:
        if rule_id in existing:
            continue
        repo.create(
            RuleSet(
                id=rule_id,
                name=name,
                rule_type=RuleType(rule_type),
                status=RuleStatus.ACTIVE,
            )
        )


def main() -> None:
    # 重置：清空旧的演示 trace
    trace_path = Path(TRACE_OUTPUT_PATH)
    if trace_path.exists():
        trace_path.unlink()
    create_seed_workbook(SEED_WORKBOOK_PATH)
    print(f"种子工作簿已生成: {SEED_WORKBOOK_PATH}")
    print(f"工作表: {', '.join(SHEET_NAMES)}")
    print("角色 2 个 / 团队 1 个 / 成员 2 个 / 工作流 1 个")


if __name__ == "__main__":
    main()
