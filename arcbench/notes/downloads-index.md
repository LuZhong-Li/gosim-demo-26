# 手工下载资料归档索引（`arcbench/downloads/`）

来源：用户手动从 ARC-Bench 平台/群聊下载，2026-10-03 00:3x 整理进项目；
2026-10-03 09:5x 增补 r73/r74 的补抓日志与 r75/r76 的说明目录（见 `logs/`）。
**本目录被 `.gitignore` 的 `downloads/` 规则忽略**（约 60MB，不进 git）；本索引文件用于登记清单。

## 目录结构

```
arcbench/downloads/
├── agent-packages/   17 个文件  12.8 MB   历史 agent 包 + 各 run 的工作区 zip
├── requirements/     40 个文件  19.8 MB   需求压缩包 + 解开的 hackathon--github / hackathon--sheet
├── logs/             44 个文件   3.6 MB   r69–r76 逐 run 日志 + 官方群聊记录 + 问题清单
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
| `r69日志/` … `r72日志/` | 每轮 5 份 `rNN-x.txt`（用户从 run 页复制的 Stdout），r70 多两份 stage3 续抓 | 
| `r73日志/`、`r74日志/` | 每轮 5 份，**由我按同一命名补抓**（`_dump` 走 run 页 Stdout 标签），共 10 份、1.07 MB |
| `r75日志/` | 只有 `README.txt`：包已上传但**从未起跑**（平台 Run 按钮拒绝自动点击），所以没有 stdout |
| `r76日志/` | 5 份 stdout 已抓齐（+ `README.txt` 记结论），格式同 r69–r74 |
| `_write_probe.txt` | 排查"能否写入本目录"时留下的探针文件（0 字节），可忽略 |

> **逐轮命名约定**（r69 起统一）：`rNN-1.txt` = GitHub 原题、`rNN-1-1/1-2/1-3.txt` = Stage 1/2/3、
> `rNN-2.txt` = Sheet。抓取方式：run 页 → `Stdout` 标签（`button.doc-tab` 第 4 个）→ 复制全文。
> 逐份关键标记统计见 `arcbench/notes/_log-stats.md`（脚本 `arcbench/runs/_log_stats.py`），
> 总索引见 `arcbench/notes/logs-index-2026-10-03.md`。
| `官方群聊天记录.txt` | 125KB，官方群聊全量（规则澄清、坑点、CLI 线索） |
| `官方群聊天记录.cleaned.txt` | **清理版**：1904 行 → 保留 1639 行，移除 265 行（其中 226 行是纯闲聊：致谢/收到/表情/仅@人，39 行空行） |
| `官方群聊天记录.removed-lines.txt` | 被移除的那 265 行原文（**没有任何内容真正丢失**） |
| `问题.txt` | 用户整理的"待排查问题清单" |

> 清理脚本：`arcbench/runs/_clean_groupchat.py`（只删"纯社交"行；带 `：`/`:` 的标题行、
> 含 `arc/bench/agent/提交/测评/API/…` 关键词的行、以及 `群公告` 等一律保留）。
> **原始文件未改动**，仍保留在 `C:\Users\HW\Downloads` 与本目录。

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
