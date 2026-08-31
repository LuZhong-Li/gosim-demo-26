# 规格文档

> 数据模型、权限矩阵、规则定义的实现规格。依据 docs/plans/02-核心模块设计.md。

## 数据模型

8 张固定工作表对应 8 个领域模型：

| 工作表 | 模型 | 关键字段 |
| --- | --- | --- |
| `members` | Member | id、name、role、team_id、created_at |
| `teams` | Team | id、name、description |
| `roles` | Role | id、name、permissions |
| `workflows` | Workflow | id、name、steps、trigger、status |
| `workflow_runs` | WorkflowRun | id、workflow_id、status、trigger、started_at、finished_at、detail |
| `pull_requests` | PullRequest | id、title、author、status、approvers、created_at、merged_at |
| `audit_log` | AuditLogEntry | actor_id、action_type、resource_type、resource_id、before_snapshot、after_snapshot、timestamp、source、success、error_msg、prev_hash |
| `rulesets` | RuleSet | id、name、rule_type、config |

存储约定：首行是表头，`row_id` 从 0 开始；列表/字典字段在 xlsx 中存 JSON 字符串；
`audit_log` 只追加，禁止修改/删除。

## 权限矩阵

| 角色 | 读所有 Sheet | 写普通 Sheet | 写审计/规则表 | 管理成员 |
| --- | --- | --- | --- | --- |
| owner | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| member | ✅ | ✅ | ❌ | ❌ |
| readonly | ✅ | ❌ | ❌ | ❌ |

判定顺序：用户自身角色 → 所属团队角色取并集 → 默认拒绝；owner 全局放行。
资源形如 `workbook`（组织级）或 `sheet:<name>`（单表）。

## Rulesets 规则定义

初赛实现两条规则：

1. 审批规则：PR 合并至少需要 1 个审批人。
2. required-check：存在最新工作流运行记录且状态非 success 时，阻止 PR 合并。

违规返回 `RuleViolation(rule_id, message, resource_id)`，由门面抛出 `R001`。

## 工作流步骤 Schema

步骤按顺序执行，任一失败即中断：

- `{"type": "shell", "command": "..."}`
- `{"type": "python", "code": "..."}`
- `{"type": "http", "url": "...", "method": "GET"}`

## trace 字段

`trace.jsonl` 每行一个 JSON 对象，必填字段：

`timestamp, type, actor, action, resource, detail, success, error_msg`

`type` 枚举：`prompt / api_call / tool_call / workflow_run / human_intervene`。
