# GitHub 题首次平台提交（2026-09-10）

包：`arcbench/dist/arc-agent-r12.zip`（247.1 KB，含 ticketbooking / github / sheet 三模板）
账号：LiMengYuan；提交名 `arc-agent-r12`；BASE URL `https://api.arc-bench.com/v1`；
MODEL `deepseek-v4-flash`；API KEY 由用户手动填入（平台该字段为受控 password，
程序化 fill/setValue/键盘输入均写不进去，必须人工输入）。

## 两次提交结果

| Run | Duration | Status |
| --- | --- | --- |
| `9095daef638f` | 40s | FAILED |
| `97c421d0b72e` | 46s | FAILED |

## 失败原因：平台侧无测试用例，不是我们的问题

`9095daef638f` 的 STAGE 日志：

```text
STAGE 1 Preparing environment
  Traceability initialized with 65 requirements and 64 scenarios
  Environment preflight passed
STAGE 2 Running agent
  Agent dependencies installed
  Generation agent finished successfully
STAGE 3 Evaluating result
  Playwright JSON report contains no executed tests
  Installing dependencies for frontend -> Dependencies installed
  Building template frontend -> Template frontend built
  Installing dependencies for backend -> Dependencies installed
  Starting template application server -> started (pid=177)
  Template application is reachable on http://127.0.0.1:3000
  Deploying generated application -> reachable on http://127.0.0.1:3000
  Test environment ready with 4 workers
  No Playwright tests found; skipping test execution
  Playwright test process finished with code 0
```

结论：

- 上传包、SDK traceability（65 需求 / 64 场景）、依赖安装、构建、启动 3000 端口
  **全部通过**；agent 阶段 `finished successfully`；
- 平台对 github 任务当前 `total_tests=0`，没有可执行 Playwright 用例，
  于是 STAGE 3 判 FAILED —— 与 `arcbench/notes/task-inventory.md` 记录的
  “github/sheet 的 total_tests=0” 一致；
- 结论：**r12 包在平台侧是健康可运行的**，要拿分必须等主办方发布 github/sheet
  的测试用例，或改投已公开用例的赛道（Ticket Booking 30 条 / Smoke 2 条）。

## 待办

1. 官方发布 github/sheet 测试后重跑 r12；
2. 若有官方 API KEY，改用它替换临时 key（当前用的是第三方 key，
   已出现在聊天记录里，建议轮换）；
3. Ticket Booking 赛道已有 `5305cd35a463`（30/30, score=100）可复现。

## 包完整性核对（2026-09-10）

`arc-agent-r12.zip` 共 84 个条目，`templates/github/**` 内含 9/10 早上修改的
v5 版本（`backend/src/app.js` 8:17、`backend/src/gh_store.js` 8:15、
`frontend/src/api/index.ts` 8:15、`frontend/src/pages/RepoPage.tsx` 8:15），
即上传的确实是最新模板，非旧快照。`sheet/**` 同批打包。

## 比赛页改版（2026-09-10 复核）

`/competition` 上原来的 Smoke / Ticket Booking 四个赛道已下架，换成两个官方赛道
（共 4 个可提交位 = 2 赛道 × 2 任务）：

| 赛道 | 路径 | 任务 | 测试 | 排行榜 |
| --- | --- | --- | --- | --- |
| Agentic Software Factory Hackathon | `/competitions/hackathon` | TASK-001 GitHub-style ERP、TASK-002 Sheets-style | 0 | 无提交 |
| Agentic Software Factory Hackathon (Evolution) | `/competitions/hackathon-evolution` | 同上两个 pack | 0 | 无提交 |

要点：

- 日期均为 Sep 1 – Oct 17；
- **主赛**玩法：先 “Save an agent snapshot”（Submission name / Base URL /
  API Key / Model，共享给所有任务），再选任务 **Run**；
- **Evolution** 不传代码：表单里有 “Template * — Select one immutable generated
  output from hackathon for each task”，即必须先从主赛拿到 completed run；
  现在是 “No eligible completed runs”。
- 两个任务页的 `tests` 标签均为 **“No tests found — This task does not include
  test files in its test directory.”**，与 playground 一致 —— 现在跑仍会
  走 `skipping test execution` 判 FAILED；
- 任务清单与 `templates/github`、`templates/sheet` 完全对口，r12 直接可用。
