# 官方资料整理（Agentic Software Factory Hackathon）

来源：官网 `create.gosim.org/factory26/`、平台仓库、任务元信息。本文件把用户整理的资料
与我们实测确认的事实合并。标 ✅ = 我们本地/平台验证过；标 ❓ = 仅二手来源，尚未验证。

## 一、核心事实

| 项目 | 值 | 状态 |
|---|---|---|
| 竞赛 id | `hackathon` | ✅ 平台路由 `/competitions/hackathon` 实测 |
| 任务 TASK-011 | `hackathon--github`（GitHub 协作平台），100 用例 | ✅ |
| 任务 TASK-012 | `hackathon--sheet`（在线电子表格），100 用例 | ✅ |
| 合计 | 200 用例（历史页显示 `test pass (x/200)`） | ✅ |
| 阶段套件 | `hackathon--github-stage-1/2/3`，REQ 1-2 / 3-4 / 5-6 | ✅ 平台任务页实测 |
| 计分 | 原题与阶段路线取较高分；只取最新提交下最好的一次 run | ✅ 历史页原文 |
| 初赛截止 | 2026-10-03 23:59（延期后） | ❓ |
| 时间窗 | 大赛 2026-09-01 ~ 10-17；大奖赛 10.1-10.7；10.17 深圳 GOSIM 颁奖 | ❓ |

## 二、提交与产物约束

1. 入口：Python `main.py + requirements.txt`（我们走这条）或 JS/TS。
2. 必须使用 SDK `arcbench_agent_runtime`（Python 包）。
   ✅ 我们的包内 vendored 了该 SDK，`main.py:39` 直接
   `from arcbench_agent_runtime import AgentRuntime`。
3. **可追溯产物**（评审"Harness 工程 / 软件可维护性"两项的数据源）：
   - `.arc/runner-events.jsonl` —— `arcbench_agent_runtime/context.py:8` 的默认路径；
   - `.arc/traceability/*.json` —— `context.py:9` 的默认目录，`ensure_parent_dirs()`
     会创建。
   ✅ 平台 run 页 `Run Status` 会显示 `Traceability initialized with N requirements and
   M scenarios`（r68 日志里 Stage-1 是 18/30），说明这批产物被平台收到了。
4. 公平约束：只能改自己的 harness，不能改平台测试套件 / 网关 / 评分逻辑。

## 三、参考仓库与端点（价值分级）

| 资源 | 价值 |
|---|---|
| `code-philia/arc-bench-website` | ⚠️ 只有竞赛配置与任务元信息，**不含私有 Playwright spec** |
| `code-philia/arc-bench` | 评测平台主仓库（容器调度、run 生命周期、网关、计分） |
| `octos-org/arc-adapter` | ✅ 官方参考 Adapter（**不是** github/sheet 的业务实现，不能抄页面/接口） |
| `XIAOMIQ772/hacksonproject` | Python starter agent 模板，架构参考 |
| `arc-bench-tutorial.vercel.app/skill.md` | 通用教程，无赛题业务细节 |
| `GET https://api.arc-bench.com/v1/competitions/hackathon` | ✅ 可本地读任务元信息；`/tasks/<slug>` 匿名 404，需要会话 |

> 结论（与前几轮诊断一致）：拿不到私有 spec 源码，只能靠需求原文的
> GIVEN/WHEN/THEN + 精确可访问名反推。我们手上的权威资料是
> `arcbench/requirements/hackathon--*/requirements.yaml`、
> `arcbench/requirements/hackathon--github/reference/*.png`（官方截图）
> 以及平台任务页正文（已落盘 `arcbench/runs/_stage1_task_page.txt`）。

## 四、与风险清单的关联

1. 内存存储（`gh_store.js` / `sheet_store.js`）重启丢种子 → 直接拉低 GUI 通过率，
   属应用业务缺陷，r70+ 处理。
2. harness 侧：每轮打包都要确认 `arcbench_agent_runtime` 在包里、跑起来会产出
   `.arc/runner-events.jsonl` 与 `.arc/traceability/*.json` —— 见
   `checklist-r70-packaging.md`。
3. Sheet：`templates/sheet` 前后端脚手架已完成，根因（错误 fallback 到 GitHub 脚手架）
   已消除。

## 五、规则备忘

- 初赛 TOP20 进大奖赛（10.1-10.7 线上）；前 3 名受邀 10.17 深圳 GOSIM 现场 Demo。
- 交付物：可运行 Agent、完整生产轨迹（prompts / 工具调用 / 迭代 / 人工干预）、
  3–5 分钟 Demo 视频。
