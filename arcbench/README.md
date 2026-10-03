# arcbench —— ARC-Bench 参赛工作区

> **接手请先读 [`HANDOVER.md`](HANDOVER.md)**（自包含交接文档：平台契约、仓库地图、守卫流水线、
> 故障图鉴、平台操作手册、迭代方法论、决策记录、当前状态与上手清单）。
> 笔记索引见 [`notes/README.md`](notes/README.md)。

## 这是什么

ARC-Bench「Agentic Software Factory Hackathon」的参赛工作区。我们提交的**不是一个应用**，
而是一个**参赛智能体**：平台把一份官方需求交给它，它现场调用大模型生成一个可跑的 Web 应用，
再由平台的 Playwright 用例（Stage-1 30 条 / 全量 200 条）评分。

* **提交物 = `agent/`**（打成 zip 上传，zip 根目录必须有 `main.py`）
* 其余都是资料：`notes/` 笔记、`dist/` 历史包、`runs/` 探针与打包中间产物、`requirements/` 官方需求原文

## 三分钟上手

```powershell
$py = "C:\Users\HW\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
cd D:\gosim-demo-26\arcbench

# 1) 语法
& $py -m py_compile (Get-ChildItem "agent" -Recurse -Filter *.py |
  Where-Object { $_.FullName -notmatch "node_modules|__pycache__" } | % { $_.FullName })

# 2) 本地断言（每个修复都"修复前失败 / 修复后通过"）
Get-ChildItem "runs\_scratch_r*.py" | Sort-Object Name | % { & $py $_.FullName }

# 3) 打包
$stamp = Get-Date -Format "HHmmss"
$stage = "D:\gosim-demo-26\arcbench\runs\stage-rNN-$stamp"
New-Item -ItemType Directory -Path $stage -Force | Out-Null
robocopy "agent" $stage /E /XD node_modules dist __pycache__ .venv .git .agents runs /XF *.pyc *.log /NFL /NDL /NJH /NJS /NP
& $py "runs\_pack_agent_zip.py" $stage "dist\arc-agent-rNN.zip"
```

预检：zip **119 项**、含 `main.py`、`.arc` 命中 **0**。

## 当前战绩（2026-10-03）

| 包 | 结果 | 说明 |
|---|---|---|
| `dist/arc-agent-r33.zip`（保险） | **9.65 / 13-of-200**（原题 11.31） | 预置成品应用，￥0 / 约 20 分钟，稳定 |
| 生成型最好的一轮（r78） | 1.59 | 之后 r79–r83 基本为 0 |

两条硬约束：**排行榜只看最后一次保存的提交**（每次上传前先记当前最佳，收尾时把保险包放回最后一位）；
**`Running ≠ 0` 时绝不上传，且全程禁止任何删除操作**。

## 目录速查

| 路径 | 内容 |
|---|---|
| `agent/` | ★ 提交物：`main.py`、`guard.py`（守卫流水线）、`verify.py`、`arcbench_agent_runtime/`、`templates/` |
| `notes/` | 时间线、问题清单、日志统计（索引 `notes/README.md`） |
| `dist/` | 历史提交包（保险包 `arc-agent-r33.zip` 已入库） |
| `runs/` | 本地探针 `_scratch_r*.py` 与打包中间产物（探针已入库，其余忽略） |
| `downloads/` | 平台日志与 run 产物（不入库） |
| `requirements/` | 官方需求原文（`hackathon--github` / `hackathon--sheet`） |
