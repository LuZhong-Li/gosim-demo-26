# P2 最小提交 Agent（本地自测）

日期：2026-09-09。

## 产物

- 入口：`arcbench/agent/main.py`（读 `requirements.yaml` → 按模板生成应用 →
  本地 Playwright 自测 → SDK 事件/traceability 上报 → git 提交）。
- 依赖：`arcbench/agent/requirements.txt`（PyYAML）。
- SDK mock：`arcbench/agent/arcbench_agent_runtime/`（平台运行时用真包替换）。
- 模板：`arcbench/agent/templates/keep/index.html`。

## 自测结果

以 keep 任务为生成目标跑通全链路：32 条 Playwright 测试中 31 通过、1 失败
（REQ-2.7.2，公开 runner 不做逐用例 fixture 注入导致，见 keep-run.md）。

产出（`arcbench/runs/keep/project/`，已 gitignore）：

- `.arc/runner-events.jsonl`（run_started / mark_design_done /
  mark_implementation_done / mark_test_passed|failed / mark_run_completed /
  notify_commit_history_changed）；
- `.arc/traceability/{requirements,node_states,tests,...}.json`；
- `git log` 含提交 `ARC agent generated Keep`。

本地自测命令见 `arcbench/agent/README.md`。
