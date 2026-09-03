"""全局基础配置。

路径、开关等可调参数统一在此维护；改参数不翻业务代码。
参见 docs/plans/03-分层与代码结构.md 4.5。
"""

# 调试开关：开启后打印调用链路、入参出参、数据快照与完整堆栈
DEBUG_MODE = False

# 种子工作簿路径（Phase0 由 demo/init_seed.py 生成）
SEED_WORKBOOK_PATH = "demo/seed-workbook.xlsx"

# trace 输出路径（审计拦截器自动追加，禁止手动编辑）
TRACE_OUTPUT_PATH = "demo/output/trace.jsonl"

# Agent 组织经验库（上层辅助记忆，不参与权限/规则判定）
AGENT_MEMORY_PATH = "demo/output/agent_memory.jsonl"

# 可选真实 LLM 适配器：默认关闭；未配置 key 时 Mock Agent 保持离线行为
AGENT_LLM_ENABLED = False
AGENT_LLM_API_KEY = ""

# request_id 追踪：默认关闭；开启后只写入 detail 子字段，不改 trace 顶层 schema
AGENT_REQUEST_ID_ENABLED = False

# 默认操作者：未显式传入 actor 时使用
DEFAULT_ACTOR = "system"

# CLI 默认操作者成员 ID（种子工作簿中的 admin）
CLI_ACTOR_ID = 1
