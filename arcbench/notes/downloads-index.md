# 手工下载资料归档索引（`arcbench/downloads/`）

来源：用户手动从 ARC-Bench 平台/群聊下载，2026-10-03 00:3x 整理进项目。
**本目录被 `.gitignore` 的 `downloads/` 规则忽略**（58.7MB，不进 git）；本索引文件用于登记清单。

## 目录结构

```
arcbench/downloads/
├── agent-packages/   17 个文件  12.8 MB   历史 agent 包 + 各 run 的工作区 zip
├── requirements/     40 个文件  19.8 MB   需求压缩包 + 解开的 hackathon--github / hackathon--sheet
├── logs/             24 个文件   2.2 MB   r69–r72 逐 run 日志 + 官方群聊记录 + 问题清单
├── runs/              9 个文件  23.9 MB   r71-project / r72-project（各 run 的 template.zip）
└── notes/             3 个文件   0.0 MB   第三方诊断报告 / 规格文档 / 截图
```

## 明细

### agent-packages/（历史提交包与 run 工作区）

| 文件 | 说明 |
|---|---|
| `arc-agent-r30 / r31 / r32 / r33 .zip` | 早期包；**r33 就是"13/200 保险"那份的来源** |
| `arc-agent-r41 / r43 .zip`（含 `(1)` 副本） | 中期包 |
| `arc-agent-r53 / r62 / r62 (1) / r62 (2) .zip` | 后期包 |
| `9acf527fa77e-template.zip` | 某次 run 的工作区（早期，2026-10-01） |
| `a128c4309297-template.zip` | **r70 GitHub 原题** run 工作区 |
| `ec386f813833-template (1).zip` | **r71 Sheet** run 工作区 |
| `cfb007b9652d-template.zip` / `(1)` | 某次 run 的工作区（2026-10-02 11:57） |

### runs/（成组的 run 工作区，按轮次）

| 目录 | 内容 |
|---|---|
| `r71-project/` | `0faa84342044`(github) `205ed8a34f2f`(stage1) `3f2b94d57f57`(stage2) `79d55d4c9577`(stage3) `ec386f813833`(sheet) |
| `r72-project/` | `f1433dd03622`(github) `b687b5ea1abd`(stage1) `556ca66978e3`(stage2) `fac5c3aceb68`(stage3) |

> r71 的五份已解压到 `arcbench/runs/_r71_artifacts/<runid>/template/`，
> 是本项目**真机产物分析**（逐名缺口、SPA 接线、collection 返回值）的证据来源。

### logs/（逐 run 日志 + 群聊）

| 项 | 内容 |
|---|---|
| `r69日志/`、`r70日志/`、`r71日志/`、`r72日志/` | 每轮若干 `rNN-x.txt`（用户从 run 页复制的 Stdout） |
| `官方群聊天记录.txt` | 125KB，官方群聊全量（规则澄清、坑点、CLI 线索） |
| `问题.txt` | 用户整理的"待排查问题清单" |

### requirements/

| 文件/目录 | 说明 |
|---|---|
| `arcbench-hackathon-requirements.zip` (3.8MB) / `(1).zip` (11.5MB) | 官方需求包（两个版本） |
| `hackathon--github/` | 解开的 GitHub 题需求（`requirements.yaml` + 28 个文件，含 reference 截图） |
| `hackathon--sheet/` | 解开的 Sheet 题需求（10 个文件） |

> 与项目内已有的 `arcbench/requirements/hackathon--{github,sheet}` 内容重叠，保留作为对照版本。

### notes/

| 文件 | 说明 |
|---|---|
| `ARC-Bench-0分问题诊断报告.md` | 第三方（豆包）0 分诊断报告 |
| `完整功能实现规格.md` | 规格整理文档 |
| `screenshot.png` | 一张历史截图 |

## 未纳入（与本项目无关，已跳过）

大学物理实验报告（三线摆 / 杨氏模量等 png、pdf、docx）、青云书院助学金汇总表与申请表
（xlsx、docx）—— 与 ARC-Bench 无关，**未复制**。

## 使用建议

- 需要"某轮某任务的最终产物"时，优先看 `runs/rNN-project/`；
- 需要对照"平台真实 Stdout"时看 `logs/rNN日志/`（比自己 dump 的 `arcbench/runs/_rNN_*_stdout.txt` 更早、更全）；
- 需要"历史包回归对比"时用 `agent-packages/arc-agent-rNN.zip`。
