# Known Limitations（已知局限清单）

> 范围：本仓库提交到 ARC-Bench 的生成应用模板 + agent harness。
> 用途：明确当前未完全覆盖的需求口径，评审/复盘时可直接引用。

## GitHub 模板

- **REQ-4-2-3 仓库内搜索代码**：未实现。`GET /api/search` 仅按仓库名/owner/描述搜索仓库（覆盖 REQ-3-1），没有按文件内容/片段搜索当前仓库的接口与 UI（关键字 → Code 结果页 → 命中片段/路径/分支上下文 → 点开文件）。`coverage.json` 已将其从 implemented 清单移除，避免 traceability 误标 CONVERGED。
- **REQ-6-2-2 分支比较**：以「Pull requests」页内联的 `Compare changes` 面板实现，不是独立对比路由；base 与 head 相同时显示 `There is nothing to compare` 并禁用创建 PR，但没有独立的 `/compare` 页面 URL。
- **REQ-6-3-4 评审 Comment**：已补齐（`1d501a2`）。评审三种类型 APPROVED / CHANGES_REQUESTED / COMMENTED 均已可提交。

## Sheet 模板

- **REQ-3-2-2 Undo/Redo 快照不全**：当前 `pushHistory()` 只快照 `cells`，undo/redo 通过 `replaceCells` 恢复单元格内容。行列结构会因单元格坐标整体恢复而「等价撤销」，但**数据校验规则（validations）、筛选配置（filters）、工作表选区（selection）不会被捕获/恢复**。属于底层重构项，风险高，暂未做。

## 平台 / 评测侧（非代码局限）

- 官方 ARC-Bench hackathon 运行对本仓库在本地可复现通过的流程给出 0% 评分，正在按平台侧评测问题排查（证据见 `arcbench/notes/evaluation-evidence-2026-09-29.md` 与 `arcbench/notes/evidence/`）。
