# 18 · P1 本地 ARC-Bench 验收闭环实施计划

> **For agentic workers:** 执行本计划时使用 `superpowers:executing-plans`
> （本会话内分批执行）或 `superpowers:subagent-driven-development`
> （每任务一个子代理）。步骤用 `- [ ]` 跟踪；`git push` 由用户手动执行。

**Goal:** 在本地复刻「需求包 → 可运行 Web 应用 → Playwright 验收」闭环，并用官方
runner 验证环境可用，为 P2 的最小可提交 Agent 打底。

**Architecture:** 新建与 `src/gx` 隔离的 `arcbench/` 工作区：`upstream/` 放官方
runner、`data/` 放抓取/下载的任务包、`notes/` 放结果存档。现有 GX-Sheet 代码不动。

**Tech Stack:** Node.js + `@playwright/test`（官方 runner 自带）、curl/PowerShell
（数据抓取）、可选 Docker（官方参考实现跑分）。

**Spec:** [17-ARC-Bench方向校准与推进路线.md](17-ARC-Bench方向校准与推进路线.md) §5-P1。

## Global Constraints

- 执行分支固定为 `codex/arc-harness`；`main` 保持冻结，本计划任何提交不得触碰
  `src/`、`agent/`、`web/`、`demo/`、`tests/` 与 `demo/output/trace.jsonl`。
- 第三方下载产物（`arcbench/upstream/`、`arcbench/data/`、`node_modules/`、
  `docker-output/`、`playwright-report/`、`test-results/`）一律 gitignore，不入库。
- 只提交我们自己的脚本、配置与结果笔记（`arcbench/notes/`）。
- 网络下载需联网权限；失败时先重试，仍失败再记录到 `arcbench/notes/blockers.md`。
- 本计划只验证闭环，不实现官方 GitHub/Sheet 产品，不接模型网关（那是 P2）。

## 文件结构

| 路径 | 责任 | 动作 |
| --- | --- | --- |
| `arcbench/upstream/` | 官方 arc-bench runner | 克隆（gitignore） |
| `arcbench/data/` | 官方任务包/需求 JSON/测试样本 | 抓取（gitignore） |
| `arcbench/notes/` | 命令记录、结果存档、阻塞清单 | 新增/提交 |
| `.gitignore` | 排除第三方产物 | Modify |

## Task 0: 工作区与忽略规则

**Files:**
- Modify: `.gitignore`
- Create: `arcbench/notes/README.md`

- [ ] **Step 1: 在 `.gitignore` 末尾追加忽略块**

```gitignore
# ARC-Bench P1 工作区（第三方产物不入库）
/arcbench/upstream/
/arcbench/data/
/arcbench/**/node_modules/
/arcbench/**/docker-output/
/arcbench/**/playwright-report/
/arcbench/**/test-results/
```

- [ ] **Step 2: 创建 `arcbench/notes/README.md`**

```markdown
# P1 结果与阻塞记录

记录每次 runner 运行的命令、退出码、通过/失败数与耗时；阻塞问题另记 `blockers.md`。
```

- [ ] **Step 3: 验证**

Run: `rg -n "arcbench" .gitignore`
Expected: 出现 5 条 `/arcbench/` 忽略项。

- [ ] **Step 4: 提交**

```bash
git add .gitignore arcbench/notes/README.md
git commit -m "chore(arc): P1 工作区与忽略规则"
```

## Task 1: 归档官方任务数据

**Files:**
- Create: `arcbench/data/requirements/ticketbooking.json`
- Create: `arcbench/data/requirements/github.json`
- Create: `arcbench/data/requirements/sheet.json`
- Create: `arcbench/notes/task-inventory.md`

- [ ] **Step 1: 抓取三个官方需求 JSON（Task Bank）**

```powershell
$base = "http://arc-bench.com/api/requirements"
curl.exe -s "$base/ticketbooking?catalog=playground" -o arcbench/data/requirements/ticketbooking.json
curl.exe -s "$base/github?catalog=playground" -o arcbench/data/requirements/github.json
curl.exe -s "$base/sheet?catalog=playground" -o arcbench/data/requirements/sheet.json
```

- [ ] **Step 2: 核对 JSON 字段**

Run: `powershell -Command "(Get-Content arcbench/data/requirements/ticketbooking.json -Raw | ConvertFrom-Json).PSObject.Properties.Name"`
Expected: 含 `requirements_yaml`、`requirements_markdown`、`test_runner`、`total_tests`。

- [ ] **Step 3: 归档 keep 任务包（已下载样例）**

把已下载的 `keep-task.zip` 解包到 `arcbench/data/keep/`；若缺失则：

```powershell
curl.exe -L -o arcbench/data/keep-task.zip http://arc-bench.com/api/benchmarks/tasks/keep/download
tar -xf arcbench/data/keep-task.zip -C arcbench/data
```

- [ ] **Step 4: 写任务清单**

在 `arcbench/notes/task-inventory.md` 记录：ticketbooking 6 req / 30 tests、
github 47 req / 0 tests、sheet 24 req / 0 tests、keep 32 req / 32 tests，
并附任务页 URL 与抓取日期 2026-09-08。

- [ ] **Step 5: 提交**

```bash
git add arcbench/notes/task-inventory.md
git commit -m "docs(arc): P1 官方任务数据清单"
```

## Task 2: 安装官方 runner

**Files:**
- Create: `arcbench/upstream/`（clone，gitignore）
- Create: `arcbench/notes/runner-setup.md`

- [ ] **Step 1: 克隆官方仓库**

```powershell
git clone --depth 1 https://github.com/code-philia/arc-bench.git arcbench/upstream
```

- [ ] **Step 2: 安装依赖与浏览器**

```powershell
cd arcbench/upstream
npm install
npm run test:install
```

- [ ] **Step 3: 验证 runner 可用**

Run: `npx playwright --version`
Expected: 输出版本号（如 `Version 1.x.y`）。

- [ ] **Step 4: 记录安装命令到 notes**

在 `arcbench/notes/runner-setup.md` 记录 Node/npm 版本、clone 提交、安装耗时。

- [ ] **Step 5: 提交**

```bash
git add arcbench/notes/runner-setup.md
git commit -m "docs(arc): P1 runner 安装记录"
```

## Task 3: 用 keep 参考实现验证闭环（Track A，立即执行）

**Files:**
- Create: `arcbench/notes/keep-run.md`

- [ ] **Step 1: 跑官方 keep 参考实现 + 测试**

```powershell
cd arcbench/upstream
npm run docker:build
npm run reference:keep
```

Expected: 命令退出码 0；`docker-output/keep/summary.txt` 中测试全部通过（32/32）。

- [ ] **Step 2: 若 Docker 不可用，记录阻塞**

Run: `docker --version`
Expected: 有版本；若无 Docker，将现象写入 `arcbench/notes/blockers.md`，改走
Task 4 的登录后路线（平台 Agent Template/官方沙箱跑分）。

- [ ] **Step 3: 记录结果**

把退出码、通过/失败数、报告路径写入 `arcbench/notes/keep-run.md`；保留
`playwright-report/index.html` 路径（不提交）。

- [ ] **Step 4: 提交**

```bash
git add arcbench/notes/keep-run.md arcbench/notes/blockers.md
git commit -m "docs(arc): P1 keep 参考实现闭环结果"
```

## Task 4: GOSIM 任务 30/30 闭环（Track B，登录门控）

> 前置：ARC-Bench 账号可用（官网说明“报名官网账号在提交后立即可用；ARC-Bench
> 开放与登录方式另行通知”）。若 9/12 仍不可登录，先完成 Track A 并在此标注阻塞。

**Files:**
- Create: `arcbench/notes/ticketbooking-run.md`

- [ ] **Step 1: 登录并下载 Agent Template 与任务包**

用浏览器登录 arc-bench.com，在 ticketbooking 任务页点击
`Download Agent Template`，并把下载物解包到 `arcbench/data/ticketbooking/`；
若平台提供任务 ZIP/测试导出，一并归档到 `arcbench/data/ticketbooking/`。

- [ ] **Step 2: 组装本地测试运行环境**

按 Agent Template 内 `README`（或官方 runner 的 `npm run test -- --app ...`
形态）启动一个最小 ticketbooking 应用，并将 Playwright `baseURL` 指向它。

- [ ] **Step 3: 跑到 30/30**

Run（以官方 runner 为参考，命令以实际模板为准）：

```powershell
cd arcbench/upstream
npm run test -- --app ticketbooking --target-url http://127.0.0.1:3301
```

Expected: 6 个 spec 文件、30 个用例全部通过。

- [ ] **Step 4: 记录并提交**

把命令、通过率、token/时长（如可测）写入 `arcbench/notes/ticketbooking-run.md`；
提交 notes。

## 退出标准

- `arcbench/upstream` 可本地跑官方 runner；
- `keep` 参考实现（Track A）跑出 32/32，或记录 Docker 阻塞并完成 Track B；
- 三个 GOSIM 官方需求 JSON 已归档且字段可读；
- 结果与阻塞全部落在 `arcbench/notes/`，`main` 与 `src/` 零改动。

## 风险与保底

| 风险 | 触发 | 应对 |
| --- | --- | --- |
| Docker 缺失 | `npm run docker:build` 失败 | 改 Track B 平台登录路线；仍不可行则记录阻塞并暂停 P1 |
| ARC-Bench 登录未开放 | 9/12 仍无法登录 | Track A 已证明 runner 闭环，P1 视为达标；ticketbooking 30/30 移入 P2 |
| 官方 runner 依赖下载慢/失败 | npm/浏览器安装失败 | 重试并记录；不改动官方脚本，仅补本地镜像说明到 notes |
| 测试包不可下载 | Task 4 下载 404 | 用需求 JSON 自建最小夹具，先做 Track A |

## 状态（2026-09-08）

| 任务 | 状态 |
| --- | --- |
| Task 0 工作区 | 未开工 |
| Task 1 数据归档 | 未开工（keep 样例已就位） |
| Task 2 runner 安装 | 未开工 |
| Task 3 keep 闭环 | 未开工 |
| Task 4 ticketbooking 30/30 | 未开工（登录门控） |
