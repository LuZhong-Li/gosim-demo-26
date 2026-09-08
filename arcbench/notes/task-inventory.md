# P1 官方任务数据清单

归档日期：2026-09-08。

| 任务 | 来源 | 需求数 | 公开测试数 | 本地路径 |
| --- | --- | --- | --- | --- |
| Train Ticket Booking Demo | Task Bank (`/playground/task-bank/web/ticketbooking`) | 6 | 30（`test_runner=playwright`） | `arcbench/data/requirements/ticketbooking.json` |
| GitHub Collaboration Platform Core Requirements | Task Bank (`/playground/task-bank/web/github`) | 47 | 0 | `arcbench/data/requirements/github.json` |
| Core Requirements for an Online Spreadsheet Data Workspace | Task Bank (`/playground/task-bank/web/sheet`) | 24 | 0 | `arcbench/data/requirements/sheet.json` |
| Keep | ARC-Bench 公共 Web 基准 | 32 | 32 | `arcbench/data/keep/`（keep-task.zip 解包） |

说明：

- 三个 Task Bank 需求 JSON 均含 `requirements_yaml`、`requirements_markdown`、
  `prerequisites_markdown`、`references_base_url` 等字段；github/sheet 的
  `total_tests=0` 表示平台当前未公开其 Playwright 用例。
- keep 任务包结构：`keep/requirements/`（yaml/md/testdata/截图）+
  `keep/tests/*.spec.ts` + `keep/README.md`。
- 抓取接口示例：
  `http://arc-bench.com/api/requirements/ticketbooking?catalog=playground`。
