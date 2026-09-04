# 已知局限与待改进点（初赛原型）

> 本文档汇总初赛原型阶段**已知但不修复**的局限，评审可据此看到对原型的清醒分析。
> 原则：凡修复会改变 trace 事件 / 对外表现的问题，一律留到决赛迭代，
> 避免已录制的演示视频与轨迹文件对不上。
> 评审优化第一轮（2026-09，见 [docs/plans/10](../plans/10-评审优化第一轮.md)）
> 已修复 #6「规则硬编码」——规则引擎改为读取 `RULESETS` 表 active 行，
> 默认种子两条 active 规则，demo 仍为 10 条事件；其余局限维持决赛迭代。
> 评审优化第三轮 S1（见 [docs/plans/13](../plans/13-评审优化第三轮.md)）
> 已修复 #3/#4——审批身份/自审批/重复审批/状态机，并新增 PR 关闭与变更历史。
> 同步依据：《09-初赛代码优化与提交保护》9.4「禁止改动」清单。
> 评审优化第三轮已修复 #5「required-check 全局串扰」（按 PR 关联）与 #2 的主体部分；
> S3-A（第四轮，见 [docs/plans/14](../plans/14-评审优化第四轮.md)）起 roles 表为
> 唯一权限来源，种子含 owner/admin/member/readonly 四行，缺失角色行视为空权限（拒绝）。
> #12 成员/团队唯一性亦已修复。#1 团队并集提权仍为已知局限，S3 后段处理。

## 一、速览

| # | 模块 | 局限 | 影响 | 修复时机 |
| --- | --- | --- | --- | --- |
| 1 | 权限 | 团队权限“并集”提权 | 同团队成员共享最高角色权限，P001 判定过宽 | 决赛 |
| 2 | 权限 | ~~roles 表部分驱动，缺失角色行回退内置矩阵~~（已修复：S3-A 起唯一来源、缺失行拒绝） | ~~member/readonly 无种子行时改表无效~~（种子已含四行） | 已修复，见 [14](../plans/14-评审优化第四轮.md) |
| 3 | PR | ~~自审批与审批人身份未校验~~（已修复：有效成员/非作者/非重复审批） | ~~作者可审批自己的 PR；审批人可为任意字符串~~（已一致） | 已修复，见 [docs/plans/13](../plans/13-评审优化第三轮.md) |
| 4 | PR | ~~已合并/已关闭 PR 可再次合并~~（已修复：状态机守卫 + close 命令） | ~~重复写 trace，状态机不严格~~（已一致） | 已修复，见 [docs/plans/13](../plans/13-评审优化第三轮.md) |
| 5 | 规则 | ~~`required-check` 取全局最新一条运行记录~~（已修复：按 PR 关联） | ~~多 PR 间运行状态串扰~~（已一致） | 已修复，见 [13](../plans/13-评审优化第三轮.md) |
| 6 | 规则 | ~~规则硬编码，`rulesets` 表未参与判定~~（已修复：表驱动 + 启用/禁用） | ~~配置表与引擎不一致~~（已一致） | 已修复，见 [docs/plans/10](../plans/10-评审优化第一轮.md) |
| 7 | 存储 | 每次写操作全量 save()、哈希链反复读整表 | 性能低，仅适合演示规模 | 决赛 |
| 8 | 存储 | 单进程线程锁，非跨进程 | 多进程并发写无保护 | 决赛 |
| 9 | trace | 无来源字段，无法精确区分 CLI/脚本事件 | 排查只能靠 type 提示 | 决赛 |
| 10 | Mock Agent | 字符串匹配原型，非语义理解 | 指令覆盖有限 | 决赛 |
| 11 | Actions | shell/python 步骤执行任意命令，无沙箱 | 仅限本地演示 | 决赛 |
| 12 | 校验 | ~~成员/团队重名校验缺失~~（已修复：第三轮 S3 起重复名称抛 B001） | ~~`run_demo` 依赖现有行为~~（种子无重名，行为不受影响） | 已修复，见 [13](../plans/13-评审优化第三轮.md) |

## 二、按模块明细

### 2.1 权限引擎（`src/gx/services/perms/permission.py`）

1. **团队权限并集提权**：`_resolve_roles` 会把同团队成员的角色全部并入
   （member 与 admin 同队时，member 获得 admin 权限）。这是原型最核心的已知缺陷，
   修复会改变 P001 拒绝行为，导致 trace 全部对不上，**初赛明确不修**。
2. **`roles` 表为唯一权限来源（S3-A 已修复）**：`PermissionService._role_permissions`
   只读 `roles` 表，缺失角色行返回空权限（拒绝）；种子 `build_seed` 已建
   owner/admin/member/readonly 四行。owner 全局放行与审计/规则特殊表限制仍为设计
   取舍（见第 3 点与速览说明）；团队语义仍为并集提权，S3 后段处理。
3. **owner 无资源限制**：`_role_allows` 对 owner 直接放行（含特殊表），
   属设计取舍，但缺少可配置项。

### 2.2 PR 流程（`src/gx/core/service_bus.py`）

> 第三轮 S1 已修复以下三项：`approve_pr` 校验审批人是真实成员、非作者本人、
> 不重复审批，且 PR 处于 merged/closed 时不可再审批；`merge_pr` 对
> merged/closed 状态做守卫；新增 `close_pr` 与 `pr_history` 支持驳回留痕和
> 变更历史查询。相关失败路径统一抛 `B001` 并写失败审计/trace。

### 2.3 Rulesets（`src/gx/services/rules/`）

1. **`required-check` 已按 PR 关联**（第三轮 S2 修复）：`WorkflowCheck.latest_status`
   支持 `pr_id` 过滤，规则判定取该 PR 最新一次运行状态；多 PR 间不再串扰。

> 评审优化第一轮已修复原“规则硬编码”问题：`RuleService` 改为读取 `RULESETS`
> 表 `status=active` 的行，`gx ruleset enable/disable` 可切换规则；
> 实现见 [docs/specs/rulesets.md](../specs/rulesets.md)。上表 #6 标记已修复。

### 2.4 审计与存储（`src/gx/services/audit/`、`src/gx/storage/`）

1. **性能**：哈希链每次计算读整张 `audit_log`；每次写操作全量 `save()` 整个工作簿。
   演示规模（几十行）无感，生产不可用。
2. **并发**：`MemoryLock` 是单进程线程锁，多进程/多终端并发写无保护；
   `_next_id` 在锁外计算，极端并发下可能 id 冲突。
3. **非事务**：xlsx 写入无回滚，`save()` 失败可能留下部分写入（已加 S005 友好报错）。

### 2.5 trace（`src/gx/services/audit/trace.py`、`tools/check_trace.py`）

1. **无来源字段**：trace 行不含 CLI/脚本来源标记，`check_trace` 只能按 type
   给提示（prompt/tool_call/human_intervene 来自脚本；api_call/workflow_run 共用）。
2. **无滚动清理**：手工 CLI 使用会持续累积历史事件，`run_demo` 才会先删除重建；
   `check_trace` 以行数阈值输出“历史残留”警告。

### 2.6 Mock Agent 与 Actions

1. **字符串匹配**：`MockNlParser` 按固定正则模板匹配，不支持语义理解；
   中英文混排、未列出的指令会直接失败。
2. **无沙箱**：`WorkflowRunner` 的 shell/python 步骤执行任意命令，
   http 步骤无代理/证书处理；步骤输出截断为 200 字符。

### 2.7 其他

1. **重名校验已修复**（第三轮 S3）：`member_add` / `team_add` 对重复名称抛 `B001`
   并留失败审计；种子数据无重名，demo 行为不受影响。
2. **模型 schema 收紧**：领域模型 `extra="forbid"`，新增字段必须同步表头与模型，
   否则 D001 校验失败——这是刻意的安全设计，但演进成本高。
3. **CLI 无确认交互**：add/approve 等命令直接执行，无二次确认；
   对演示友好，但对误操作不设防。

## 三、决赛迭代方向（不限于上述修复）

- 权限引擎改为以 `roles` 表驱动，修复团队并集提权；
- PR 状态机 + 审批人身份/自审批校验；
- required-check 按 PR 精确关联运行记录；
- 存储层增量持久化、跨进程锁、事务回滚；
- trace 增加来源字段与滚动清理；
- Actions runner 沙箱化、步骤输出完整落库；
- 接入真实 LLM Agent（见根目录 `FUTURE.md`）。
