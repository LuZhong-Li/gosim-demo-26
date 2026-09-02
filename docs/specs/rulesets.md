# Rulesets 规则规格

> 实现依据：docs/plans/10-评审优化第一轮.md 工作流一。
> 代码位置：`src/gx/services/rules/service.py`、`src/gx/core/service_bus.py`、
> `src/gx/domain/models.py`、`demo/init_seed.py`。

## 1. 数据模型（`RULESETS` 表）

`RULESETS` 表共 5 列（表头即列名）：

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | str | 规则 id，等于 `rule_type` 值（`approval` / `required_check`） |
| `name` | str | 规则展示名称 |
| `rule_type` | str | `approval`（审批≥1）/ `required_check`（工作流通过） |
| `status` | str | `active`（参与判定）/ `disabled`（跳过），默认 `active` |
| `config` | dict | 预留参数（当前为空对象 `{}`） |

种子工作簿预置两条 `active` 规则（`seed_default_rules`，幂等写入）：

| id | name | rule_type | status |
|---|---|---|---|
| `approval` | PR 合并需要至少 1 个审批人 | `approval` | `active` |
| `required_check` | required-check 工作流需通过 | `required_check` | `active` |

## 2. 引擎语义（`RuleService`）

1. `RuleService` 构造时可接收 `RuleSetRepo`；**规则唯一事实来源是表中
   `status=active` 的行**；
2. `disabled` 行不参与判定；没有任何 active 行 = 全部规则关闭，合并不再被拦；
3. `ruleset_repo=None`（仅直接构造引擎的单元测试使用）时回退到内置两条
   默认规则；`ServiceBus` 始终传入仓储，不出现回退；
4. 单条规则的判定语义与初赛一致：

| rule_type | 触发违规条件 | 输出 rule_id |
|---|---|---|
| `approval` | `pr.approvers` 为空 | `approval` |
| `required_check` | 存在最新工作流运行记录且状态非 `success` | `required_check` |

违规统一抛 `GXError(R001)`。

## 3. ServiceBus 接口

| 方法 | 权限 | 行为 |
|---|---|---|
| `list_rulesets()` | 只读，无需权限 | 返回全部规则行 |
| `ruleset_set_enabled(subject_id, rule_id, enabled)` | `sheet:rulesets` 写权限（admin/owner 特殊表） | 启用/禁用；同状态幂等不写审计；变更写 `ruleset.update` 审计 + trace（type=`api_call`） |

变更留痕字段：

| 字段 | 值 |
|---|---|
| audit `action_type` | `ruleset.update` |
| audit `resource_type` / `resource_id` | `rulesets` / 规则 id |
| `before_snapshot` / `after_snapshot` | `{"status": "active"\|"disabled"}` |
| trace `type` | `api_call`（不新增 type） |

## 4. CLI

```bash
gx ruleset list
gx ruleset enable approval
gx ruleset disable approval
```

- `list`：输出表头 `ID 类型 状态 名称`；
- `enable/disable`：成功后绿色 `[OK]`；readonly/member 越权输出红色 `P001`；
- 未知规则 id 输出 `S004`。

## 5. 默认行为保持

种子两条规则默认 `active`，因此 `demo/run_demo.py` 的合并拦截（R001）行为与
优化前一致，正式 trace 仍为 10 条事件；只有显式执行 `gx ruleset disable` 后
对应规则才不再参与判定。
