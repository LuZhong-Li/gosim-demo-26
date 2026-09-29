# Known Limitations（已知局限清单）

> 范围：本仓库提交到 ARC-Bench 的生成应用模板 + agent harness。
> 用途：明确当前未完全覆盖的需求口径，评审/复盘时可直接引用。

## GitHub 模板

- REQ-6-2-2 分支比较已改为独立 `/:owner/:name/compare` 页面：`New pull request` 是链接，base/compare 是原生 combobox，同分支立即显示 `No changes` 并禁用创建。
- （REQ-4-2-3 仓库内搜索代码、REQ-6-3-4 评审 Comment 均已实现。）

## Sheet 模板

- REQ-3-2-2 Undo/Redo 与 REQ-5-1-2 筛选持久化已完成：撤销栈保存完整 worksheet 状态（cells、validations、filters、selection、pivot），筛选通过 `/state` 与 `/filters` 路由持久化到后端。

## 平台 / 评测侧（非代码局限）

- 官方 ARC-Bench hackathon 运行对本仓库在本地可复现通过的流程给出 0% 评分，正在按平台侧评测问题排查（证据见 `arcbench/notes/evaluation-evidence-2026-09-29.md` 与 `arcbench/notes/evidence/`）。
