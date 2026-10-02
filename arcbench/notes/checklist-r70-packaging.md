# r70 打包检查清单

每轮打包前逐条确认。前三条是官方"可追溯产物"硬性要求（用户 2026-10-02 提出）。

## 可追溯产物（官方 SDK 要求）

- [ ] 包内存在 `arcbench_agent_runtime/`，且 `main.py` 的
      `from arcbench_agent_runtime import AgentRuntime` 能 import
- [ ] run 页 `Run Status` 出现 `Traceability initialized with N requirements and M scenarios`
      —— 这是 `.arc/runner-events.jsonl` 与 `.arc/traceability/*.json` 被平台收到的证据
- [ ] run 结束前日志里出现 traceability 汇总（`report_traceability()` 写入的
      requirement / test 状态），不是空目录

## 包内容

- [ ] zip 根目录有 `main.py` + `requirements.txt`
- [ ] `templates/` 完整（github scaffold + sheet），**不含** `node_modules` / `dist`
- [ ] `assets/` 完整（github + sheet 的 checklist / requirement-map / delta / prompts）
- [ ] `py_compile` 全通过；注入 JS 经 `node --check`
- [ ] 本地断言：`_scratch_r69.py`（播种）、`_scratch_r69_router.py`（路由补挂）、
      `_scratch_r70_template.py`（模板干跑）、`_scratch_sheet/smoke.js`（Sheet 后端 36/36）

## 进程与额度

- [ ] `/running` 的 active 数为 0（页面先渲染假空状态，要等 `RUNNING` 卡片消失）
- [ ] 预算 > ¥40
- [ ] 上传后 `History` 计数 +1，点 `Run 5 remaining tasks`，再读 `/running` 确认

## 事后

- [ ] 五份 stdout 落盘 + `checklist-r69-result.md` 逐项填写
- [ ] `run-log-2026-10-01.md` / `milestone-*.md` 追加本轮结论并 commit

## 调试备选方案：单任务（单 stage）隔离跑

官方群聊（Michael Li）："用 cli 就可以单独触发指定 task 的"——平台 CLI 可以只跑某个
task/stage，用于单阶段复现。**注意**：CLI 只是自动化外壳，**同样的能力页面里就有**：

```
https://arc-bench.com/competitions/hackathon/tasks/hackathon--github-stage-2
→ 按钮 ["Run", "Run history", "Run latest submission"]
```

每个 stage 本身就是一个 task（`hackathon--github-stage-1/2/3`、`hackathon--sheet`、
`hackathon--github`），所以点对应的 `Run latest submission` 就是"只跑这一个"。

- 用途：怀疑某个 stage 仍有 bug 时，单独跑它复现 + 抓单份日志，省额度省时间。
- ⚠️ 计分：**stage 子集分数不单独进主榜**——主榜取 `hackathon--github` 与
  `hackathon--sheet` 的最新提交最好成绩（阶段路线是"三阶段合计"，与单跑一个 stage 不同）。
- 节奏建议：**先用单 stage 快速验证修复，确认通过再打包全五题冲榜**。
- 待办：哪天从群历史拿到 CLI 的确切参数再补进本节（疑似形如
  `arcbench-cli submit --task <task> ./agent.zip`）；我尝试过
  `arc-bench-tutorial.vercel.app/skill.md`（当前不可达）与官网 `API Doc` 页
  （只讲 agent runtime SDK，没有 CLI 说明），暂无官方 CLI 文档可引用。
