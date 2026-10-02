# r70 打包检查清单

每轮打包前逐条确认。前三条是官方"可追溯产物"硬性要求（用户 2026-10-02 提出）。

## 可追溯产物（官方 SDK 要求）

- [ ] 包内存在 `arcbench_agent_runtime/`，且 `main.py` 的
      `from arcbench_agent_runtime import AgentRuntime` 能 import
- [ ] run 页 `Run Status` 出现 `Traceability initialized with N requirements and M scenarios`
      —— 这是 `.arc/runner-events.jsonl` 与 `.arc/traceability/*.json` 被平台收到的证据
- [ ] run 结束前日志里出现 traceability 汇总（`report_traceability()` 写入的
      requirement / test 状态），不是空目录

> ⚠️ 概念澄清（修正一处常见误解）：`.arc/` **不是打进 zip 的交付物**，而是
> agent 在**平台运行时**写进生成目录（`/workspace/template/.arc/`）的产物。
> 所以：
> - zip 里**必须**有 SDK（`arcbench_agent_runtime/`），**不应该**有陈旧的 `.arc/`；
>   实测 r70 包 `.arc` 条目数 = **0**，`arcbench/agent/` 下也没有 `.arc/` 目录 ✅
> - 真正不能丢的是"运行期写出 `.arc/runner-events.jsonl` + `.arc/traceability/*.json`"，
>   以及 run 页出现 `Traceability initialized with N requirements and M scenarios`。
> - SDK 会把可追溯表纳入运行期 git：`gitops.py:93-95` 生成的项目 `.gitignore` 为
>   `.arc/*` + `!.arc/traceability/` + `!.arc/traceability/**`（事件流忽略、追溯表提交）。

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

## 官方规则要点（2026-10-02 群公告，核对后写入）

1. **计分绑定"提交 + 该提交内部的 run"**：最终成绩取**最后一次保存的提交**，
   在该提交下的多次运行里取**最好的一次**；**新提交不继承旧提交的运行成绩**。
   - 实操：同一提交可以反复启动 run 刷最好成绩，不必每次小改动都新建提交。
   - 兜底：最新提交若全 0 / 未运行，**官方允许删除该提交**（标准兜底流程，不是黑操作）。

   **兜底的更省事形式（本项目采用）**：恢复 r33 保险**不必逐个删 35 个提交**——
   判榜只看"最新提交"，所以直接**把本地那份 `arcbench/dist/arc-agent-r33.zip`
   （0.37MB，就是 13/200 / 9.65 的那份）当新提交重新上传 + 起跑**即可，
   它会成为最新提交，榜单立刻回到 9.65。一次上传 vs 35 次不可逆删除。
   ⚠️ 顺序：必须**先**看 r70 出分——若先传 r33，r70 就被挤成"非最新提交"，
   即使拿分也暂时不显示。
2. **原题路线 vs 阶段路线取较高者**；只完成 Stage 1 也能拿到成绩上榜，后续阶段跑完
   榜单分数随之上升。
3. 阶段路线**继承**：后续阶段以"上一阶段最新提交里得分最高那次运行产出的应用"为起点，
   无可用应用则从空模板起步 —— 这是平台侧行为，我们 harness 依旧全量播种/全量解析。
4. 任务前**绿色圆点 = 该任务已有有效运行成绩**。
5. **截止时间只拦新提交**，已在跑的 run 会跑完出分。
6. 两个自测通道的区别：

   | 通道 | 行为 | 适用 |
   |---|---|---|
   | 平台任务页 Self-test | 完整跑 agent（`main.py`）流水线，消耗自测配额 | 验证 harness（guard / 播种 / 路由修复） |
   | `arcbench-selftest-web.vercel.app` | **跳过 agent，直接上传生成好的应用 zip 跑 Playwright** | 只想验证**产物本身**的用例通过率 |

   ⚠️ selftest-web 不跑 harness，**测不到 `guard.py`、播种逻辑、路由补挂**；
   harness 侧改动必须走平台 Self-test 或正式 run。

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
