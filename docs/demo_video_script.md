# Demo 视频分镜脚本（3–5 分钟，含口播词）

> 配合 [交付指南.md](交付指南.md) 使用。当前正式 `demo/output/trace.jsonl`
> 为 10 条事件且与仓库一致，本脚本按「Mode A：一次录制对齐现有 trace」设计；
> 若日后决定重录多轮 Agent 轨迹，先更新 demo 脚本与 trace 基线，再按本分镜录制。

## 录制纪律（先读）

1. 功能冻结后再录；录制期间与录制后不要执行任何会写正式 trace 的命令
   （`run_demo.py` / `init_seed.py` 之外的 `gx` 写操作）。
2. 正式轨迹段顺序固定：`init_seed.py` → `run_demo.py` → `check_trace.py`，
   与 [交付指南.md](交付指南.md) 一致；Web 段在 trace 校验**之后**进行，
   Web 只写 `trace-web.jsonl`，不污染正式轨迹。
3. 需要重录时：重新执行 `init_seed.py` 后再跑一次，全程 OBS 录制。
4. 录完提交新 trace 并 push；种子时间戳变化用
   `git restore --source=HEAD -- demo/seed-workbook.xlsx` 还原。

## 分镜时间轴（总长约 4 分钟，压缩时优先删 Web 段）

| 时间 | 画面 | 操作/命令 | 口播词（参考，可精简） |
| --- | --- | --- | --- |
| 0:00–0:20 | 开场：浏览器打开仓库 README 或标题页 | 无 | “这是 GX-Sheet——用 Excel 电子表格模拟 GitHub 组织管控与自动化 Agent 的开源原型。Workbook 就是组织，Sheet 是资源集，行是实体；CLI、Mock Agent 和 Web 共用同一个 ServiceBus。” |
| 0:20–0:50 | 终端：环境与种子 | `python tools/check_env.py` → `python demo/init_seed.py` | “它零外部服务依赖，一份 xlsx 是唯一数据源。init_seed 会生成四角色、一个团队和两条 active 规则，同时清空旧的演示轨迹，保证可复现。” |
| 0:50–2:10 | 终端：一键完整链路 | `python demo/run_demo.py` | 按输出逐环节讲解：“第一步，通过自然语言指令添加只读成员——这就是轨迹里的 prompt 和 tool_call；创建 PR；readonly 成员创建 PR 被 P001 权限拦截，这是预期内拒绝路径；无审批合并被 R001 规则拦截；审批通过后运行 ci-check 工作流，再合并成功；最后写入人工干预点，并自动校验 trace。” |
| 2:10–2:30 | 终端：轨迹核验 | `python tools/check_trace.py`，必要时 `Get-Content demo/output/trace.jsonl -TotalCount 3` | “看这条生产轨迹：prompt 记录自然语言指令，tool_call 记录工具调用，api_call 记录每次业务操作，human_intervene 记录人工确认点，共 10 条事件、8 字段、5 种类型，校验通过。” |
| 2:30–3:30 | Web 形态（加分项）：另开终端启动 Web，浏览器操作 | `python -m web.run --reset`；页面依次：添加团队、添加成员、改角色、创建 PR、审批、运行 ci-check、合并、加载审计、导出审计 JSON、切换 ruleset | “同一个 ServiceBus 还有浏览器形态：成员与角色、团队、PR 评审流、工作流、Rulesets 启停、审计导出都能在页面完成；错误以 P001/R001 等状态码原样展示，和 CLI 口径一致。” |
| 3:30–3:50 | 收尾：回到终端停止 Web，展示 trace 统计 | 停 Web（`Ctrl+C`）；`python tools/check_trace.py` 复验 | “四块能力——组织权限、Rulesets、审计留痕、Actions——都在一条可复现链路上闭合。项目定位是概念验证原型，已知局限与后续迭代方向都写在 README 和 limitation 文档里。谢谢观看。” |

## 超时控制

- 4 分钟为目标；超过 5 分钟时：删除 Web 段、压缩开场口播；最短 3 分钟版本 =
  开场（15s）+ init_seed（15s）+ run_demo（60s）+ check_trace（20s）+ 收尾（10s）。
- 录制前建议先完整排练一遍，确认终端字号与输出换行在画面中清晰。

## 录后清单

```powershell
git restore --source=HEAD -- demo/seed-workbook.xlsx   # 还原 init_seed 的时间戳变化
git add demo/output/trace.jsonl
git commit -m "chore: 更新最终演示 trace"
git push origin main
```

- [ ] 视频覆盖完整链路（创建成员 → PR → 权限拦截 → Rulesets 拦截 → Workflow → 审计/trace）
- [ ] 时长在 3–5 分钟，命令与输出清晰可见
- [ ] trace Raw 链接与视频中那一次运行一致（同一次录制产出）
