# ARC-Bench 参赛工作交接文档

> 更新：2026-10-03 18:45（北京时间）｜作者：本次无人值守迭代的完整记录
> 适用范围：`D:\gosim-demo-26\arcbench\**`（本仓库里的 ARC-Bench 子项目，**与 GX-Sheet 主线产品无关**）
> 先读这份，再按第 9 节的"交接清单"上手；细节都在第 10 节列出的笔记里。
> 17:40 补写：§11 无人值守自动化与通知策略、§12 决策记录、§13 命名与目录约定；
> 同时把**探针、打包脚本与保险包**纳入版本库（此前它们在 gitignore 里，新克隆会丢）。
> 18:45 补写：§8 更新到当前状态（r85 在跑 / r86 待发 / 保险6 = 9.65）并新增 §8.1
> **包与运行版本的对应关系**（r85 从未被覆盖，新代码进的是 r86）。

---

## 0. 一句话现状

我们做的不是一个应用，而是**一个"参赛智能体"**：平台给它一份官方需求，它要现场用大模型
生成一个可跑的 Web 应用，再交给平台的 Playwright 用例评分。目前：

* **兜底基线（唯一稳定得分）**：`arcbench/dist/arc-agent-r33.zip` —— 预置成品应用，
  官方跑出 **9.65 分 / 13-of-200**（GitHub 原题 **11.31 / 8.0%**），￥0、约 20 分钟。
* **生成型（我们真正想跑的路线）**：最好一轮是 r78 的 **1.59**（原题），
  r79/r80/r81/r82 都是 **0.00**；根因见第 5 节。
* 榜单取"**最后一次保存的提交**"，所以每次上传前必须记录当前最佳，并在收尾时把保险包放回最后一位。

---

## 1. 仓库结构：哪些是提交物，哪些是资料

```
D:\gosim-demo-26\
├── arcbench\                 ← 本子项目全部内容
│   ├── agent\                ★ 提交物本体（打成 zip 上传的就是这个目录）
│   │   ├── main.py           入口：读需求 → 生成 → 守卫 → 演练 → 上报
│   │   ├── guard.py          生成后所有"守卫/修复"pass（20 万字符，核心）
│   │   ├── verify.py         构建/启动演练、store 契约、前端构建闸门
│   │   ├── llm.py            模型客户端（OpenAI 兼容，带重试）
│   │   ├── prompts.py        系统提示词
│   │   ├── selfcheck.py      需求引号名 ↔ 源码字符串核对
│   │   ├── arcbench_agent_runtime\  平台协议 SDK（必须随包上传）
│   │   ├── templates\scaffold\      唯一模板：Vite+React / Express / JSON 存储
│   │   └── assets\<task>\           该题需求树与领域说明（喂给模型）
│   ├── dist\                 ● 打好/上传过的 zip（`arc-agent-rNN.zip`、保险包）
│   ├── runs\                 ● 本地探针与打包中间产物（**gitignored**）
│   ├── notes\                ● 全部笔记：时间线、问题清单、日志统计（见第 10 节）
│   ├── downloads\            ● 平台日志、run 产物、群聊记录（gitignored）
│   ├── requirements\         官方需求原文（hackathon--github / hackathon--sheet）
│   └── upstream\ reference\  第三方参考（gitignored）
├── README.md                 GX-Sheet 主线产品说明（与 ARC-Bench 无关）
└── web\ src\ demo\ ...       GX-Sheet 主线产品（**不要动**）
```

**打包 = `agent/` 目录内容平铺在 zip 根**（必须含 `main.py`、`arcbench_agent_runtime/`、
`templates/sheet/`；**不能含 `.arc/`**）。当前包固定 **119 项**。

---

## 2. 平台契约（评测怎么跑）

| 步骤 | 平台执行 | 我们的前提 |
|---|---|---|
| 1 | 解压我们的 zip 到 `/workspace` | 根目录必须有 `main.py` |
| 2 | `python3 main.py <requirements-source> --output-dir /workspace/template` | 只接受"通用脚手架 + 运行时生成"，**禁止把任务成品代码塞进包** |
| 3 | 后端 `npm install` + `PORT=3000 npm start` | 必须真的监听 3000；进程退出=该题 0 分 |
| 4 | 前端 `npm install` + `npm run build` | 构建失败=该题 0 分 |
| 5 | Playwright 跑该题用例（Stage-1 30 条；全量 200 条） | 页面必须能打开、控件名必须精确 |

关键事实（都是踩出来的）：

* **平台不给我们 spec**：日志里是 `[tests] no published specs mounted; building from the requirement text`
  —— 200 条用例的断言/选择器/种子值我们一条都看不到，只能靠需求原文里"引号内的名字"倒推。
* **平台只给一个总分** `test pass (x/200)`；stdout 在评测开始前就截断（最后一行通常是 `world seed finished`）。
  **（2026-10-03 更正）** 官方逐条报告**是存在的**：在 run/提交产物 zip 里的
  `template/.arc/playwright-report.json`（**在 `template/` 子目录下，不在 zip 根**）。
  早前"run 工作区里没有它（已核实三处）"这句**是错的** —— 当时只翻了 run 页 File 树与 stdout，
  没解开产物 zip；这条错误结论让 r79–r83 四轮都在盲修。详见 §14.6。
* run 页时间戳是 **UTC**，北京时间 = +8。
* 每题独立生成、独立评测；同一任务同时只能有一个 run。

---

## 3. 本地开发与验证（每天要用的命令）

依赖：Windows + PowerShell；本机有 Node 20+（`C:\Users\HW\.cache\codex-runtimes\...\node.exe`）
和一个可用的 Python（用 `py -3` 或 runtime 里的 `python.exe`，不要用 msys2 的 python：它的 socket 坏了）。

```powershell
# ① 所有本地断言（每个修复都必须"修复前失败/修复后通过"）
$py = "C:\Users\HW\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
foreach ($s in @("_scratch_r69.py","_scratch_r70_appuse.py","_scratch_r73_frontend_serving.py",
                 "_scratch_r73_collection_guard.py","_scratch_r75_use_sweep.py","_scratch_r77_router_guard.py",
                 "_scratch_r77_store_contract.py","_scratch_r78_appuse_pathonly.py","_scratch_r78_store_exports.py",
                 "_scratch_r79_entry_require.py","_scratch_r80_wildcard.py","_scratch_r80_store_param.py",
                 "_scratch_r81_store_stub.py","_scratch_r81_seed_log.py","_scratch_r83_p9.py",
                 "_scratch_r84_verify.py")) { & $py "arcbench/runs/$s" }

# ② 语法
& $py -m py_compile (Get-ChildItem "arcbench/agent" -Recurse -Filter *.py |
    Where-Object { $_.FullName -notmatch "node_modules|__pycache__" } | % { $_.FullName })

# ③ 打包（stage → zip，复制历史包结构：正斜杠 + 保留空目录项）
$stamp = Get-Date -Format "HHmmss"
$stage = "D:\gosim-demo-26\arcbench\runs\stage-rNN-$stamp"
New-Item -ItemType Directory -Path $stage -Force | Out-Null
robocopy "arcbench\agent" $stage /E /XD node_modules dist __pycache__ .venv .git .agents runs /XF *.pyc *.log /NFL /NDL /NJH /NJS /NP
& $py "arcbench/runs/_pack_agent_zip.py" $stage "arcbench\dist\arc-agent-rNN.zip"

# ④ 日志标记统计（改完日志重跑）
& $py "arcbench/runs/_log_stats.py"
```

**预检三项**：zip **119 项**、含 `main.py`、`.arc` 命中 **0**（用 `Add-Type System.IO.Compression.FileSystem`
读 `$zip.Entries` 即可核对）。

---

## 4. Agent 的运行流水线（`main.py` 视角）

1. 解析参数、定位输出目录、把需求树写进 traceability；
2. **铺脚手架**（`templates/scaffold`），逐模块让模型生成页面/路由/store；
3. 生成后的**守卫流水线**（这是本项目最厚的部分，全部在 `guard.py` / `verify.py`）：

| # | 函数 | 干什么 | 解决的故障（日志签名） |
|---|---|---|---|
| 1 | `fix_wildcard_routes` | `/:param/*` → `/*splat`；`'*'` → 安全正则 | Express5 `PathError: Missing parameter name` |
| 2 | `guard_app_use` | 把所有 `app.use(` 换成带类型过滤的 `__arcUse`（**全模块 + 所有注入之后再来一遍**） | `TypeError: argument handler must be a function`（r68/r70/r74） |
| 3 | `ensure_router_call_guard` | 运行期 shim patch `Route.prototype` / `Router.prototype` / `application.use`，丢掉非函数 handler、**保留路径参数** | 模块内 `router.post(path, undefined)`（r74 `pr.js:67`） |
| 4 | `guard_entry_requires` | 入口里除 app 之外的顶层 `require` + `seed()` 调用包 try/catch，失败回落 `__arcStubModule()` | 入口 require/调用期崩溃（r78 Stage-2、r79 Stage-1/3） |
| 5 | `ensure_frontend_serving` | 修正 SPA 静态资源路径：`sendFile(...)` 一律改指真实 dist + `express.static` + fallback | `ENOENT .../frontend/dist/index.html`（r69/r71/r82 各上百次） |
| 6 | `frontend_build`（`verify.py`）+ 最终闸门 | **所有写入型 pass 之后再 build 一次**，失败则 `complete_missing_exports` / `stub_unparseable_sources` 修复，最多两轮 | 平台构建失败：裸 `>` JSX、缺 named export（r78 Stage-1/3） |
| 7 | `backend_store_contract` + `complete_store_methods` | 静态检查"调用了但没导出的 store 方法"并补桩 | `store.X is not a function`（r38 起的老问题） |
| 8 | `ensure_store_method_stub` | 运行期兜底代理：集合类→`[]`、读→undefined、**谓词→false（fail closed）**、**写→报错+抛错**；播种器再回读校验 | r80 原题"契约报了也补了仍 is not a function" |
| 9 | `ensure_collection_never_empty` | `collection()` 不返回 null/undefined | `Object.values(undefined)` 500（r71） |
| 10 | `restore_keep_pages` + `ensure_named_exports` | 生成页面覆盖脚手架时按名恢复；补齐 named export | 控件名丢失（r70/r71）、`client is not exported` |
| 11 | `mount_orphan_routers` | 把没人 require 的 Express router 挂上去 | `no listing route` 类 |
| 12 | `ensure_startup_seed_world` + `ensure_signin_route` | 注入**世界播种器**与**种子登录路由**；带私有头 `x-arc-seed-token` 视为已登录；每个成功写请求后回读 | GIVEN 里的预置账号/组织/仓库缺失（P9） |
| 13 | `ensure_route_dump` | `listen` 之后 dump 全部已注册路由 `[arc-routes] …` | "路由到底挂没挂"不再靠猜 |

4. 启动演练（`verify.rehearse_startup`）：构建 + 起服务 + 探针（首页 200、seed 登录能过）；
5. 上报 traceability、生成报告、提交。

---

## 5. 故障模式图鉴（照着日志认故障）

| 日志签名 | 含义 | 修法 | 首次修复轮 |
|---|---|---|---|
| `argument handler must be a function`（`app.js:15/227`） | `app.use(<undefined>)` | 守卫 2 | r70 |
| 同签名但栈在 `pr.js:67`（`Route.<computed> [as post]`） | 模块内 `router.post(path, undefined)` | 守卫 3 | r77/r78 |
| `PathError: Missing parameter name at index N: .../:branch/*` | Express 4 通配符 | 守卫 1 | r80 |
| `ENOENT .../backend/frontend/dist/index.html`（几十~上百次） | SPA 路径拼错（少退一级） | 守卫 5 | r73；**r82 换了拼法复发，r83 用"任何 sendFile 都改指"根治** |
| 平台 `npm run build` 失败：`The character ">" is not valid inside a JSX element` | 生成页面 JSX 语法错 | 守卫 6（占位坏文件） | r79 |
| `"xxx" is not exported by "src/api/index.ts"` | 页面 import 了不存在的导出 | 守卫 6/10 | r79 |
| `TypeError: store.createWorksheet is not a function`（`seed.js`/`app.js`） | 声明了但没导出 / 调用方持有副本 | 守卫 7/8 | r78/r81 |
| `TypeError: repos.find is not a function` / `Cannot read properties of undefined` | store 形状不符（返回对象而非数组） | 守卫 8/9 | r78/r80 |
| `arc: seed() failed: ...` 然后 `Backend listening` | 应用自带的 seed 崩了，被守卫 4 接住（**服务器活着，但世界没建**） | 守卫 4 + 世界播种器 | r80 |
| `[arc-seed] POST /api/repos -> 401` | 播种器没有可用登录态 | 守卫 12（私有头旁路） | r83 |
| `[arc-seed] verify /api/repos -> 200 items=0 (the write did not persist)` | **写请求被"静默 no-op"吃掉**（store 缺写方法） | 守卫 8（写现在会抛错） | r84 |

**判读顺序**（每次拿到新日志先跑这四步）：

1. `grep -c "Backend listening"` —— 进程起来了吗？
2. `grep -c "\[arc-seed\]"` —— 播种器跑了吗？（0 = 没跑，H1）
3. `grep -c "ENOENT"` —— SPA 能打开吗？
4. `grep "verify .* items="` —— **写进去了吗？**（`items=0` 就是被吃掉）

---

## 6. 平台操作手册（浏览器自动化）

所有平台操作都在**本对话的 in-app browser**里做，用 `cua_repl`：

* **上传**：历史页（`/competitions/hackathon?tab=history`）→ `New submission` →
  `Drop your agent code here`（`waitForEvent("filechooser")` + `setFiles`）→ 填名字 →
  勾 `label.official-registration-confirm` → `Save submission`。
* **起跑**：`Run 5 remaining tasks`（或任务页 `Run latest submission`）→ 再读 `/running` 确认 5 active。
* **读日志**：run 页 → 点第 4 个 `button.doc-tab`（Stdout）→ 取 `Refresh logs` 之后的全文。

### 六个必知的坑（全部踩过）

1. **Run 按钮在保存后 3–5 分钟"假死"**：点了没反应。**等 5 分钟再点**，或直接看历史页该 snapshot 是否变成 running。
2. **点击报 `Timed out running CDP command Input.dispatchMouseEvent` 不代表没生效**；
   同时 `/running` 可能瞬时显示 0 active。**以历史页的 run 状态为准**。
3. **页面会"半加载"很久**（20–60 秒）：历史页要点/刷几次才出现 `New submission`；
   自动化脚本必须带重试循环，不能一次失败就判定"需要人工"。
4. **登录态会失效**：页面上只剩 `Confirm your team before entering / Sign in to continue` → 需要人工重新登录一次。
5. **run 页时间戳是 UTC**（+8 = 北京时间）。
6. **禁止删除操作**（`rm` / `Remove-Item` / `git reset` / `git checkout --`）；新目录带时间戳、新 zip 用新文件名。

---

## 7. 迭代方法论（比代码更值钱的部分）

1. **每个修复都要有日志证据**：先 grep 出签名与行号，再改代码，绝不"猜着修"。
2. **每个修复都要有本地探针，断言 before 失败 / after 通过**（`arcbench/runs/_scratch_r*.py`，
   全部用真实依赖：node + 真实 express 5.2.1 / 真实注入产物）。
3. **守卫要幂等**：注入的代码都带标记（`__arcUse` / `__arcGuarded` / `__arcStubModule` / `__arcStoreStub`），
   重复执行不会嵌套。
4. **不要删守卫**：早期崩溃（`is not a function`）就是 0 分；把崩溃换成"静默无操作"**也是 0 分**，
   但至少进程活着。正确方向是**让失败可见**（抛错、结构化日志、回读校验），而不是回退。
5. **先修"阻断"再修"功能"**：启动 → 页面 → 播种 → 控件名，前一层不通，后面全白干。
6. **最小探针优先**：任何"在容器里才会发生"的机制（verify 回读、CSS 选择器、构建闸门），
   先在本地搭一个"会撒谎的同型服务"验证，再花 ¥12 去平台试。
7. **保护榜单**：每轮上传前记录当前最佳；新包得 0 或低于最佳时，把保险包重新上传为最新提交（￥0）。

---

## 8. 当前状态与未决问题（2026-10-03 18:45 更新）

* **正在跑**：r85（snapshot #59，5 active，10:12 UTC 起跑）——
  原题 `81d2a40fd270` / Stage 1 `26c16d454887` / Stage 2 `a2f4e7514ea5` / Stage 3 `0425d1e015ee` / Sheet `a2a02c7ce23d`。
* **待发**：r86（`arcbench/dist/arc-agent-r86.zip`，119 项 / 434.3 KB / sha256 `B9F4EFD2…2E44`）——
  等 r85 归零、按判读结果决定是否上传。
* **榜单**：最新提交 = `arc-agent-r85`（跑分中）；**当前最佳 = 保险包** `arc-agent-r33.zip` =
  **9.65 / 13-of-200**（保险6 读数：原题 11.31 / 8.0%、**Stage 2 33.68 / 24.1%**、Sheet 6.75、
  Stage 1/3 为 0、0 token / ￥0）。**r85 若 ≤ 9.65，收尾前必须把 `arc-agent-r33.zip` 重传为最新提交并起跑**（￥0，锁榜）。
* **预算**：￥217.65（单轮生成型 ≈￥12；保险 ￥0）。
* **自测配额**：剩 2 次（每天北京 8:00 重置）—— 自测站是逐条结果的**第二**通道，第一通道见 §14.6（官方报告）。

### 8.1 包与运行版本的对应关系（重要，别记混）

| 包 | 打包时间 | sha256 | 内容 |
|---|---|---|---|
| `arc-agent-r85.zip` | 17:58 | `F8C90E66…DC1C` | **入口路由恢复**（不含页面恢复）。**这就是 10:12 UTC 上传、平台正在跑的那份**；复核确认该文件此后**没有被覆盖**（mtime 仍是 17:58、字节数 444234） |
| `arc-agent-r86.zip` | 18:29 → **18:37 重打** | `B9F4EFD2…2E44` → **`A445B351…A6F2`** | r85 + **页面恢复**（把入口渲染到的脚手架页面一起恢复）+ **守卫拒绝原因诊断** + 修掉 r85 里两个真 bug。**从未上传过**，上传时以 `A445B351…A6F2` 为准 |

> 复盘规则：给某一轮打分做记录时，**以平台实际跑的包为准**，不要拿 `dist/` 里的现状去反推。
> 上面的时间戳/sha256 就是为此保留的锚点。r86 在 `B9F4EFD2` 和 `A445B351` 之间重打过一次
> （加了拒绝诊断），因为**两者都没上传**，所以不产生歧义——规则只针对"平台跑过的那份"。

未决问题（按优先级）：

1. **入口被占位或被扁平化改写**（§14.6 已用官方报告锁定为 0/100 的直接原因）：
   r85 修入口路由表、r86 连"入口渲染到的页面"一起修。判读看 `entry route contract`、
   `restored pages the entry renders:`，以及**没改时的** `entry route contract (no change):`——
   最后这行会说明"已经是对的"还是"因为缺 11 个模块之一而拒绝恢复"。
2. **P9 世界播种**：应用自带 seed 常崩、我们的注入播种器常拿不到登录态 → 世界空 → 全 0。
   r83 的私有头 + r84 的回读校验是它的判据（`[arc-seed]` / `verify … items=`）。
3. **空世界下的运行时 500**：路由里 `collection().find()` / `undefined[user]` 之类读操作应降级而不是 500。
4. **Stage-1 REQ-2 的 13 个 accessible name**（`New team` / `Create team` / `Create organization` /
   `Add people or teams` / `Member menu <username>` / `Remove from organization` / `Account not found` /
   `Account is already a member` / `Cyclic team hierarchy is not allowed` / `Access denied` /
   `Remove bob-reviewer` / `Sign up`）。
5. Sheet 覆盖 54–58/70，透视表工作流未在平台验证。

---

## 9. 交接清单（接手后第一小时按顺序做）

1. 跑第 3 节的 ① ② 两步，确认 16/16 探针 + `py_compile` 通过（环境是否完好）。
2. 打开 https://arc-bench.com/running 确认没有 active run（有就等）；
   打开历史页确认"最新提交"是不是保险包。
3. 读第 8 节的 r84 包 sha256，与 `arcbench/dist/arc-agent-r84.zip` 核对（确认没被覆盖）。
4. 等 r83 归零 → 按第 5 节"判读顺序"四步读它的五份 stdout。
5. 上传 r84 → 起跑五题 → 出分后看 **`verify ... items=N`**：
   * `items=0` 大量出现 → A（写被吃掉）确认为主因，生成型短期难翻盘，**锁保险收尾**；
   * `items>0` → 世界真的写进去了，问题在 UI/业务层（REQ-2 名字、页面结构），值得再打 r85。
6. 任何分支结束前：**把 `arc-agent-r33.zip` 重新上传为最新提交并起跑**，锁住 9.65。

---

## 10. 文件地图（想深入看哪份）

| 想看什么 | 看哪份 |
|---|---|
| 完整时间线（每轮干了什么、分数、run-id、证据） | `arcbench/notes/milestone-r68.md`（77 KB，最全） |
| 按轮次组织的叙事版交接稿（逐轮成绩表 + 根因→修复→commit + "最重要的教训"） | `arcbench/notes/HANDOVER-2026-10-03.md` |
| 逐轮运行记录 | `arcbench/notes/run-log-2026-10-01.md`（74 KB） |
| 未解决问题清单（含代码片段） | `arcbench/notes/open-issues-2026-10-02.md` / `.txt` |
| 日志总索引 + 51~56 份日志的标记统计 | `arcbench/notes/logs-index-2026-10-03.md`、`_log-stats.md` |
| 单页现状快照 | `arcbench/notes/status-2026-10-03.md` |
| 平台规则与凭据 | `arcbench/notes/platform-rules-2026-09-30.md`、`platform-credentials.md` |
| 之前一版交接 | `arcbench/notes/handoff-2026-10-01.md`、`checklist-r70-packaging.md` |
| 探针源码 | `arcbench/runs/_scratch_r*.py`（16 个，每个都写明"证据 → 断言"） |
| 平台日志原文 | `arcbench/downloads/logs/rNN日志/` |
| 包 | `arcbench/dist/arc-agent-rNN.zip` |

> 最后一条建议：**这份文档本身就是一次"让失败可见"的实践** —— 每一行结论后面都有日志证据或探针。
> 接手后请保持这个习惯：先拿证据，再改代码，改完补探针。

---

## 11. 无人值守是怎么跑起来的（自动化与通知策略）

这次迭代不是人盯着跑的，而是**一个约 10 分钟一拍的心跳自动化**在推进（Codex 桌面端的 automations）。
如果你接手后不打算继续无人值守，**第一件事是把它停掉**，否则它会继续按下面的循环上传新包、覆盖榜单。

| 项 | 值 |
|---|---|
| 自动化 id | `arcbench-r35` |
| 节奏 | 约每 10 分钟一拍；只在**平台空闲（`/running` 归零）**时才推进一轮 |
| 操作边界 | 上传/起跑/读日志**只在这一个对话里做**；同一任务同时只允许一个 run |
| 预算 | 起于 ¥345；生成型一轮实测约 ¥12（早期估的 ¥4–5 偏低）；**低于 ¥40 立即停手并通知** |
| 停机方式 | 用自动化工具把 `arcbench-r35` 暂停或删除；只想降噪就改成"仅失败时通知" |

**每拍固定八步**（照抄即可复现整套流程）：

1. 读 `/running`：**非 0 就停手**，什么都不做；
2. 读历史页最新提交的五项（GitHub 原题 / Stage 1 / 2 / 3 / Sheet 的 Score、Tests、耗时、成本）写进 run-log；
3. 抓最新 run 的 Stdout（run 页第 4 个 `button.doc-tab`）→ 落盘 `arcbench/runs/_rNN_<task>_stdout.txt` → grep 关键标记；
4. 对照 `open-issues-2026-10-02.txt` 逐条改 `arcbench/agent/**`。**每条修复四件套**：日志证据 → 幂等 guard 函数 →
   探针（修复前失败 / 修复后通过）→ `py_compile`；
5. 打包：`arcbench/runs/stage-rNN-<HHMMSS>/` → `robocopy agent $stage /E /XD node_modules dist __pycache__ .venv .git .agents runs` →
   `arcbench/dist/arc-agent-rNN.zip`（**119 项**，含 `main.py` + `arcbench_agent_runtime` + `templates/sheet`，**不含 `.arc`**）；
6. 上传：历史页 `New submission` → filechooser（`#zip`）→ 名字 `arc-agent-rNN` → 勾 `label.official-registration-confirm` → `Save submission`；
7. 起跑：`Run 5 remaining tasks` → 再读 `/running` 确认 5 active 并记录 run-id；
8. 追加 `arcbench/notes/run-log-2026-10-01.md` 与 `milestone-r68.md`，然后 `git add` + `git commit`。

**通知策略**（默认静默，只在下列五件事上开口）：

1. 首次出现**非 0 分**或分数**超过历史最佳**；
2. **需要人工介入**：登录失效、按钮点不动、run 卡死 >60 分钟、上传失败、绕不开的审批；
3. **自测站给出逐条结果**（这是唯一能拿到 per-case pass/fail 的通道）；
4. **连续 3 轮产不出新修复**；
5. **预算 <¥40**。

其余情况（5 个 run 正在跑、等待归零、页面半加载、CDP 超时）一律 `DONT_NOTIFY` —— 否则通知会被"正在跑"淹没。

**三条铁律**（违反任一条都会直接烧掉榜单或预算）：

1. **禁止任何删除操作**（`rm` / `Remove-Item` / `git reset` / `git checkout --`）；新目录带时间戳，新 zip 用新文件名；
2. **`Running ≠ 0` 时绝不上传**；
3. **每轮上传前先记下"当前最佳包与分数"**；新提交跑完若得分为 0 或低于最佳，立刻把保险包**重传为最新提交并起跑**
   （排行榜只认最后一次保存的提交；重传属于零删除操作，合规）。

---

## 12. 决策记录（做过什么、否决了什么、为什么）

这一栏是给接手的人省时间的：下面每一条都曾经是一次真实的岔路口，理由比结论重要。

| 议题 | 结论 | 理由 |
|---|---|---|
| 给 GX-Sheet 的 `web/app.py` 加 `/__arc_seed__/login` | **不做** | GX-Sheet 是另一个产品（Python + xlsx），与 ARC-Bench 榜单零关系；冲刺期不该在无关仓库写代码 + 单测。仅记一条备注：它的 `ServiceBus` 是每请求新建实例，单线程 HTTPServer 下无风险，换多线程要加文件锁 |
| 前端 boot 时自动 seed-login | **不做** | REQ-1-1-1 / REQ-1-1-2 / REQ-1-2 的 GIVEN 全是"全新未登录会话"，自动登录会**确定丢分**。种子登录是服务端 `seed.js` 的职责，浏览器侧必须保持干净访客态 |
| 删掉 store 兜底代理（"它就是 0 分元凶"） | **不删** | 删了会退回 `is not a function` 的**崩溃式 0 分**；现在至少是"静默 0 分"。方向不是撤守卫，而是**让失败可见**（r84：缺失写方法抛错 + 播种后回读 `verify … items=N`） |
| 让 `api/**` 的占位导出把构建直接搞失败 | **不做** | 构建失败 = **保证 0 分**（会把其他页面一起赔进去）。折中：占位函数自我声明 `arc-api: 'X' is a placeholder …`，构建仍通过但问题可见 |
| 整段吸收外部给的 GX-Sheet Python 审计代码 | **不吸收** | 那份分析针对 `web/app.py` / `ServiceBus(LocalXlsxStorage(...))` / `X-GX-Actor`，与我们的 Node/Express + Vite/React 不是同一个代码库。但三条诊断思路逐条对照后：**每请求新建实例**（我们是 Node 模块级单例，无此问题）、**专用播种登录路由**（= 我们的 P9-H1，保留）、**空世界读操作兜底**（= 我们的 C 方案，保留） |
| 继续叠新守卫 vs 先读 `.arc/playwright-report.json` | **先读报告（已纠正）** | 原文写"该文件不存在（查过 r82 stage-2 / r78 原题 / r73 sheet 三处）"，**这条结论是错的**。2026-10-03 17:5x 复核：`arcbench/downloads/runs/r72-project/556ca66978e3-template.zip` 内的 `template/.arc/playwright-report.json`（94 KB）就是官方 Playwright JSON 报告，`stats.expected=0 / unexpected=29`，逐条 spec 名、状态、报错、耗时齐全。之前"查过三处"是**找错了位置**——它在 `template/` 子目录下，不在 zip 根。**这是唯一一份逐条判据，动手改代码前必须先读它和同批的另外三份。** |
| 收尾时把生成型留在"最新提交"位置 | **不保留** | 排行榜只看最后一次保存的提交。收尾前必须把 `arc-agent-r33.zip` 重传为最新提交并起跑，锁住 9.65（￥0 / 约 20 分钟） |

---

## 13. 命名与目录约定（避免接手后踩到自己的脚）

| 约定 | 形式 | 说明 |
|---|---|---|
| 轮次 | `rNN` | 一次"改码 → 打包 → 上传 → 起跑 → 记录"= 一轮，单调递增，**永不复用** |
| 打包中间目录 | `arcbench/runs/stage-rNN-<HHMMSS>/` | 带时间戳；`robocopy … /XD node_modules dist __pycache__ .venv .git .agents runs` |
| 提交包 | `arcbench/dist/arc-agent-rNN.zip` | **永远用新文件名**，不覆盖旧包（保险包 `arc-agent-r33.zip` 必须一直在） |
| 探针 | `arcbench/runs/_scratch_rNN_<主题>.py` | 每个修复对应一个，必须"修复前失败 / 修复后通过" |
| 平台日志 | `arcbench/runs/_rNN_<task>_stdout.txt`、`arcbench/downloads/logs/rNN日志/` | 原样落盘，不要改写 |
| 笔记结构 | "证据（文件:行）→ 结论 → 修法 → 验证" | 沿用即可，别只写结论 |
| 分支 | `codex/dev` | 提交物与笔记都在这个分支；`main` 是初赛冻结基线 |

**版本库边界（重要）**：`arcbench/runs/` 与全局 `dist/` 规则原本把探针和包全挡在 git 之外，
新克隆会**既没有探针也没有保险包**，等于这份文档的一半内容无法执行。现已显式纳入：

* `arcbench/runs/_scratch_r*.py`（探针）、`_pack_agent_zip.py`（打包器）、`_log_stats.py`（日志统计）；
* `arcbench/dist/arc-agent-r33.zip`（保险包 —— 唯一有分的那份产物）。

其余中间产物（`stage-*`、`_rNN_*_stdout.txt`、历史 zip、下载的日志）仍然不入库。
新增探针若没被自动跟踪，用 `git add -f` 显式加进来。

## 14. r85（2026-10-03 17:5x，接手后第一轮）

**先纠正一条会误导后人的结论**：§12 原先写"`.arc/playwright-report.json` 不存在"。它存在，
位置是 `arcbench/downloads/runs/r72-project/<runid>-template.zip` **内部的 `template/.arc/`**。
该报告是官方 Playwright 的 JSON 输出，含逐条 spec 名、状态、报错、耗时，是本项目**唯一**
的逐条判据。把它当作"平台不给逐条结果"的依据会直接导致把力气花错地方（r79–r83 就是）。

### 14.1 r72 Stage-2 报告给出的真实失败分布

```
stats: {expected: 0, unexpected: 29, flaky: 0, skipped: 0, duration: 206025}
```

| 次数 | 报错 |
|---|---|
| **17** | `Test timeout of 10000ms exceeded` — `waiting for getByRole('searchbox', {name:'Search', exact:true})` |
| **9** | `Could not find a visible navigation target named "acme-docs"` |
| 2 | `… named "branch-switch-demo"` |
| 1 | `… named "Document search flow"` |

同批四份 zip 里只有这一份带报告；另外三份（Stage-1 / 原题 / Stage-3）**没有报告**，
说明它们的评测根本没跑到测试阶段。

### 14.2 这三类失败都指向同一处：入口路由表

`template/.arc/playwright-report.json` 对应项目的 `frontend/src/App.tsx` 是 `ensure_app_router`
重写出来的**扁平 kebab 表**（`/repo`、`/repo-search`、`/new-repository`、`/org`、`/team`），
**没有任何参数化路由**；而它替换掉的脚手架入口路由的是
`/:owner/:name`、`/:owner/:name/search`、`/orgs/:name`、`/orgs/:name/teams/:team`。

* 仓库页面永远打不开 → 12 条 "Could not find a visible navigation target"；
* `/` 指向模型自己生成的 `Home`（无 searchbox），脚手架 `HomePage`（有 `aria-label="Search"`）
  被同一路径上后注册的 `<Route path="/home">` 遮蔽 → 17 条 searchbox 超时。

关键点：**这套扁平表能构建、能启动、能服务**，所以"是否起来"的探针全绿，而测试 0/29。
这正是 r78 原题"构建 ✓ + `Backend listening` ✓ + `world seed finished` ✓ 却只有 1.59"的原因；
也说明 **P9（世界播种）不是 0 分的充分解释**。

### 14.3 r85 的两处改动（都带探针）

| # | 改动 | 解决的证据 | 探针 |
|---|---|---|---|
| C2 | `verify.startup_diagnosis()` + 接到 `rehearse_startup` 两处失败分支 | r83 五题 `backend npm start exited early (rc=1):` **冒号后是空的**，`npm` 在该容器不产出任何输出 → 整轮无法诊断 | `_scratch_r85_startup_diag.py`（语法错 / 运行期抛错 / 健康服务不误报 / 包装式 start 脚本 / 无入口 五种形态） |
| C3 | `guard.restore_entry_route_contract()` + 在 `main.py` 最后一个入口写入者之后调用 | r72 报告：入口丢参数化路由 → 29/29 全败 | `_scratch_r85_route_contract.py`（扁平表修复 / 正确表不动 / 缺页面则拒绝 / 幂等） |

C3 的安全边界：只在**脚手架入口 import 的模块在真实工程里全部存在**时才恢复；
缺任何一个就放弃（恢复成构建失败 = 保证 0 分，比路由错更糟）。

### 14.4 包与门禁

* `arcbench/dist/arc-agent-r85.zip`，**119 项 / 433.8 KB / sha256 `F8C90E66…DC1C`**；
* 本地门禁：`_scratch_*.py` 共 32 个，**30 通过 / 2 预存在失败**
  （`_scratch_r70_world_e2e.py`、`_scratch_r74_menu.py`；已在 pristine HEAD 上复核，
  两者同样失败，与 r85 改动无关——后者对应 r74"菜单注入停用"的决策）；`py_compile` rc=0；
* 跑探针要先把 node 放到 PATH：
  `C:\Users\HW\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`。

### 14.5 下一步（按顺序）

1. 等保险 `arc-agent-r33-insurance6` 归零；确认榜单回到 9.65；
2. 上传 r85 → 起跑五题。**判读顺序更新为**：
   `grep -c "Backend listening"` → `grep "entry route contract"` → `grep -c "\[arc-seed\]"` →
   `grep -c ENOENT` → `grep "verify .* items="`；
   若再出现 `npm start exited early`，**这次冒号后面应该有 `node` 给出的真实原因**；
3. 出分后**无论结果**，收尾前把 `arc-agent-r33.zip` 重传为最新提交并起跑（￥0，锁 9.65）。

---

### 14.6 第二份官方报告（100 条，2026-10-03 18:3x 挖出）——0/100 的直接原因已锁定

`arcbench/downloads/agent-packages/a128c4309297-template.zip` 里也有一份
`template/.arc/playwright-report.json`，这是**整题**（"GitHub Collaboration Platform Core
Requirements"，REQ-1…REQ-6 全覆盖）：

```
stats: {expected: 0, unexpected: 100, flaky: 0, skipped: 0, duration: 844122}
statuses: timedOut 73 / failed 27
```

失败指纹：**73 条整条 10s 超时**，加 27 条
`Could not find a visible navigation target named "…"`（`acme-docs` ×9、`Improve onboarding` ×3、
`Pull requests` ×3、`Overview onboarding PR` ×3、`Acme Demo` ×2、`branch-switch-demo` ×2、
`Issues` ×2，其余各 1），另有 1 条测试自身的 `ReferenceError: uniqueAccount is not defined`。

**直接原因：那份工程的 `frontend/src/App.tsx` 只有 286 字节，是 `stub_unparseable_sources`
写的占位组件。**

```tsx
// Placeholder written by the ARC agent: this file could not be
// parsed by the bundler, and one unparseable file fails the whole
// build. A visible heading keeps it reachable and resolvable.
export default function App() {
  return <section><h1>App</h1></section>;
}
export { App };
```

同一份工程里 `frontend/src/pages/` 下有 **25 个生成页面**（含 `HomePage.tsx`、`RepoPage.tsx`、
`RepoSearchPage.tsx`…），**一个都挂不上**——入口被替换成只渲染 `<h1>App</h1>` 的占位。
于是每条用例的第一个 `getByRole` 都找不到东西，全部 10s 超时；27 条走的是另一条断言路径，
直接报"找不到可见导航目标"。

**这正是 r85/r86 的 C3 要处理的形态，而且已用这份真实工程做过验证：**

| 检查 | 结果 |
|---|---|
| 占位入口里含 5 条要求路由中的几条 | **0/5** |
| 脚手架入口 import 的模块在**该真实工程**里是否齐全 | **11/11 全部存在** |
| → `restore_entry_route_contract` 是否会触发 | **会** |

但**只恢复入口还不够**：该工程的 `pages/HomePage.tsx` 是它自己生成的 1,508 字节版本（无 searchbox），
会遮蔽脚手架的同名文件 → 17 条 searchbox 用例照样超时。所以 r86 把
**入口 + 它渲染的脚手架页面**一起恢复，并加进探针第 5 个场景（用这份真实工程的形态：
生成的 `HomePage.tsx` 遮蔽脚手架版，断言恢复后 `aria-label="Search"` 回来）。

判读新增一行：`restored pages the entry renders:`。

### 14.7 包一览（当前）

| 包 | 状态 | 说明 |
|---|---|---|
| `arc-agent-r33.zip` | **保险，榜单基线** | 9.65 / 13-of-200（保险6 读数：原题 11.31 / 8.0%、**Stage 2 33.68 / 24.1%**、Sheet 6.75、Stage 1/3 为 0） |
| `arc-agent-r85.zip` | **已上传并起跑**（History 59） | 119 项 / sha256 `F8C90E66…DC1C`；两个新探针版本 = 入口恢复（不含页面恢复） |
| `arc-agent-r86.zip` | **待发** | 119 项 / 434.9 KB / sha256 **`A445B351…A6F2`**（18:37 重打，含拒绝诊断）；= r85 + 页面恢复 + 守卫拒绝原因诊断 |

**Stage 2 = 33.68 这条要记住**：同一套 spec 下保险包能拿 24.1%，说明 runner 与 spec 都是好的，
分差 100% 来自被测应用。所以 r85/r86 的判据收窄为：**任一任务 > 0 = 方向成立**。

### 14.8 判读工具

`arcbench/runs/_report_digest.py <playwright-report.json> [...]`
把官方报告压成"统计 + 状态分布 + 错误指纹 + 逐条失败"。

### 14.9 官方起步包（2026-10-03 18:5x 挖出）——把 P9 的真实机制纠正了

`C:\Users\HW\Downloads\agent-based\` 是官方参考实现：`agent-octos-based` = octos-org/arc-adapter
（`main.py` + 完整 web 模板 + 38 轮踩坑提示词），另三个（blank / codex / claude-code）是同一
runtime 的薄壳。**契约与教训可用，代码不必换。**

**官方契约（README §适配包契约）**：`frontend/` + `backend/` 缺一报 `template is incomplete`；
端口默认 3000、生成期碰 3000 会被 SIGTERM（冒烟用别的口）；日志 stdout+stderr 双写；
持久化 = **纯 JS 的 JSON 文件，启动读入、每次 mutation 写回，并在为空时播种**
（明确禁用 sqlite3/bcrypt 等原生模块）。我们 `prompts.py:306` 已经写着同一套。

**纠正 1：不是"没持久化"。** 实测两份生成产物的 store **本来就会落盘**：
r72 的 `store.js` 有 `DATA_FILE = __dirname/data.json` + `load()/save()`，文件不存在时
`seed()+save()`；a128 同样。而且 `data.json` **不在交付包里**（查过）→ 世界是启动时现建的。

**纠正 2：真正的机制是"脚手架 seed 跑了，但打在被改写的 store 上，大部分没落下去"。**
a128 实测（`arcbench/runs/_scratch_r87_world_shape.py`）：

```
seed.js  与脚手架 templates/scaffold/backend/src/seed.js 逐字节相同（C3F611EB8763294F）
gh_store.js 也与脚手架逐字节相同
data.json 落盘结果：users=6 repos=1{branches,commits,pull_requests 各 1} accounts=35 sessions=1
```

| 测试要的名字 | 在 seed.js | 在 data.json | 结论 |
|---|---|---|---|
| `acme-docs` | ✅ | ✅ | 落下来了 |
| `Acme Demo` / `acme-demo` | ✅ | ❌ | **seed 跑到一半就断了** |
| `frontend-team` / `secret-research` / `Legacy welcome text` / `Document search flow` | ✅ | ❌ | 同上 |
| `Improve onboarding` / `src/search.ts` / `bob-reviewer` | ✅ | ✅ | 落下来了 |

即：**世界数据本来就在我们手里**（脚手架 seed.js 就是官方 TASK-011 的世界，第一行注释写着
`account alice-dev / organization Acme Demo (acme-demo) / repository acme-docs / member bob-reviewer
/ team frontend-team / branch release …`），但它被拿去喂一个**被模型改写过形状的 store**，
写一半就停。这解释了 r72 报告里失败次数的分布：`acme-docs` ×9（缺失）、
`Acme Demo` ×2、`branch-switch-demo` ×2（连 seed 里都没有）。

**这同时解释了 r83 的 `sign-in store not seeded: ['backend/src/auth.js: unsupported password hashing']`
以及 `sync-state: users=6`**：不是"种子没注入"，是**注入的种子写进了一个半兼容的 store**。

**r87 的方向（据此收窄）**：不要再靠 HTTP 重放 + 鉴权去建世界（那是我们烧了 5 轮的路）。
要么把**合同世界直接写进 app 的持久化状态**，要么让生成的 store 真正实现脚手架 seed 依赖的那组
方法（`findUserByUsername` / `createUser` / `findOrg` / `membership` / `state.orgs.push` …）。
后者的判据是**写后回读**：`data.json` 里必须出现 `Acme Demo`、`frontend-team`、`secret-research`。

> 本次未完成：本地把生成的 app 跑起来做 HTTP 级验证。本机无 `npm`，硬拷单层 `node_modules`
> 会因 pnpm 的 `.pnpm/` 链接而 `MODULE_NOT_FOUND`（实验已记录）。**要真验证 r87，需要在能
> `npm install` 的环境里跑**——这正是交给 codex 的那件事。

### 14.10 r85 出分（2026-10-03 19:1x）：全 0，但拿到了三件硬事实

| task | listen | contract | pages | buildclean | seed | ENOENT | rehearseFAIL |
|---|---|---|---|---|---|---|---|
| github | 1 | 2 | 0 | 2 | **172** | 0 | 16 |
| stage1 | 1 | 2 | 0 | 2 | **219** | 0 | 2 |
| stage2 | **0** | 2 | 0 | 2 | 0 | 0 | 16 |
| stage3 | 1 | 2 | 0 | 2 | **115** | 0 | 0 |
| sheet | 1 | 2 | 0 | 2 | 0 | 0 | 8 |

1. **守卫在平台上真的触发了，而且没伤构建**：五题全命中
   `[arc-agent] entry route contract: ['frontend/src/App.tsx: restored the scaffold route contract
   (the generated entry had lost 5/5 parameterised route(s) …)']`，同时 `final frontend build: clean` ×2。
   最担心的"恢复把构建搞坏"没有发生。`pages=0` 符合预期（r85 不做页面恢复，那是 r86 的）。
2. **播种器第一次真的跑起来了**（`[arc-seed]` 从 r83 的五题全 0 → 172/219/115 行），
   **然后死在 store 形状上**：
   ```
   [arc-seed] POST /auth/sign-up -> 500 | TypeError: accounts.some is not a function
   ```
   已定位到源码（真实工程 `a128c4309297`）：
   `auth.js:35` 拿 `store.collection('accounts', {})`（**字典**）→ `accounts.some(...)`（**当数组用**）；
   `issues.js:13-14` 又当**嵌套数组**用（`accounts.users.find`）；
   而 `gh_store.js` 用的是**顶层数组**（`state.users.find/.push`）。
   一个集合三种形状 → **第一笔写入就抛错，世界建到一半停住** → 这正好解释 r72 的
   `data.json` 里有 `acme-docs` 却没有 `frontend-team`/`secret-research`/`Acme Demo`。
   **H1/H2（鉴权假设）彻底作废**：不是鉴权，是形状。
3. **r85 新加的诊断被日志吞了**：`main.py` 只打 `error.splitlines()[0]`，而 `node` 的栈在第 2 行之后。

### 14.11 r86 最终内容（四件事一起上）

> 结论：**r86 单独发车不够**——页面恢复能消掉那 17 条 searchbox 超时，但
> `accounts.some` 会让世界依然建不起来。所以四件一起带：

| # | 内容 | 证据 | 探针 |
|---|---|---|---|
| 1 | **页面恢复**（入口 + 它渲染的脚手架页面） | r72 报告 17 条 searchbox | `_scratch_r85_route_contract.py` 场景 5/6 |
| 2 | **集合形状兜底** `ensure_collection_shape` | r85 `accounts.some is not a function` | `_scratch_r87_collection_shape.py` |
| 3 | **rehearsal 完整诊断打进日志** | r85 冒号后为空 | 同上（日志行） |
| 4 | **入口路由契约恢复 + 拒绝诊断** | r85 已证实在平台触发 | `_scratch_r85_route_contract.py` |

包：`arcbench/dist/arc-agent-r86.zip`，**119 项 / 436.8 KB /
sha256 `082D3787E5BC866FB72CD0011BC7EC809462F418F63DA0DE5239CDC5468D1FF7`**（从未上传）。
门禁 **33/35 探针 + `py_compile` rc=0**（两个失败仍是预存在的）。

**判读新增两行**：`collection shape guard:` 与 `[rehearsal]   <node 的栈>`。

### 14.12 自测通道 0/30 的真相（2026-10-03 19:2x，截图证实）——P1 的结论是错的

`open-issues-2026-10-02.txt` 的 **P1** 写的是"自测 0/30 = 容器里应用起不来 / 环境差异未定性"。
**这条是错的**，而且误导很久：我们因此以为自测站不可信，一直不敢用那点配额。

自测第 1 次（`d07e0b4d`，包 = `selftest-r71-ghstage1-served.zip`）证据链：

| 观察 | 说明 |
|---|---|
| 0/30，报错统一 `Test timeout of 60000ms exceeded` | **测试体跑起来了**、浏览器是活的、页面上下文存在。若容器没起来，会是 `net::ERR_CONNECTION_REFUSED` 或导航级 `page.goto: Timeout 30000ms` |
| 失败截图 `notes/evidence/selftest-run1-d07e0b4d-fail.png`（实为 JPEG，看之前先改名） | 页面**渲染出来了**，内容只有一个词：**`App`** |
| 该包源码 `frontend/src/App.tsx` | **286 字节**，正是 `stub_unparseable_sources` 的占位 `<section><h1>App</h1></section>` |
| 构建产物 | `HomePage`=0、`Sign up`=0、`sign-in`=0 |

**结论：通道完全是好的；它复现的正是我们已经知道的那个 bug——入口被占位替换。**
登录表单、`Create an account`、账号菜单全都不存在，所以每条用例都在等一个永不出现的元素。

**连带纠正**：a128 工程（官方报告 0/100）的 `App.tsx` 也正是这 286 字节。
**自测站、官方报告、我们的 guard 分析，三条线指向同一个机制。**

**用法**：自测通道是**免费、快速、忠实**的判据，剩余配额该花在这里，而不是等 40 分钟的平台 run。
但它**跳过 agent**，只能验证"修复后的**产物**"，不能验证 `guard.py` 本身（见 §14.9）。

**B 组验证（自测第 2 次 `94b0b227`）**：同一份产物先跑 `restore_entry_route_contract`
（5/5 路由 + 11 个页面，`App.tsx` **286 → 5,572 字节**）再构建（`node node_modules/vite/bin/vite.js build`，
111 modules / 398 kB），已上传待结果。
- B 的页面不再是 `App`、失败从"整条超时"变成具体断言 → **r86 的恢复机制被独立验证**；
- 仍渲染 `App` → 恢复在真实产物上没生效，回头看判定条件。

> 注：入库的保险包 `arc-agent-r33.zip` 是**早期约定的包**（142 项，内含预置成品应用），
> 与现在"通用脚手架 + 运行时生成"这条线的 119 项包不是同一种东西 ——
> 它是**兜底的成品**，不是打包模板；不要照它改打包器，也不要试图"修好"它。
