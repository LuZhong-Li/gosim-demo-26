# arcbench/notes —— 笔记索引

**接手先看**：[`../HANDOVER.md`](../HANDOVER.md)（自包含交接文档：平台契约、流水线、故障图鉴、操作手册、方法论、当前状态）。

## 主时间线与记录

| 文件 | 内容 |
|---|---|
| `milestone-r68.md` | 主时间线：每轮的改动、分数、run-id、证据（77 KB，最全） |
| `run-log-2026-10-01.md` | 逐轮运行记录（74 KB） |
| `status-2026-10-03.md` | 单页现状快照（比赛/战绩/工程/问题/坑/收尾计划） |
| `handoff-2026-10-01.md` | 上一版交接文档（历史参考） |
| `HANDOVER-2026-10-03.md` | 按轮次组织的叙事版交接稿（逐轮成绩、根因→修复→commit、教训）；权威入口仍是 `../HANDOVER.md` |

## 问题与诊断

| 文件 | 内容 |
|---|---|
| `evidence/official-report-digest-a128c4309297.md` | **官方逐条报告摘要（GitHub 原题 100 条）**：expected=0 / unexpected=100（73 超时 + 27 找不到导航目标），0 分的直接证据 |
| `open-issues-2026-10-02.md` / `.txt` | 未解决问题清单（含"错误代码 vs 修复代码"对照） |
| `logs-index-2026-10-03.md` | 日志总索引 + 逐轮关键标记表 |
| `_log-stats.md` | 56 份日志的脚本统计（`runs/_log_stats.py` 生成） |
| `blockers.md`、`known-limitations`（仓库根 `KNOWN-LIMITATIONS.md`） | 阻塞与已知限制 |

> **平台逐条结果从哪来（2026-10-03 更正）**：官方 Playwright 报告**一直存在**，位置是
> run/提交产物的 zip 里 —— `<runid>-template.zip` → `template/.arc/playwright-report.json`。
> 早前"平台不给逐条结果"的结论是**错的**（当时只翻了 run 页 File 树和 stdout，没解 zip）。
> 现在有两份可读报告：`arcbench/downloads/agent-packages/a128c4309297-template.zip`（整题 100 条）
> 与 r72 Stage-2 的那份（29 条）。解压后用 `arcbench/runs/_report_digest.py <json>` 压成摘要。

## 平台与需求

| 文件 | 内容 |
|---|---|
| `platform-rules-2026-09-30.md` | 平台规则（提交物形态、评测流程、限额） |
| `platform-credentials.md` | 账号与登录信息（**注意保密**） |
| `checklist-r70-packaging.md` | 打包/上传/起跑的逐步 checklist |
| `ref-official-hackathon-info.md`、`task-inventory.md` | 官方赛事信息与题目清单 |
| `official-live-strings-*.txt`、`coverage-github.md` | 需求里的精确字符串与覆盖对照 |

## 早期与专题

`agent-*.md`（agent 侧改造）、`evaluation-evidence-*`、`external-repos-*`、
`sheet-*.spec.ts` / `github-*.spec.ts`（我们自己写的本地 Playwright 用例）、
`*_to_json.cjs` / `*.py`（需求树解析与审计脚本）。

> 约定：**每条结论都要能追到日志或探针**。新增笔记请沿用"证据（文件:行）→ 结论 → 修法 → 验证"的结构。
