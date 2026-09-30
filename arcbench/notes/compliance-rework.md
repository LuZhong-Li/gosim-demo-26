# 合规改造记录（2026-09-30）

## 规则依据

参赛须知 FAQ：

- **不允许不请求大模型的智能体**（不调用模型的"智能体"本质是固定程序）；
- **不得预先写入、复制或直接释放针对具体比赛任务实现的代码**；
- 允许**通用脚手架**（`template/` 可以是目标技术栈的通用初始化框架），
  **不允许**其中含"针对当前任务预先实现的页面、业务逻辑或功能组件"；
- "预制或硬编码任务答案"列入违规审核，自动 + 人工审核。

改造前：`arcbench/agent/templates/{github,sheet,keep,web-react-express}` 里装的是这几个任务
的完整实现，运行日志 `Tokens 0`。**两条都踩**。

## 改造内容

### 1. 让 agent 真正调用模型（已完成）

- 新增 `arcbench/agent/llm.py`：纯标准库的 OpenAI 兼容客户端，读平台注入的
  `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `MODEL`（来自官方 local-simulation 的 `env.example`），
  失败重试 3 次并记录 token 用量。
- `main.py` 新增"模型生成"阶段：把需求模块清单交给模型，模型以
  `{"files":[{path,content}],"covered":["REQ-…"]}` 的 JSON 返回任务专属源码，
  逐文件写入工程（拒绝绝对路径与 `..` 段），产出 `generation-report.json`；
  `covered` 里的需求 id 会被标为 CONVERGED。
- 无 key / 调用失败时走兜底，仍产出可运行脚手架。
- 用本地 stub 端点验证：1 次调用、33 token 记录、文件落盘、`../escape.txt` 被拒、
  无 key 仍出工程。

### 2. 模板降级为通用脚手架（已完成）

- 4 个任务模板整体移出提交包 → `arcbench/reference/{github,sheet,keep,web-react-express}`
  （仍在 git 里，便于回退与参考）。
- 新建 `arcbench/agent/templates/scaffold/`：只有 Vite+React 前端骨架
  （`App.tsx` 是占位页、通用 axios 客户端与 token 存储）与 Express 后端骨架
  （`/api/health`、静态托管 + SPA 回退、JSON 文件持久化 helper）。
  **没有任何任务专属页面、路由或业务逻辑。**
- `main.py`：`WEB_FALLBACK_TEMPLATE = "scaffold"`，每个任务都用脚手架；
  requirement map 仍按任务从 `assets/<task>/` 读取。

验证：运行 agent（无 key）→ 日志 `task=github template=scaffold`、
`requirement map loaded from assets/github`；生成物只剩
`.arc/ backend/ frontend/ modules/ .gitignore coverage.json generation-manifest.json
generation-report.json README.md`，**不含** RepoPage / SheetPage / PullsTab / gh_store /
sheet_store / seed 等任何任务实现。

## 尚未验证 / 已知风险

- **脚手架能否构建运行未在本地验证**：本机 pnpm 安装报错，且 pnpm 的 store 软链跨目录无法解析，
  所以没有本地 `vite build` + 启动的结论。平台侧的 `npm install` + `vite build` 才是真正验收，
  这一步必须靠下一次提交确认。
- **分数预期会下降**：改造前 r33 是 15/200（7.5%），那 15 条来自预置实现。
  现在应用完全依赖模型现场生成，**短期分数很可能低于 15**，需要靠提示词与迭代爬回来。
- **回退点**：git tag `pre-generic-template`（改造前的完整状态）。
- **`arcbench/reference/` 仍留在仓库里**：它是本地参考资料，不属于提交包
  （提交包由 `arcbench/agent/` 打包）。如果审核范围包含整个仓库，需要把该目录也移出仓库或加进 .gitignore。
