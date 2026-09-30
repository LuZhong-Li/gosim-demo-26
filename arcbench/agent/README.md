# ARC-Bench 提交 Agent

平台以 `python main.py <requirements-source> --output-dir <dir>` 调用本包。
规则要求 agent 必须真的调用模型、且模板保持通用，所以本包只带一个
**纯技术栈脚手架**，任务代码由模型在运行时生成。

## 目录

| 文件 | 职责 |
| --- | --- |
| `main.py` | 入口：读需求树 → 找公开 spec → 铺脚手架 → 逐模块生成 → 构建契约守护 → 启动演练 → 上报状态 → 提交 |
| `llm.py` | OpenAI 兼容客户端（非流式）。`max_tokens` 下限 32768，记录 `finish_reason`，空回复或截断会用更大预算重试 |
| `prompts.py` | UI 契约、性能契约、栈契约、生成与修复的系统提示词 |
| `verify.py` | 构建与启动演练、结构收尾、端口清理、公开 spec 定位与本地验收运行 |
| `guard.py` | 生成后校验并回滚被改坏的构建关键文件 |
| `selfcheck.py` | 核对需求里引号内的名称是否真的出现在生成的源码里 |
| `arcbench_agent_runtime/` | 平台协议 SDK（平台不预装，随包上传） |
| `templates/scaffold/` | **唯一**模板：Vite + React 前端、Express 后端、JSON 持久化，无任务特定页面 |
| `assets/<task>/requirement-map.json` | 该题的需求树（含原子需求、场景、种子数据） |
| `assets/<task>/prompts/*.md` | 该题的领域说明（对象关系、可访问名称），随模块提示词一起喂给模型 |

## 一次运行的顺序

1. 解析参数（容忍未知参数，接受 `--type` / `--app-type` / `--web-port`），定位输出目录。
2. 读 `requirements.yaml`，把需求树写进 traceability。
3. 按 `ARCBENCH_TESTS_DIR` → `/workspace/tests` → bundle 内 `public-tests/` 找公开
   Playwright spec；找到就把正文注入提示词（"spec 与需求冲突时以 spec 为准"），
   并从 spec 里扫描硬编码端口，写进端口契约。
4. 铺脚手架，补 `frontend/.npmrc` 与 `backend/.npmrc`（npmmirror）。
5. 每个 `REQ-<n>` 模块一次模型调用，把该模块的全部原子需求、场景、种子数据、
   UI 契约与领域说明放进提示词；受墙钟预算约束（`ARC_TIME_BUDGET`，默认 3600 秒）。
6. `guard.py` 回滚被改坏的构建关键文件。
7. **启动演练**：按评测机的顺序在**非评测端口**跑
   `npm install && npm run build`（frontend）、`npm install`、`PORT=<smoke> npm start`
   （backend），等端口就绪后杀掉进程。失败就把错误回喂一次修复轮。
8. 上报标准 traceability 状态（`DESIGNED` / `IMPLEMENTED` / `PASSED` / `FAILED`），
   不再写 `CONVERGED`、`SCAFFOLDED` 这类 SDK 不认识的字符串。
9. 结构收尾（缺 `frontend/` 或 `backend/` 会被平台判为 `template is incomplete`）、
   释放评测端口、写 `ARCBENCH_ARTIFACTS_DIR/preview-ready.json`。

## 为什么要有第 7 步

评测机在后端 120 秒内没有就绪时**一条测试都不执行**（0 分，而不是部分分）。官方参考
实现 round 30 就是这样翻车的：生成阶段正常结束，`npm start` 在评测时崩在
`Cannot find module './seed'`。

演练端口绝不能是评测端口（默认 3000）：runner 会监视该端口，一旦生成期有服务应答就
判定"agent 已完成"并 SIGTERM 整个 run（官方 round 21 与 round 33 均因此死亡）。
演练使用 `ARC_SMOKE_PORT`（默认 3100），并给子进程设 `ARC_EXTRA_PORTS=0`。

## 本地自测

```powershell
$py = "D:\gosim-demo-26\.venv\Scripts\python.exe"
$env:PYTHONPATH = "D:\gosim-demo-26\arcbench\agent"
# 无模型：只验证脚手架、结构与状态上报
$env:ARC_SKIP_REHEARSAL = "1"
& $py arcbench\agent\main.py arcbench\runs\github\requirements --output-dir $out
# 带 stub 模型：验证生成路径与守卫
Start-Process $py -ArgumentList "arcbench\notes\llm_stub.py","8791" -WindowStyle Hidden
$env:OPENAI_BASE_URL = "http://127.0.0.1:8791/v1"; $env:OPENAI_API_KEY = "stub"
$env:MODEL = "deepseek-v4-flash"
& $py arcbench\agent\main.py arcbench\runs\github\requirements --output-dir $out
# 带本地 Playwright 套件（需要 ARC_PLAYWRIGHT_CLI 与 ARC_PLAYWRIGHT_CONFIG）
$env:ARC_TESTS_DIR = "arcbench\data\keep\tests"
$env:ARC_NODE = "node"
$env:ARC_PLAYWRIGHT_CLI = "arcbench\upstream\node_modules\@playwright\test\cli.js"
$env:ARC_PLAYWRIGHT_CONFIG = "arcbench\notes\r33-regression.config.cjs"
```

本机没有 npm，所以演练会打印 `SKIP: npm is not on PATH in this container` 并把节点标为
`FAILED`（未验证）。评测容器里有 npm，演练正常执行。

## 可调环境变量

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `ARC_TIME_BUDGET` | 3600 | 整个生成阶段的墙钟预算（秒） |
| `ARC_LLM_TIMEOUT` | 600 | 单次模型请求超时（秒） |
| `ARC_LLM_MAX_TOKENS` | 32768 | 单次请求输出上限 |
| `ARC_LLM_REASONING_EFFORT` | 自动 | 推理强度；deepseek 路由默认 `low`，设为空串即不发送该字段 |
| `ARC_SMOKE_PORT` | 3100 | 演练端口，绝不能等于评测端口 |
| `ARC_SKIP_REHEARSAL` | 未设 | 设为 `1` 跳过构建与启动演练 |
| `ARC_NPM_REGISTRY` | npmmirror | 写进两个 `.npmrc` 的镜像源 |
| `ARC_SPEC_BUDGET` | 60000 | 注入提示词的 spec 字符上限 |

平台结构校验：web 任务生成产物必须含 `frontend/` 与 `backend/`
（backend 监听 `PORT`、暴露 `/api/health`、托管 `frontend/dist`），
见 `notes/run3-platform.md`。
