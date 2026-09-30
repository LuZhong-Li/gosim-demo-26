# 四个外部仓库的调研结论（2026-09-30）

本地克隆位置：`arcbench/upstream/external/`（`/arcbench/upstream/` 已在 `.gitignore` 内，
第三方产物不入库）。

| 仓库 | 是什么 | 对我们有用吗 |
|---|---|---|
| `octos-org/arc-adapter` | 官方标准参考适配包（Octos 驱动 ARC-Bench） | **有用**：平台契约、UI 契约、打分流程的第一手描述 |
| `octos-org/octos-arc` | 主办方推荐的参赛仓库（内核 + `arc/` 适配层 + 公开测试 + 本地打分器） | **最有用**：平台初始模板、逐节点验收、真实云端改前/改后数据 |
| `RISE-X-Lab/OpenCollab` | 多智能体编程框架（SWE-bench / Terminal-Bench 评测） | 与 ARC-Bench 无关，不入我们的路线 |
| `xqscora/cogram-goai` | GOAI 2026 Agent Infra 赛道的三代理参考实现 | 不是 ARC-Bench，仅可借鉴"trace 防篡改"写法 |
| `tensor1291/NutriAgent` | 营养助手产品（FastAPI + LangGraph） | 与本赛事无关 |
| `zqh5376411-svg/oaic-arc-solo-2026` | 单人 ARC harness + 官方信息核对文档 | 有用（已收录官网事实与待确认问题清单） |

---

## 一、平台契约（这次才拿到的一手描述）

### 1.1 平台初始工作区模板是"零依赖"的

`octos-arc/arc/template/`（README 原文）：平台把这份模板铺进
`ARCBENCH_TEMPLATE_DIR` 交给 `main.py`，**里面不允许任何需要 `npm install` 的东西**——
"the container's route to npmjs is slow"。

```text
frontend/package.json   build = node -e "cpSync('src','dist')"   # 无依赖
frontend/src/index.html
backend/package.json    start = node server.js                   # 无依赖
backend/server.js       http.createServer + 静态托管 ../frontend/dist
```

两个 manifest 由 harness 自己持有，模型不花轮次改它们。前端的"构建"就是原样拷贝，
后端是裸 `http`，**没有 Vite、没有 React、没有 Express、没有 axios**。

### 1.2 评测机执行的确切序列

`octos-arc/arc/grade-local.py` 是按平台口径写的，`arc-adapter/README.md` 的产出要求与之
一致：

```text
1. cd frontend && npm install --no-audit --no-fund --no-package-lock && npm run build
2. cd backend  && npm install --no-audit --no-fund --no-package-lock
3. cd backend  && PORT=<port> npm start      # 等端口就绪
4. npx playwright test -c <config>            # E2E_BASE_URL=http://127.0.0.1:<port>
```

- **单条测试超时 10 000 ms**（`test_timeout_ms = 10000`，与平台一致），全套 `workers = 4`。
- 后端就绪探测：本地打分器 30 s（60 × 0.5 s），`arc-adapter` 记录平台侧是 **120 s**；
  探测失败就**一条测试都不执行**（0 分），不是"部分分"。
- 生成期结束前**必须把后端/前端服务全部杀掉**，否则端口被占。

### 1.3 端口契约（我们之前理解不完整）

`arc-adapter` 注释与 `octos-arc/arc/prompts/port-contract.md` 都写明：
**公开 spec 里硬编码的默认端口可能不等于评测端口**。平台只设 `PORT`，
所以应用必须**同时**监听 `PORT` 和 spec 里出现过的端口：

```js
// 必须为每个端口单独 createServer —— 同一个 Server 调两次 listen() 会
// ERR_SERVER_ALREADY_LISTEN 直接把进程打死（r5-tb 就是这样 0/10 的）
```

实现方式：扫描 spec 文本里的 `127.0.0.1:<port>` / `localhost:<port>`，把 `PORT`
和这些端口都绑上，附加端口用 `process.env.ARC_EXTRA_PORTS !== '0'` 兜住。

### 1.4 评测端口 3000 在生成期会被"端口哨兵"盯上

`arc-adapter` 的 `_port_watchdog` / `_free_web_port` / `APP_SKELETON_PROMPT`：

- 生成期**自己**把服务起在 3000，会让 runner 判定"agent 已完成"并 SIGTERM 整个 run
  （round 21、round 33 均因此死亡）。
- 烟雾测试一律用独立端口（官方用 3100），并把 `PORT` 环境变量预设成烟雾端口，
  这样"裸 `npm start`"也不会落到 3000。
- 生成结束后还要 `_postflight_structure_check` + `_free_web_port` 收尾。

### 1.5 模型通道的坑（与我们 `llm.py` 直接相关）

`arc-adapter/main.py::build_octos_env` 的注释是实测结论：

- 平台模型代理**不支持 SSE 流式**，非流式请求才是对的（我们是 urllib 非流式，OK）。
- **deepseek 系推理模型如果 `max_tokens` 太小，会把预算全花在 `reasoning_content`
  上，返回 `finish_reason=length` 且 `content` 为空、无工具调用**——官方因此把
  `max_output_tokens` 提到 65536，`max_tokens_min = 32768`，并对 DeepSeek V4
  显式把 `reasoning_effort` 压到 `low`（甚至 `none`）。
- 平台代理会间歇性 500（"上游负载"），启动时先做一次裸 `chat/completions` 探活
  再生成。

### 1.6 日志与产物

- **stdout 会被平台截断**，关键日志要同时写 stderr（stderr 是独立字段，不进判定）。
- 上传上限约 50 MB；大二进制运行时下载。
- 收尾可写 `ARCBENCH_ARTIFACTS_DIR/preview-ready.json`（`{"ready": true, ...}`）
  通知平台预览就绪。
- `requirements.txt` 官方用 `pyyaml>=6.0` + `arcbench-runtime>=0.1.0`（我们也 vendor 了 SDK）。

---

## 二、官方是怎么保证分数的（可复用的方法）

`octos-arc/arc/verify_node.py` + `pipeline-implement.md`：

1. **逐节点**：实现一个需求 → 立刻 build → 起服务（独立端口）→ **只跑属于该节点的
   公开 spec** → 失败把 Playwright 原文 + **ARIA 页面快照**回喂修复轮。
2. 修复轮 K ≤ 5，连续两次变差不升反降就回滚到最好的一次 commit。
3. 跑测试前 `git add -A`、跑完 `git checkout -- . && git clean`，**把测试对持久化数据的
   改动还原**（r5-counter 的 0/1 就是被测试改成 -1 的 db.json 被提交了）。
4. 全部节点做完再跑一次全量并行套件（workers=4），再给 2 轮修复。
5. 需求树按**依赖拓扑序**遍历，子节点提示词带祖先的设计 JSON 摘要。

`octos-arc/arc/CHANGELOG.md` 的 A1 节记录了一个关键教训：
**如果 traceability 的节点 id 与 spec 侧 id 对不上，云端"功能实现率"会直接归零。**
官方做法是节点状态同时镜像到 spec 侧 id（`REQ-1.1`、`REQ-1.2`），并把每条测试结果
写进 `tests` 表、设计写进 `node_contracts`。

---

## 三、对照我们 `arcbench/agent` 的差距（按影响排序）

### P0-1 生成完不做任何构建/启动验证

我们 `main.py` 唯一"自测"分支要求 `ARC_PLAYWRIGHT_CLI`，平台不设这个变量，
所以**平台上这段是死代码**；即便本地跑，它也是用 `python -m http.server` 托管
项目目录，而不是启动真实应用。官方 round 30 的翻车点（`npm start` 崩在
`Cannot find module './seed'`）我们完全没有防线 → 模板不完整或后端崩 = 0 分。

**改法**：写完文件后跑一次"演练"：`frontend npm install && npm run build`、
`backend npm install && PORT=<烟雾端口> npm start` 等待绑定成功再杀掉；失败就把
错误回喂一次修复轮。这正是 `arc-adapter::_rehearse_startup`。

### P0-2 模型调用 `max_tokens=4096`，且不处理截断/空回复

`llm.py` 默认 `max_tokens=4096`，而平台默认模型就是 `deepseek-v4-flash`。
官方实测：这个值下推理模型会把预算烧在 reasoning 上、返回空 content。
我们现在遇到空回复只是记一条 error 并让该模块**静默产出 0 个文件**。

**改法**：默认提到 32768；记录 `finish_reason`；空回复重试并加大上限；
必要时带 `reasoning_effort: low`。

### P0-3 提示词缺官方"UI 契约"（分数主要来自 UI 可测性）

`arc-adapter` 的 `UI_CONTRACT_PROMPT` 是从真实失分里长出来的，我们 `STACK_RULES` 只有
三四行。核心条款：表单字段一律 `type="text"`（禁止 `type="date"`/`number`）、
每个字段有可见 `<label>`、**不用 HTML5 原生校验**（JS 输出错误文字）、
按钮是带纯文本的 `<button>`、需求里每个引号字符串**逐字**进 UI、
**严格模式唯一性**（同一值在页面上只能出现在一个可见元素里）、种子数据按需求原文、
校验失败在**同一页只渲染一个**错误元素、注册/登录后跳首页并在 header 显示用户名 +
登出链接且刷新保持会话。

### P0-4 我们写的 traceability 状态值不是枚举内的值

SDK 的 `_emit_requirement_state` 把 (phase,status) 映射为
`DESIGNING/DESIGNED/IMPLEMENTING/IMPLEMENTED/PASSED/FAILED`，
但我们在后面又 `upsert_node_state(node_id, "CONVERGED"/"SCAFFOLDED")` 覆盖成
非标准字符串。官方 A1 说明云端确实按节点状态统计"功能实现率"。

**改法**：只发标准状态；真实跑过测试的节点发 `mark_test_passed`，其余 `mark_test_failed`；
并按 spec 侧 id 镜像一份。

### P1-1 依赖 `npm install` 的脚手架（平台模板刻意零依赖）

我们的脚手架前端要装 vite/react/react-dom/react-router-dom/axios/jsdom/vitest，
后端要装 express。官方模板的设计目标就是"eval 机到 npmjs 很慢，模板不得依赖 install"。
r30–r33 能出分说明能装上，但这是已知的翻车点。

**改法**（择一，成本递增）：① 给 `frontend/`、`backend/` 各写一个
`registry=https://registry.npmmirror.com` 的 `.npmrc`；② 后端改零依赖裸 http；
③ 整个换成官方那种"静态 HTML + 裸 http"模板。

### P1-2 参数解析太严，多一个 flag 就整轮 0 分

`parse_args` 只有 positional + `--output-dir`；`argparse` 遇到未知参数会
`SystemExit(2)`，而 `except Exception` 抓不到 `SystemExit`。官方适配包同时接受
`--type/--app-type/--web-port`。

**改法**：`parse_known_args`，并补齐 `--type/--app-type/--web-port`。

### P1-3 日志只写 stdout（会被截断）

**改法**：`log()` 双写 stdout + stderr（照搬 `arc-adapter`）。

### P1-4 没有时间预算、没有收尾兜底

官方有 `OCTOS_TIME_BUDGET`（默认 2700/3600 s）、超时后不再开新轮直接进入收尾，
保证"干净退出的半成品"好过"被 SIGTERM 打断"。我们没有任何预算控制。

**改法**：加墙钟预算；到点停止生成、照常收尾（结构检查 + 杀端口 + 写事件）。

### P2-1 没有验收 spec 发现逻辑

官方按 `ARCBENCH_TESTS_DIR` → `/workspace/tests` → bundle `public-tests/` 顺序找公开
spec，并写进提示词（"spec 与需求冲突时以 spec 为准"）。`octos-arc/arc/public-tests/`
里确实有平台公开题（12306/bookstack/ctrip/keep/prestashop/stackoverflow/ticket-booking
+ smoke）的完整 spec——**但没有本次黑客松的 github / sheet 题**，我们落在
`hackathon--github` / `hackathon--sheet` 两个私有题上，公开目录里查不到。
仍然值得把这条路修好，因为评测机可能在生成期把 spec 挂到 `/workspace/tests`。

### P2-2 没有 `preview-ready.json` 产物

### P2-3 没有 per-node 的"实现 → 验收 → 修复 → commit/回滚"循环

我们是一模块一次模型调用、写完就完事。官方是每节点验证 + 最多 5 轮修复 +
连续变差就回滚到最优 commit。

### P2-4 测试会改数据，我们没做还原

若将来真的在生成期跑测试，必须先 `git add -A` / 跑完 `checkout + clean`。

---

## 四、可以直接借鉴的现成文件

| 文件 | 借什么 |
|---|---|
| `arc-adapter/main.py::UI_CONTRACT_PROMPT` | 直接改写成我们的提示词 |
| `arc-adapter/main.py::_rehearse_startup` / `_postflight_structure_check` / `_free_web_port` | 启动演练 + 结构收尾 |
| `arc-adapter/public-tests/ticket-booking--ticket-booking/support/e2e.ts` | 官方测试怎么写断言（getByLabel/getByRole/alert/严格模式） |
| `octos-arc/arc/template/` | 零依赖模板（若决定换栈） |
| `octos-arc/arc/verify_node.py` | 逐节点验收 + 失败时 ARIA 快照 |
| `octos-arc/arc/grade-local.py` | 按平台口径本地打分（10 s 超时、workers 4） |
| `octos-arc/arc/prompts/port-contract.md` | 双端口 `createServer` 写法 |
| `octos-arc/arc/arc-policy.toml` | 全部可调参数与实测默认值 |
| `octos-arc/arc/CHANGELOG.md` | 真实云端/本机改前改后数据与失分归因 |
