# GX-Sheet：基于电子表格模拟 GitHub 组织管控与自动化 Agent 原型

> GOSIM Create 2026 初赛作品（概念验证原型，非生产级产品）。

## 项目定位

以普通 xlsx 电子表格为唯一持久数据源（Workbook = 组织，Sheet = 资源集，行 = 实体），
用 CLI + Mock Agent 作为交互入口，模拟 GitHub 组织管控与自动化 Agent 的核心语义。

## 初赛提交物

1. **源码仓库**：本仓库（Public）；
2. **生产轨迹**：`demo/output/trace.jsonl`（来自 OBS 录制 demo 那一次运行，禁止用测试/开发轨迹替代）；
3. **Demo 视频**：3-5 分钟完整链路演示。

提交前自检与录制规范见 [docs/plans/07-提交验收与提交物.md](docs/plans/07-提交验收与提交物.md)
与 [docs/plans/09-初赛代码优化与提交保护.md](docs/plans/09-初赛代码优化与提交保护.md)。

## 四大核心能力

| 能力 | 最小交付 |
| --- | --- |
| 组织权限 | `members` / `teams` / `roles` + 写前校验，readonly 用户写被拒 |
| Rulesets | `pull_requests` 模拟 PR，2 条规则（审批 ≥ 1、required-check） |
| 审计留痕 | `audit_log` 只追加 + 基础哈希链 |
| Actions | 最小步骤 runner（shell/python/http）-> `workflow_runs` |

## 环境要求

- Python 3.11-3.14

## 快速开始

```bash
# 1. 创建虚拟环境并安装依赖
python -m venv .venv
# Windows 激活：.venv\Scripts\activate
pip install -r requirements.txt
pip install -e .
# 2. 生成种子工作簿
python demo/init_seed.py
# 3. 体验 CLI
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

## 已知局限（初赛原型）

> 本作品是概念验证原型，以下已知缺陷**刻意不修**——修复会改变 trace 事件，
> 导致已录制的演示视频与轨迹文件对不上。完整清单见
> [docs/dev/limitation.md](docs/dev/limitation.md)。

- 团队权限采用“并集”语义：与 admin 同队的 member 会继承 admin 权限（P001 判定过宽）；
- PR 审批未校验自审批与审批人身份，已合并 PR 可重复合并；
- `required-check` 取全局最新一条工作流运行记录，多 PR 间会串扰；
- 成员/团队允许重名；
- Mock Agent 为字符串匹配原型，非真实语义理解；
- shell/python 工作流步骤可执行任意命令，仅限本地演示。

## 决赛迭代方向

权限引擎改为 `roles` 表驱动、PR 状态机与审批校验、按 PR 关联运行记录、
存储并发与事务、trace 来源字段、Actions 沙箱化、接入真实 LLM Agent。
详见 [FUTURE.md](FUTURE.md) 与 [docs/dev/limitation.md](docs/dev/limitation.md)。

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
