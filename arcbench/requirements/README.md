# 比赛任务要求（官方原始包）

这里存放 ARC-Bench 黑客松两道私有题的**官方任务包原件**，是生成器的唯一权威输入。

```
arcbench/requirements/
├── README.md                        ← 本文件
├── hackathon--github/
│   ├── requirements.yaml            ← 平台下发的原始需求树（65 节点 / 100 场景）
│   ├── requirements.json            ← 由 yaml 转换，供不装 PyYAML 的脚本比对
│   └── reference/                   ← 27 张官方界面参考截图
└── hackathon--sheet/
    ├── requirements.yaml            ← 42 节点 / 100 场景
    ├── requirements.json
    └── reference/                   ← 9 张参考截图
```

## 来源

2026-10-01 从平台任务页下载（`https://arc-bench.com/competitions/hackathon` 的任务包导出），
内容为 `requirements.yaml` + `reference/*.png`。

它比仓库里原先用的那份**新**：

| | 本目录（当前） | `data/requirements/*.json`（旧快照，gitignore） |
|---|---|---|
| github | 65 节点 / **100 场景 / 383 步** | 65 节点 / 64 场景 / 239 步 |
| sheet | 42 节点 / **100 场景 / 400 步** | 42 节点 / 48 场景 / 178 步 |
| 描述有差异的节点 | — | github **55/65**，sheet 12/42 |

差值不是排版：旧版里 REQ-1-1-1 写的是注册页从 *account-access page* 进入，新版写的是
从 **sign-in page** 的 `Create an account` 链接进入；旧版根本没有
`Username already exists`、`Password requirements are not satisfied`、
`Add worksheet`、「Last updated: …」这类测试要逐字匹配的字符串。

## 谁在读它

| 路径 | 角色 |
|---|---|
| `arcbench/requirements/<bundle>/` | **权威原件**（本目录，入库） |
| `arcbench/assets/<task>/requirement-map.json` | 派生副本，仓库内对外保持一致 |
| `arcbench/agent/assets/<task>/requirement-map.json` | 派生副本，**打包进提交包**，`main.py` 实际读取的就是这一份 |
| `arcbench/data/requirements/*.json` | 早期从 API 抓的快照，**已过期**，被 `.gitignore` 排除，仅作历史留档 |

提交包只从 `arcbench/agent/` 构建，所以本目录**不会**进入上传的 zip。

## 刷新流程

平台更新任务包后，重新下载覆盖 `requirements.yaml` 与 `reference/`，然后：

```powershell
# 1) YAML → JSON（本机没有 PyYAML，所以用 node + js-yaml）
node arcbench/notes/requirements_to_json.cjs arcbench/requirements/hackathon--github
node arcbench/notes/requirements_to_json.cjs arcbench/requirements/hackathon--sheet

# 2) 重建生成器读取的需求地图（会保留已有 checklist）
node arcbench/notes/requirement_map_from_bundle.cjs github
node arcbench/notes/requirement_map_from_bundle.cjs sheet

# 3) 重新打包提交包
#    见 arcbench/notes/agent-fixes-r35.md 里的 robocopy + Compress-Archive 流程
```

## 运行时兜底

`main.py::merge_runtime_requirements` 会在生成开始时，用平台**当次挂载**的需求树覆盖
包内地图的描述/标题/依赖/场景（包内 checklist 保留）。这样即使任务包再次更新而我们忘了
重新打包，模型看到的仍是平台当前那份；运行日志里会打印
`[arc-agent] requirement overlay: refreshed N node(s) …`。
设 `ARC_DISABLE_REQUIREMENT_MERGE=1` 可以关掉这个覆盖。

## 已知噪音

sheet 版的需求正文里混有平台模板填充文本（`the requested workflow` 之类），
主要出现在场景叙述中。`selfcheck.py` 已把它排除在「精确控件名」清单之外；
`requirement_map_from_bundle.cjs` 也会过滤掉对应的 checklist 条目
（sheet 原有 105 条，其中 100 条是这种填充，已丢弃）。
