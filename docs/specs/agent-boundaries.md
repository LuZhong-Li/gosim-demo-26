# Agent 边界与架构原则

> 本文件固化第二轮优化后的 Agent 边界。所有新增 Agent 能力必须遵守，
> 不得为了"功能更多"破坏现有业务安全边界。

## 1. 核心边界

1. Agent 是上层交互入口，只调用 `ServiceBus` 门面；不直接读写 xlsx 业务表。
2. Agent 组织经验库属于思考辅助，不参与权限、Rulesets、PR 等业务判定。
3. 业务修改必须走 `ServiceBus` 服务层，受 `PermissionService`、`AuditInterceptor` 管控。
4. 真实 LLM 只在 `codex/dev` 实验，默认关闭；`main` 保持离线可运行。

## 2. 两条架构原则

1. **注册操作支持可逆卸载**：新增服务、工具、监听器时，应同时提供对应的
   卸载/清理路径，避免实验功能污染运行时状态。
2. **重要事件必须审计/trace 留痕**：权限拒绝、规则变更、工作流运行、Agent
   工具调用等关键动作，必须进入 `audit_log` 或 `trace.jsonl`，且 schema 稳定。

## 3. 不引入的重型架构

- 不照搬 mioa-harness / DeepSeek Harness 的完整插件系统、四模式事件总线、
  disposer 注册链。现有 `ServiceBus + Interceptor + TraceWriter` 已足够。
- 不引入 LLM 自由编辑业务域数据的能力；记忆编辑只在 Agent 经验库内留痕。
