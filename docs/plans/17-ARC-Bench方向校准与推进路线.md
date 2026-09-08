# 17 · ARC-Bench 方向校准与后续推进路线（路线 A）

> 创建：2026-09-08。性质：**纯 docs 的方向文档，不是开工许可**；代码实施必须由后续
> writing-plans 细化并经确认后执行。本文件依据 2026-09-08 对
> [arc-bench.com](http://arc-bench.com/) 与 [create.gosim.org/factory26](https://create.gosim.org/factory26/)
> 的实读快照编写；取代 [16](16-待样例-S2-S3-细化框架.md) 的备查假设，并更新
> [14](14-评审优化第四轮.md) 的 D1/D3 决策。
>
> 决策：用户拍板采用方案 A —— **向比赛真实要求靠拢**：仓库主线切换为
> 「ARC-Bench 参赛 Harness 研发」，GX-Sheet 资产化（语义参考 + 离线夹具），
> 不再作为提交物继续打磨。

## 1. 结论摘要

1. ARC-Bench 的评测对象不是「成品应用」，而是**参赛者上传的智能体**：智能体在统一
   沙箱内把官方需求包编译成可运行 Web 应用，平台用 Playwright 端到端测试验收。
2. 官方赛题 = Task Bank 中 GitHub Collaboration Platform Core Requirements
   （47 条需求，公开测试数为 0）+ Core Requirements for an Online Spreadsheet
   Data Workspace（24 条需求，公开测试数为 0）两套 Web 应用；另有 6req/30tests
   订票 Demo、1req/1test 冒烟 Demo 作为公开样例，可用于先打通验收闭环。
3. 本仓库此前按「成品原型」构建的 GX-Sheet，与平台口径的差距首先是**交付形态**，
   其次是功能范围。GX-Sheet 的角色调整为：语义参考资产 + 本地夹具 + 演示材料，
   不再作为正式提交物。
4. 后续推进顺序：P0 文档校准 → P1 本地 ARC-Bench 验收闭环 → P2 最小可提交
   Agent → P3 官方双题攻分 → P4 提交策略与决赛准备。主代码全部落在 `codex/dev`
   （或新开专项分支），`main` 冻结基线只接收 docs 与已全量验证的合入。

## 2. 权威口径存档（2026-09-08 快照）

### 2.1 赛程与规则（create.gosim.org/factory26）

| 项 | 内容 |
| --- | --- |
| 活动 | 2026 OAIC 智能体软件工厂国际黑客松（GOSIM Create 2026 系列） |
| 研习营 | 9/7–9/20 线上（六讲 + 三场答疑；五条路径：自研 / Octos / HAgency / Claude Code / Codex） |
| 初赛 | 9/21–9/30 线上，ARC-Bench 排行榜实时更新，Top 20 晋级决赛 |
| 决赛 | 10/1–10/7 线上（真实复杂企业需求命题） |
| 颁奖 | 10/17 深圳 GOSIM 大会 |
| 报名 | 已截止（09/07 23:59）；官网显示 371 支队伍 |
| 奖金 | $24,000 共 20 个现金奖（特等 2×$3,000、一等 4×$2,000、二等 6×$1,000、三等 8×$500） |
| 三项指标 | GUI 测试用例通过率 / Token 效率（网关计量的所有模型调用 Token 之和）/ 完成时间（开工到提交墙钟）；权重待公布 |
| 公平底线 | F01 环境规格测试一视同仁；F02 轨迹/日志/种子全落盘可复现；F03 只能改自己的 Harness；F04 可申诉可审计 |
| 模型 | MiniMax / Kimi / GLM / DeepSeek 开源模型 Token，统一网关计量（FAQ 口径） |
| Harness | 无限制：Octos / HAgency / ARC / Claude Code / 自研均可 |
| 提交物 | FAQ 口径：「只需向比赛平台提交智能体，其他材料均不需要」 |

### 2.2 ARC-Bench 评测机制（平台实读）

四步流程：**Upload agent → Compile requirements → Run mixed tasks → Inspect output**。

关键事实：

- 任务=「需求包 + 测试套件」：`requirements/`（`requirements.yaml` 树 + 截图 +
  `testdata.yaml`）+ `tests/`（Playwright `REQ-*.spec.ts`）。任务包可在
  `/playground/arc-bench/web` 逐任务 ZIP 下载。
- 上传入口契约（[API Doc](http://arc-bench.com/api-doc)）：上传包根目录
  `main.py + requirements.txt`（Python）、或 `index.js/index.ts + package.json`
  （Node）；有 `package.json` 时 runner 先装依赖再调用。
- 运行时 SDK `arcbench_agent_runtime`：`AgentRuntime.from_env()`；
  events（`mark_run_started/completed/failed`、`mark_design_done`、
  `mark_implementation_done`、`mark_test_passed/failed`）；traceability
  （`init_db`、`upsert_requirement/scenario/interface/test`、
  `set_test_pass_status`、`upsert_node_state`）；git（`ensure_repo`、
  `commit`、`rollback_last_commit`、`reset_to_commit` 等）。SDK 写
  `.arc/runner-events.jsonl` 与 `.arc/traceability/*.json`，前端据此实时刷新。
- Leaderboard 列：RANK / USER / MODEL / AVG. PASS RATE / TOTAL TOKEN / RUNTIME。
  Competition 页当前「0 available」，预计初赛（9/21）开赛前后上线正式比赛。
- Agent Package 面板：提交需登录；模板下载按钮存在；Playground 模型下拉可见
  `gpt-5.5 / gpt-5.6 / deepseek-v4-flash / deepseek-v4-pro / kimi-k3`
  （与 2.1 FAQ 的开源池口径存在差异，见 D7）。

### 2.3 官方赛题范围

#### Task Bank Web（GOSIM 直接相关）

| ID | 任务 | 需求数 | 测试数 | 说明 |
| --- | --- | --- | --- | --- |
| TASK-002 | GitHub Collaboration Platform Core Requirements | 47 | 0 | 官方 GitHub 复刻题 |
| TASK-003 | Core Requirements for an Online Spreadsheet Data Workspace | 24 | 0 | 官方 Spreadsheets 复刻题 |
| TASK-004 | Train Ticket Booking Demo | 6 | 30 | 公开样例：含 testdata 与可见测试 |
| TASK-001 | Demo（订票冒烟） | 1 | 1 | 公开最小样例 |

GitHub 题模块（47 条，6 大 REQ 组）：

- REQ-1 Identity and Access：注册/登录/邮箱找回（本地固定验证码 `123456`）/
  登出/改密；session 持久化；
- REQ-2 Organization and Governance：组织发现与创建、团队与成员管理（层级、防环、
  原子删除成员及授权）、仓库访问授予；角色 = Read / Triage / Write / Maintain /
  Admin，组织 Owner 自带 Admin；团队成员关系不自动传播权限；
- REQ-3 Repository Asset Management：搜索、创建/Fork/克隆地址展示、公开仓库概览、
  可见性变更（含权限校验）；
- REQ-4 Code and Version Control：文件/目录浏览、commit 历史/差异/代码搜索、
  分支管理（列表/切换/新建/默认分支）、Web 文件管理；
- REQ-5 Work Planning and Issue Management：Issue 列表/详情/创建/编辑/评论、
  assignee/label/milestone、关闭/重开；
- REQ-6 Change Review and Merge Control：分支保护（仅两条规则：≥1 个非作者
  Approve + required check `test` success）、PR 创建/草稿/评审（Approve /
  Comment / Request changes，按 compare commit 判 stale）、合并（仅 create a
  merge commit）、关闭/重开。

题面 ROOT 明确排除：实时协作、**Actions**、Packages、Wiki、project boards、
通知投递、外部 Git 远程协议（这与官网 FAQ「Actions…底座」措辞存在差异，见 D10）。

Spreadsheets 题模块（24 条，5 大 REQ 组）：

- REQ-1 Workbook Access and Lifecycle：查看/打开/新建/重命名、CSV 导入导出；
- REQ-2 Worksheets and Table Structure：增删切换/重命名 worksheet、行列插入删除；
- REQ-3 Cell and Range Editing：单元格/公式栏直编、二维粘贴、区域选择、
  复制剪切粘贴、撤销重做；
- REQ-4 Formula Calculation：基础表达式与聚合函数、相对引用复制、依赖重算、
  错误显示与修复；
- REQ-5 Data Organization and Analysis：按列排序、按值/条件筛选、下拉/数值校验、
  基础透视表的创建与刷新。

#### 公共 Web 基准（练手/复现用，非 GOSIM 必做）

`/playground/arc-bench/web`：6 任务 / 480 测试，含完整需求包 + 可见 Playwright
测试与 ZIP 下载：12306（117 reqs / 134 tests）、ctrip（133 / 126）、prestashop
（86 / 87）、stackoverflow（66 / 67）、bookstack（34 / 34）、keep（32 / 32）。
用途：P1/P2 验证「需求 → 应用 → 测试」闭环、校准生成质量与 token 成本。

官方仓库 [github.com/code-philia/arc-bench](https://github.com/code-philia/ARC)：
含 `arc-bench/webapp/<app>/{requirements,tests,project}`、Playwright runner、
`Dockerfile`；参考实现约定：监听 `PORT`、暴露 `/api/health`、启动时初始化种子数据。
ARC（Agentic Requirement Compiler）为 SJTU/NUS 的官方 baseline 编译器
（git submodule 方式提供）。

### 2.4 旧口径 vs 平台事实

| # | 旧口径（README/01-16） | 平台事实（2026-09-08） | 处理 |
| --- | --- | --- | --- |
| 1 | 提交物 = 源码仓库 + 生产轨迹 + Demo 视频 | 只需提交智能体（Agent 包） | 三件套降级为展示/自检材料；以 17 为准 |
| 2 | 被测形态 = 对「复刻产品」跑 GUI 验收 | 被测对象 = 参赛 Agent 现场生成的应用；验收 = Playwright E2E | D1 更新（见 14 §0.1） |
| 3 | Actions / Cron / env 是必做产品功能（16 S2） | 官方 GitHub 题 ROOT 明确 Actions 在产品范围外 | 16 作废；Actions 转 Harness 侧工具，口径待 D10 复核 |
| 4 | 隐藏验收用例不可得（D3） | 任务包可下载、测试可见（公共基准）或 0 公开（官方两题） | D3 更新；样例归档进 P1 |
| 5 | trace = 8 字段 / 5 种 type 的本地格式 | 平台协议 = `arcbench_agent_runtime` events + traceability 表 | S5/S6 按 SDK 重构，本地格式仅作内部展示 |

## 3. 方向决策：路线 A 与仓库定位

### 3.1 决策 D5（2026-09-08）

**结论：向比赛要求靠拢，采用路线 A——仓库主线 = 参赛 Harness 研发；GX-Sheet 资产化。**

理由：

1. 评分发生点在 ARC-Bench（Agent 现场生成 + Playwright 通过率 / token / 时长）；
   所有能转化成初赛分的投入都应围绕这条链路。
2. GX-Sheet 的四大能力语义（roles 校验、PR 审批、required-check、审计留痕、
   Web 交互）与官方两题需求同源，是稀缺先验，但形态不对——不直接是提交物。
3. 距初赛开赛 13 天、距结束约 22 天，自研完整 Harness + 双产品从零实现不可行；
   正确顺序是先借力现成基线（ARC / Codex / Octos 类）搭通链路，再用资产攻分。

### 3.2 GX-Sheet 资产化映射

| 现有资产 | 现状 | 转型用途 | 处置 |
| --- | --- | --- | --- |
| `src/gx/` ServiceBus + xlsx 8-Sheet 仓储 | 唯一持久源，审计/trace 一体 | 官方两题的后端持久化/数据一致性思路参考；不直接复用 xlsx 模式 | 归档为设计笔记（P3 提炼） |
| 权限引擎（roles 矩阵 + P001） | 组织级角色 | 官方 GitHub REQ-2/3 的 Read/Triage/Write/Maintain/Admin 语义原型（团队不继承、Owner=Admin、删除成员原子清理） | 提炼成「需求→实现要点」提示资产 |
| PR + Rulesets（R001 审批≥1 / required-check、status 开关、按 PR 关联） | 已按 GitHub 语义修复过 | 官方 REQ-6 分支保护/PR 状态机语义高度同源，可平移为 checklist 与测试用例模板 | 资产化（P3） |
| 审计哈希链 + 合规导出 + trace | 工程留痕 | 对应 GOSIM「审计/可复现」精神与平台 traceability 机制；转为 Agent 运行自检与申诉材料 | 工程保障而非产品 UI |
| Actions runner（shell/python/http） | 最小步骤执行 | 官方 GitHub 题 ROOT 排除 Actions；转 Harness 本地 CI/自测工具，待 D10 复核 | 冻结，不继续产品化 |
| Web UI/API（团队/PR 历史/审计导出） | 展示层 | 证明团队可交付浏览器可操作 Web 交互；官方两题 UI 需按题面从零生成 | 演示材料（初赛评审展示仍可用） |
| `demo/` + trace 基线 + 测试矩阵 | 155+ pytest、10 条 trace | 保留为「内部回归资产」与历史提交物口径的展示材料；不作为 ARC-Bench 提交 | 冻结 |
| docs 01–16 | 产品原型阶段计划 | 历史口径保留，顶部加 superseded 标注 | 已同步 |

## 4. 现有能力 vs 官方需求矩阵（定性）

覆盖等级：● 可直接平移 / ◐ 部分借鉴 / ○ 需从零。

| 官方需求 | 现有仓库对应 | 等级 | 用途 |
| --- | --- | --- | --- |
| GitHub REQ-1 账号/会话/找回 | 无认证会话 | ○ | 从零；testdata 固定验证码 `123456` 等细节以官方题面为准 |
| GitHub REQ-2 组织/团队/成员/授权 | teams/members/roles + 校验语义 | ◐ | 角色体系与原子清理规则可平移；需按题目重建模（owner/team 层级/单一直属授权） |
| GitHub REQ-3 仓库资产（搜索/创建/Fork/可见性） | 无仓库模型 | ○ | 从零 |
| GitHub REQ-4 代码/分支/commit/文件 | 无 | ○ | 从零（体量最大） |
| GitHub REQ-5 Issue | PR 表可借鉴编号/状态/详情 | ○ | 从零（编号、状态、评论、标签/里程碑先决数据） |
| GitHub REQ-6 PR 评审/分支保护/合并 | PR 审批/required-check/关闭/历史 | ● | 语义最近；按 REQ-6 补 diff/检查/评审状态机/merge commit |
| Sheets REQ-1..5 工作簿/表格/单元格/公式/透视 | xlsx 读写与行列语义（内部） | ◐ | 后端数据层有借鉴（导入导出、行列增删）；前端网格/公式/透视从零 |
| 审计/可复现 | audit 哈希链 + trace | ●（工程层） | 平台 traceability/申诉材料 |

> 结论：GX-Sheet 不是「缺一个模块」而是「缺一个把需求翻译成上述两个独立 Web
> 应用的过程」；这正是 P1/P2 要建立的 Harness 主链路。

## 5. 后续推进路线

> 每阶段退出标准全绿才进入下一阶段；代码一律走 `codex/dev`（或专项分支），
> `main` 只合入已全量验证的变更。

| 阶段 | 窗口 | 一句话目标 | 退出标准 |
| --- | --- | --- | --- |
| P0 | 09-08 | 方向文档与口径同步（本文件） | 17 落盘；00/docs README、08、14、16 同步；`rg` 锚点命中 |
| P1 | 09-09 ~ 09-12 | 本地复刻 ARC-Bench 验收闭环 | 官方 runner 本地可跑；ticket booking demo 30/30 全绿（用任一手写/生成实现） |
| P2 | 09-12 ~ 09-18 | 最小可提交 Agent 打通平台链路 | Agent 包（main.py+requirements.txt）能读需求包、调 SDK、自测并产生 events/traceability；登录后在 Playground 完成一次试提交 |
| P3 | 09-18 ~ 09-30 | 官方 GitHub/Sheets 双题攻分 | 两题 Playwright 通过率提升循环建立；能力矩阵回填；token/时长预算记录 |
| P4 | 09-30 ~ 10-07 | 提交策略与决赛准备 | 多次提交策略、申诉材料齐备；Top20 内则按决赛命题另立计划 |

### P0 文档校准（2026-09-08，纯 docs）

- 落盘本文件；同步 00 / docs README 索引、08 决策点、14 §0.1、16 作废标注；
- 归档两题需求全文入口（Task Bank 页面 + 下载接口）到本文件 2.3/8；
- 产出能力资产映射（§3.2 / §4），作为后续提示资产草稿。

不做：不改任何代码/种子/trace 基线；不删除历史文档。

### P1 本地 ARC-Bench 验收闭环（9/9–9/12）

- 目录：在仓库外（或 `codex/dev` 下独立子目录，不含 `main`）克隆官方
  `arc-bench` 仓库 runner / Playwright 配置；
- 下载并归档：ticketbooking（6req/30tests）、github（47req）、sheet（24req）、
  keep（32req/32tests，ZIP 已验证可下载，本地临时存档：
  `C:/Users/HW/.codex/visualizations/2026/09/08/01a08176-0423-7170-970e-3ef47a05b787/arc-samples`）；
- 标尺：任一实现（先用最小手写/生成实现即可）让 ticket booking demo
  30/30 全绿，确认「需求 → 应用 → 测试」链路可复现；
- 产出：README 运行命令 + 结果存档（写入 12 存档文件或 17 附录）。

不做：不提前实现官方两题全部需求；不引入运行时第三方依赖进 `main`。

### P2 最小可提交 Agent（9/12–9/18）

- 选基线（D6）：优先试官方 ARC compiler（OpenAI-compatible 网关）或 Codex/Octos
  参考路径的封装；不重复造模型调用层；
- Agent 包结构：`main.py + requirements.txt`；解析 `requirements.yaml` →
  编排实现 → 启动应用 → 本地 Playwright 自测 → SDK 上报（events + traceability +
  git commit）；
- 先以公共基准 keep（或 ticket booking）为目标自测，再 Playground 试提交；
- 产出：可上传的最小 Agent 包 + 一次试提交记录（截图/日志/报告）。

### P3 官方双题攻分（9/18–9/30）

- 把 §3.2 资产做成「需求节点 → 实现要点 → 测试夹具」提示资产与回归矩阵；
- 按官方题面语义逐 REQ 组迭代（先 GitHub REQ-6/REQ-1，再 REQ-4/REQ-5；
  Sheets 先网格+公式，再筛选/校验/透视）；
- 权重公布后固定优化顺序：GUI 通过率 > Token 效率 > 完成时间；记录每次运行
  pass rate / token / 时长；
- 产出：两题通过率自评记录 + token/时长预算表（回填 12 存档）。

### P4 提交策略与决赛准备（9/30–10/7）

- 多次提交策略（正式基线冻结、回滚保护、申诉材料）；沿用 09 的提交纪律精神；
- Top20 晋级后按决赛命题（真实企业需求）另立计划；GX-Sheet 演示材料用于
  研习营/评审展示。

## 6. 决策点（接 14 的 D1–D4）

| # | 决策点 | 选项 | 推荐 | 状态 |
| --- | --- | --- | --- | --- |
| D5 | 参赛主线 | A Harness 优先 + 资产化；B 参考实现主攻；C 双线 | A | **已定（2026-09-08 用户拍板）** |
| D6 | Harness 基线 | 官方 ARC compiler / Codex/Octos 封装 / 自研轻量 | 先 ARC 或 Codex/Octos 借力，P2 试跑后定 | 待定（P2 前） |
| D7 | 正式模型白名单 | 官网 FAQ=开源池；平台面板另有 gpt-5.x | 以登录后 ARC-Bench 提交页为准 | 待核（登录后） |
| D8 | 被测应用技术栈 | 自由（官方参考实现 Node 后端 + 前端 build + `/api/health`） | 跟随官方参考实现同栈起步 | 待定（P1 试跑后） |
| D9 | GX-Sheet 是否作为生成基底 | 直接生成新应用 vs 复用语义 | 不复用其 UI/数据层，语义资产化 | 已定 |
| D10 | Actions/审计 在产品内的口径 | 官方 GitHub 题 ROOT 排除 Actions；FAQ 提「Actions…底座」 | 下载/复核官方 47 条全文与正式比赛说明 | 待核（P1 归档时） |

## 7. 风险与保底

| 风险 | 信号 | 应对 |
| --- | --- | --- |
| ARC-Bench 登录/正式任务未按期开放 | 9/12 仍无法登录或任务不可下载 | 用公共基准 + Task Bank 公开题面推进 P1/P2；正式入口开放后只补提交层 |
| 自研 Harness 工作量失控 | P2 一周未跑通公开任务 | 切换到官方 ARC baseline 或 Codex/Octos 参考实现，仓库只做适配与资产 |
| 官方两题需求体量大（71 条）无法全绿 | P3 首轮通过率 < 30% | 优先保 REQ-1/REQ-6 等确定性高的模块；用 token/时长换取质量并记录取舍 |
| GX-Sheet 历史口径干扰 | 评审/成员仍按三件套准备 | 17 作为唯一新口径；README/00/08 顶部已标注 superseded |
| 权重未公布导致优化顺序错 | 官方公布权重 | P3 决策表按新权重重排（沿用 14 优先级：GUI > Token > 时长） |

## 8. 链接与附件

- 平台：http://arc-bench.com/ （Playground / Competition / Research / API Doc）
- 官网规则：https://create.gosim.org/factory26/
- 官方基准仓库：https://github.com/code-philia/ARC
- Task Bank：http://arc-bench.com/playground/task-bank/web
  （github=…/web/github，sheet=…/web/sheet，demo=…/web/ticketbooking）
- 公共 Web 基准：http://arc-bench.com/playground/arc-bench/web
- 任务 ZIP 示例：http://arc-bench.com/api/benchmarks/tasks/keep/download
- 本地样例临时存档：
  `C:/Users/HW/.codex/visualizations/2026/09/08/01a08176-0423-7170-970e-3ef47a05b787/arc-samples/`
  （keep-task.zip 已下载解包；入库归档决策见 D8/P1）

## 9. 状态（2026-09-08）

| 项 | 状态 |
| --- | --- |
| P0 文档 | 进行中（本文件 + 索引/决策同步） |
| P1 本地验收闭环 | 未开工（样例已备） |
| P2 最小 Agent | 未开工 |
| P3 官方双题 | 未开工 |
| P4 提交策略 | 未开工 |
