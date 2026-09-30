# Sheet 任务生成链路核对（2026-09-30）

## 背景：为什么"Sheet 清单"的形态变了

"Sheet 侧 105 条清单"原本的计划是**逐条核对并修补我们的 Sheet 实现**。但模板回放已退役
（`arcbench/agent/templates/{sheet,…}` 移入 `arcbench/reference/`，提交包只留通用脚手架），
Sheet 的实现不再由我们手写，而是**由模型在运行时生成**。

所以这一项的适用形态变成：**确认 Sheet 任务的生成链路与 GitHub 一样准备充分**——
需求图、线上 delta、逐模块提示词、精确名自检这四件事对 Sheet 是否同样生效。

## 核对结果（全部通过）

用 stub 端点跑 `main.py`，输入 `arcbench/runs/sheet/requirements`：

```
[arc-agent] task=sheet template=scaffold
[arc-agent] requirement map loaded from assets/sheet
[arc-agent] REQ-1: files=1 covered=1 tokens=33
[arc-agent] REQ-2: files=1 covered=1 tokens=66
[arc-agent] REQ-3: files=1 covered=1 tokens=99
[arc-agent] REQ-4: files=1 covered=1 tokens=132
[arc-agent] REQ-5: files=1 covered=1 tokens=165
[arc-agent] model generation done: files=1 covered=1 calls=5 tokens=165
[selfcheck] exact-name coverage: 0/80 present (80 missing)
[selfcheck] missing name: Worksheet grid
[selfcheck] missing name: New blank workbook
[selfcheck] missing name: Create
[selfcheck] missing name: Rename workbook
[selfcheck] missing name: Workbook name
[selfcheck] missing name: Save
[selfcheck] missing name: Workbook name cannot be empty
...
```

| 检查点 | 结论 |
| --- | --- |
| 任务识别 | `task=sheet`，模板自动落到 `scaffold` ✅ |
| 需求图 | 从 `assets/sheet/requirement-map.json` 读取 ✅ |
| 模块划分 | REQ-1…REQ-5 共 5 个模块（Sheet 需求是 5 个模块，GitHub 是 6 个）✅ |
| 线上 delta | `load_live_delta("sheet")` 正常加载（`notes/requirements-live/sheet-delta.md`，638 句，51 个需求段）✅ |
| 精确名自检 | 报出的是 **Sheet 专属名**（`Worksheet grid`/`New blank workbook`/`Rename workbook`/`Workbook name cannot be empty`…），说明自检的两个来源——需求图与源码——都按 Sheet 任务正确工作 ✅ |

覆盖率 0/80 是**预期的**：stub 只返回一个探针文本文件，工程里没有任何真实实现。
真实运行时该数字反映生成质量，正是我们要看的信号。

## 结论

Sheet 与 GitHub 走的是**同一套生成管线**（需求图 → 逐模块提示词 + delta → 生成 → 构建契约守卫 → 精确名自检），
没有任务专属分支，也没有需要为 Sheet 单独补的实现代码。
因此"Sheet 105 条清单"以**生成质量的自检输入**形式已经就位：那些精确名会随 prompt 一起发给模型，
并会在每次运行的 stdout 里以 `[selfcheck] missing name: …` 的形式暴露缺口。

真正能提升 Sheet 分数的动作，与 GitHub 一样是**迭代提示词 / 生成质量**，
而这件事只有拿到 r34 的平台结果（token 是否非 0、构建是否通过、分数变化）才能定方向。
