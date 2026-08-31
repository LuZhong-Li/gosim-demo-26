"""生成种子工作簿 demo/seed-workbook.xlsx。

包含 8 张固定工作表，并预置 owner/admin 两个默认角色与一个 admin 默认用户。
参见 docs/plans/04-里程碑任务.md Phase0。
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

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
    WORKFLOWS,
    WORKFLOW_RUNS,
)
from config import SEED_WORKBOOK_PATH
from src.gx.storage.xlsx import LocalXlsxStorage

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
    RULESETS: ["id", "name", "rule_type", "config"],
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def main() -> None:
    storage = LocalXlsxStorage.create_workbook(SEED_WORKBOOK_PATH)
    for sheet_name in SHEET_NAMES:
        storage.add_sheet(sheet_name, SHEET_COLUMNS[sheet_name])
    # 清理 openpyxl 默认工作表，保证恰好 8 张表
    storage.remove_sheet("Sheet")

    # 预置默认角色
    storage.append_row(ROLES, {"id": OWNER, "name": OWNER, "permissions": "read,write,admin"})
    storage.append_row(ROLES, {"id": ADMIN, "name": ADMIN, "permissions": "read,write,admin"})
    # 预置默认 admin 用户
    storage.append_row(
        MEMBERS,
        {"id": 1, "name": "admin", "role": ADMIN, "team_id": "", "created_at": now_iso()},
    )

    print(f"种子工作簿已生成: {SEED_WORKBOOK_PATH}")
    print(f"工作表: {', '.join(SHEET_NAMES)}")


if __name__ == "__main__":
    main()
