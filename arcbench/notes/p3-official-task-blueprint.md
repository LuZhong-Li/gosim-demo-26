# P3 官方两题拆解与生成资产蓝图

日期：2026-09-09。性质：**方向/资产规划，不含生成逻辑实现**。

依据：`arcbench/data/requirements/{github,sheet}.json`（`requirements_yaml` 解析），
以及 GX-Sheet 现有源码/文档。需求树可由
[analyze_requirements.py](analyze_requirements.py) 复现。

## 1. 官方任务清单

### 1.1 GitHub Collaboration Platform（6 模块 / 47 原子）

| 模块 | 原子数 | 覆盖能力 |
| --- | --- | --- |
| REQ-1 Identity and Access | 5 | 注册/登录/找回（固定码 `123456`）/登出/改密，session 持久化 |
| REQ-2 Organization and Governance | 7 | 组织创建/发现、团队层级、成员增删、仓库访问授予 |
| REQ-3 Repository Asset Management | 6 | 仓库搜索/创建/Fork/克隆地址/概览/可见性 |
| REQ-4 Code and Version Control | 8 | 文件浏览、commit 历史/差异/代码搜索、分支管理、Web 文件管理 |
| REQ-5 Work Planning and Issue Management | 9 | Issue 列表/详情/创建/编辑/评论、assignee/label/milestone、关闭重开 |
| REQ-6 Change Review and Merge Control | 12 | 分支保护、PR 创建/草稿、评审/评论、合并/关闭重开 |

### 1.2 Online Spreadsheet Data Workspace（5 模块 / 24 原子）

| 模块 | 原子数 | 覆盖能力 |
| --- | --- | --- |
| REQ-1 Workbook Access and Lifecycle | 5 | 打开/新建/重命名工作簿、CSV 导入导出 |
| REQ-2 Worksheets and Table Structure | 6 | 工作表增删切换/重命名、行列插入删除 |
| REQ-3 Cell and Range Editing | 5 | 网格/公式栏直编、二维粘贴、区域选择、复制剪切粘贴、撤销重做 |
| REQ-4 Formula Calculation | 4 | 表达式与聚合函数、相对引用复制、依赖重算、错误修复 |
| REQ-5 Data Organization and Analysis | 4 | 排序、筛选、下拉/数值校验、基础透视表 |

## 2. GX-Sheet 能力映射（资产复用度）

覆盖等级：● 可直接平移 / ◐ 部分借鉴 / ○ 需从零。

| 官方需求 | GX-Sheet 现有资产 | 等级 | 可复用点 |
| --- | --- | --- | --- |
| GitHub REQ-1 账号/会话 | 无认证 | ○ | 复用其错误码/审计思想，账号与会话从零 |
| GitHub REQ-2 组织/团队/成员/授权 | `members/teams/roles` + P001 + 审计 | ◐ | 角色校验、防提权、原子清理、团队不继承权限等语义可平移；需补 org/team 层级与 repo 级 Read/Triage/Write/Maintain/Admin |
| GitHub REQ-3 仓库资产 | `pull_requests` 仅模拟容器 | ○ | 复用“编号 + 状态 + 可见性”概念，仓库/Fork/搜索从零 |
| GitHub REQ-4 代码/分支/commit/文件 | 无 | ○ | 从零（体量最大） |
| GitHub REQ-5 Issue | PR 编号/状态/详情可借鉴 | ○ | 复用编号、状态流、时间线/历史、评论留痕思路 |
| GitHub REQ-6 PR 评审/分支保护/合并 | PR 审批/R001/关闭/历史 | ● | 最近：approve 非作者、required-check、按 PR 关联、merge 拦截；需补 diff、draft、评审状态机、stale、merge commit |
| Sheet REQ-1/REQ-2 工作簿/工作表 | xlsx 仓储 + openpyxl | ◐ | 后端可用“工作簿/工作表/行/列”抽象，CSV 导入导出可复用 openpyxl；前端网格与首页从零 |
| Sheet REQ-3 单元格/区域 | xlsx 单元格读写 | ◐ | 单元格值读写可借鉴；网格编辑器/公式栏/粘贴/撤销从零 |
| Sheet REQ-4 公式 | 无公式引擎 | ○ | 从零 |
| Sheet REQ-5 排序/筛选/校验/透视 | 无 | ○ | 从零 |
| 跨题工程保障 | 审计哈希链 + trace + Web JSON API | ● | 对应平台 traceability/申诉材料；Web 分层可作两题后端骨架 |

> 结论：GX-Sheet 最直接的价值集中在 **GitHub REQ-2 与 REQ-6**，以及
> **Sheet 的存储/CSV 语义**；其余模块是生成式 Agent 要补齐的主体。

## 3. 生成资产蓝图（下一步创建，非本轮实现）

建议在 `arcbench/agent/` 之外新增 `arcbench/assets/`，按题拆成
`github/` 与 `sheet/` 两套，供后续 P3 生成器消费。

### 3.1 需求映射表（JSON）

- `assets/github/requirement-map.json`：每条原子节点 → `{module, title,
  dependencies, seed_hint, implementation_notes, acceptance_summary}`。
- `assets/sheet/requirement-map.json`：同上。

来源：`requirements.yaml` 的 `description` + `scenarios`（GIVEN/WHEN/THEN）。

### 3.2 提示资产（Markdown）

- `assets/github/prompts/01-domain.md`：对象/权限矩阵/状态机（账号、组织、
  团队、仓库、分支、commit、Issue、PR、review、milestone）。
- `assets/github/prompts/02-ui-routes.md`：页面/路由/可访问名称清单。
- `assets/sheet/prompts/01-data-model.md`：工作簿/工作表/单元格/公式依赖图。
- `assets/sheet/prompts/02-ui-grid.md`：网格、公式栏、行列菜单、筛选、透视。

### 3.3 种子数据策略

- 平台会按 `testdata.yaml` 的 `requirementBindings` 逐用例注入 fixture；
  生成器不应把“全部 fixture 一次性灌入”当作最终策略（本地 keep 31/32 的
  REQ-2.7.2 失败即由此产生）。
- 两题的参考实现约定：启动时初始化需求所需的**默认种子**，并暴露入口 URL；
  逐用例 fixture 由平台注入。生成器模板只需覆盖“全局 baseline + 默认产品记录”，
  不要把 per-test 数据硬编码进应用。

### 3.4 应用骨架（后续才写）

- `assets/github/template/`：前端 SPA 路由 + 后端 REST + 数据模型；模块化到
  REQ-1..REQ-6 可增量生成。
- `assets/sheet/template/`：网格编辑器前端 + 后端单元格/公式接口。

## 4. 关键决策与风险

| # | 决策点 | 现状 | 建议 |
| --- | --- | --- | --- |
| P3-D1 | GitHub 代码版本控制实现方式 | GX-Sheet 无真实 git | 应用内模拟 commit/branch/diff（数据库存储），不接外部 git 协议 |
| P3-D2 | Sheet 公式引擎 | 无 | 先用极简表达式解析 + 依赖重算，覆盖官方 4 条原子需求 |
| P3-D3 | 两题技术栈 | 官方参考实现用 Node 后端 + 前端 build | 跟随 Node/TypeScript 或 Python + 静态前端，待 P2 试提交后定 |
| P3-D4 | 是否复用 GX-Sheet xlsx 后端 | 数据层可用 | 只借语义/CSV，不复用 xlsx 唯一数据源（网格高频编辑不适合） |
| P3-D5 | 逐用例 fixture 注入 | 公开 runner 不注入 | 生成器依赖平台注入；本地自测明确标记 fixture 相关用例 |

## 5. 状态（2026-09-09）

| 项 | 状态 |
| --- | --- |
| 需求树拆解脚本 | 已提交（analyze_requirements.py） |
| 两题能力映射 | 已提交（本文件） |
| 生成资产 JSON/提示 | 未开工（下一轮） |
| 应用模板骨架 | 未开工（后续） |
