# 评审复现手册（Demo Guide）

> 本文档面向评审：按顺序执行即可复现 GX-Sheet 全部核心能力，并核对
> 10 条事件的生产轨迹。仓库根目录执行；Windows 若 `python` 不在 PATH，
> 用 `.venv\Scripts\python.exe` 替代。

## 0. 环境准备

```bash
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -e .
python tools/check_env.py
```

## 1. 生成种子工作簿（含两条 active 规则）

```bash
python demo/init_seed.py
```

预期：提示生成 `demo/seed-workbook.xlsx`，共 8 张表；
`RULESETS` 表内含 `approval` 与 `required_check` 两条 `active` 规则。

## 2. CLI 全览

```bash
gx --help
```

预期可见 7 个命令组：`member / team / role / pr / workflow / ruleset / trace`
（及全局 `--workbook / --actor / --trace` 选项）。

## 3. 组织与权限

```bash
gx member list
gx member add dave member
gx team add data 数据团队
gx role assign 2 readonly
```

再用 readonly 成员创建 PR 验证拦截：

```bash
gx --actor 2 pr create --title "hack"
```

预期：红色 `[P001] permission denied`（readonly 无写权限）。

## 4. PR + Rulesets 闭环

```bash
gx pr create --title "demo change"
gx pr merge 1
```

预期：`[R001] PR 合并需要至少 1 个审批人`（approval 规则拦截）。

```bash
gx pr approve 1 alice
gx workflow run ci-check
gx pr merge 1
```

预期：工作流 `success`，PR `merged`。

## 5. 规则启用/禁用演示

```bash
gx ruleset list
gx ruleset disable approval
gx pr create --title "no-review"
gx pr merge 2        # 无审批也能合并（approval 已禁用）
gx ruleset enable approval
gx ruleset list      # 恢复 active，便于继续默认流程演示
```

> 演示完请 `enable` 恢复，保持后续演示与 10 条事件轨迹语义一致。

## 6. 一键完整链路（先跑这条再校验 trace）

```bash
python demo/run_demo.py
python tools/check_trace.py
```

预期：脚本 9 个环节全部 OK，`check_trace` 输出 10 条事件。

> 注意：`run_demo.py` 会先清空并重写 `demo/output/trace.jsonl`；
> 仓库内已提交的正式 trace 是 OBS 录制那次运行的产物，重跑后如需保持一致，
> 请按 docs/plans/09 的两阶段策略重新录制并单独提交。

## 7. Trace 校验与导出

```bash
gx trace check demo/output/trace.jsonl
gx trace export demo/output/trace-backup.jsonl --source demo/output/trace.jsonl
```

预期：`[OK]`，事件数 = 10，构成 `api_call=6, prompt=1, tool_call=1,
workflow_run=1, human_intervene=1`；导出文件与源文件内容一致且校验通过。

> 若只跑了第 3-5 节的手动 CLI 步骤而未跑 `run_demo`，trace 缺少
> `human_intervene`，`check_trace` 会按规则报错——这是预期行为，不是 bug。

## 8. Mock Agent（可选）

```bash
python agent/mock_nl_parser.py "添加成员 bob 为 member"
python agent/mock_nl_parser.py "列出 pr"
```

预期：自然语言指令映射到对应门面操作，并写入 `prompt` / `tool_call` trace。
