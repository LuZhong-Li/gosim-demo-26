# GX-Sheet：基于电子表格模拟 GitHub 组织管控与自动化 Agent 原型

> GOSIM Create 2026 初赛作品（概念验证原型，非生产级产品）。

## 项目定位

以普通 xlsx 电子表格为唯一持久数据源（Workbook = 组织，Sheet = 资源集，行 = 实体），
用 CLI + Mock Agent 作为交互入口，模拟 GitHub 组织管控与自动化 Agent 的核心语义。

## 四大核心能力

| 能力 | 最小交付 |
| --- | --- |
| 组织权限 | `members` / `teams` / `roles` + 写前校验，readonly 用户写被拒 |
| Rulesets | `pull_requests` 模拟 PR，2 条规则（审批 ≥ 1、required-check） |
| 审计留痕 | `audit_log` 只追加 + 基础哈希链 |
| Actions | 最小步骤 runner（shell/python/http）-> `workflow_runs` |

## 环境要求

- Python 3.11-3.12

## 快速开始

```bash
python -m venv .venv
# Windows 激活：.venv\Scripts\activate
pip install -r requirements.txt
pip install -e .
python demo/init_seed.py
gx --help
```

## 一键演示

```bash
python demo/run_demo.py
# Windows 也可以双击 demo\run_demo.bat
```

脚本会自动跑通完整链路并生成 `demo/output/trace.jsonl`：
创建成员 -> 创建 PR -> 权限拦截（P001）-> Rulesets 拦截（R001）-> 审批 -> 运行工作流 -> 合并 PR -> 人工干预 -> 校验 trace。

## 使用 CLI 与 Mock Agent

```bash
gx member list
gx pr create --title "demo change"
gx workflow run ci-check
python agent/mock_nl_parser.py "添加成员 bob 为 member"
```

## 已确认决策

- 数据底座：本地 xlsx（不实现 Google Sheets）。
- 交付形态：CLI + Mock Agent（不实现 Streamlit WebUI）。
- GitHub 语义：最小 PR 模拟（不做真实分支/合并）。
- 代码仓库：`gosim-demo-26/`。

## 目录结构

```text
gosim-demo-26/
├── README.md
├── requirements.txt
├── constants.py
├── config.py
├── errors.py
├── FUTURE.md
├── .gitignore
├── docs/
│   ├── README.md
│   ├── specs/
│   ├── plans/
│   └── dev/
├── src/gx/
│   ├── __init__.py
│   ├── __main__.py
│   ├── storage/
│   ├── domain/
│   ├── services/
│   │   ├── perms/
│   │   ├── rules/
│   │   ├── audit/
│   │   └── actions/
│   ├── core/
│   └── api/
├── agent/
├── demo/
│   └── output/
├── tests/
│   ├── unit/
│   └── integration/
└── tools/
```

## 文档

- 项目计划：`docs/plans/`（先读 [docs/plans/00-README.md](docs/plans/00-README.md)）。
- 文档索引：[docs/README.md](docs/README.md)。
