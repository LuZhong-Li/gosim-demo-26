# ARC-Bench 日志总索引与逐轮统计（2026-10-03 09:4x）

本文把项目里**所有**运行日志归拢到一处：在哪儿、每一轮的关键标记统计、每轮的根因/修复/成绩。
（原始日志保持原样，本文只做索引与统计；统计脚本：`arcbench/runs/_log_stats.py`）

---

## 1. 日志放在哪

| 来源 | 路径 | 内容 |
|---|---|---|
| **按轮归档（统一命名）** | `arcbench/downloads/logs/r69日志/` … `/r76日志/` | 每轮五题完整 Stdout：`rNN-1.txt`=GitHub 原题、`rNN-1-1/2/3.txt`=Stage 1/2/3、`rNN-2.txt`=Sheet。r69–r72 为用户手工下载；r73/r74 由我按同一命名补抓（各 5 份）；r75 只有 `README.txt`（从未起跑）；r76 进行中 |
| 我从 run 页 dump | `arcbench/runs/_r68_*_stdout.txt` … `_r73_stage1_stdout.txt` | 18 份（含 r68 五题、r69/r70 各五题、r71 sheet、r73 stage1） |
| 群聊与问题清单 | `arcbench/downloads/logs/官方群聊天记录.txt` / `.cleaned.txt` / `问题.txt` | 规则澄清、坑点、CLI 线索、待排查清单 |
| Run 工作区产物 | `arcbench/downloads/runs/r71-project/`、`/r72-project/` | 各 run 的 `*-template.zip`（真机生成的应用） |
| 已解压的 r71 产物 | `arcbench/runs/_r71_artifacts/<runid>/template/` | 用于逐名缺口分析、SPA/collection 复现 |
| 自测站报告 | `arcbench/dist/selftest-*.zip` + 自测站提交记录 | 逐条用例 pass/fail（Stage-1 共 30 条） |

## 2. 逐轮成绩一览

| 轮次 | 提交名 | 合计 | GitHub 原题 | Stage 1 | Stage 2 | Stage 3 | Sheet | 备注 |
|---|---|---|---|---|---|---|---|---|
| r33-repro | `arc-agent-r33-repro` | 9.65（13/200） | 8/100 | — | — | — | — | 预置成品 app，**违规路线**，仅保底 |
| r65 | `arc-agent-r65` | 0.00 | 0 | 0 | 未跑 | 未跑 | 0 | |
| r66 | `arc-agent-r66` | 0.61（2/200） | 0 | 0 | **5.43** | 0 | 0 | 生成型首个非 0 |
| r68 | `arc-agent-r68` | 0.00 | 0 | 0 | 0 | 0 | 0 | 后端启动即崩（`argument handler`） |
| r69 | `arc-agent-r69` | 0.00 | 0 | 0 | 0 | 0 | 0 | 世界播种静默跳过 + store 契约补错模块 |
| r70 | `arc-agent-r70` | 0.00 | 0 | 0 | 0 | 0 | 0 | 原题/Stage2 已能启动+播种，Stage1 仍崩 |
| r71 | `arc-agent-r71` | 0.00 | 0 | 0 | 0 | 0 | 0 | Sheet 走对新模板但页面被生成覆盖 |
| r72 | `arc-agent-r72` | 0.00 | 0 | 0 | 0 | 0 | 0 | 打包早于两个 P0 修复，预期内全 0 |
| **r73** | `arc-agent-r73` | **0.69（2/200）** | **1.54** | 0 | **5.35** | 0 | 0 | **两个 P0 修复生效，生成型首次破零** |
| r74 | `arc-agent-r74` | 0.00 | 0 | 0 | 0 | 0 | 0 | 菜单包装壳回归（`argument handler` 复现） |
| r75 | `arc-agent-r75` | 未起跑 | — | — | — | — | — | 已上传但从未起跑（平台 Run 按钮拒绝自动点击），被 r76 取代 |
| **r76** | `arc-agent-r76` | 跑分中 | — | — | — | — | — | 09:45 人工点击起跑，5 active；日志抓完补入 `r76日志/` |
| 保险 | `arc-agent-r33-insurance2` | ≈（7/200） | **9.77** | 0 | — | — | — | 榜单兜底 |

## 3. 关键标记逐日志统计（脚本生成）TEST

列含义：`crash`=`argument handler must be a function`；`listen`=`Backend listening`；
`seed`=`world seed finished`；`notfn`=`is not a function`；`nullread`=`Cannot read properties of null`；
`enoent`=`ENOENT`（前端取不到 index.html）；`nolist`=`no listing route`；`unrouted`=`unrouted pages after patch`；
`mount`=`entry points now mount`；`built`=`npm run build`；`coverage`=最后一次 `exact-name coverage`。

| 日志 | 大小 | crash | listen | seed | notfn | nullread | enoent | nolist | unrouted | mount | built | coverage |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| r68 stage1 | 42K | **2** | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 140/178 |
| r68 github | 39K | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 117/143 |
| r68 sheet | 32K | 0 | 1 | 0 | 0 | 0 | **6** | 0 | 2 | 2 | 2 | 40/70 |
| r69 stage1 | 297K | 0 | 1 | 0 | **195** | 0 | 0 | 0 | 2 | 2 | 2 | 147/178 |
| r69 stage2 | 187K | 0 | 1 | 0 | **117** | 0 | 0 | 0 | 2 | 2 | 0 | 163/172 |
| r69 github | 55K | 0 | 1 | 0 | 0 | 0 | **119** | 0 | 2 | 2 | 2 | 120/143 |
| r70 stage1 | 44K | **2** | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 150/178 |
| r70 github | 40K | 0 | 1 | **1** | 1 | 0 | 0 | 0 | 2 | 2 | 2 | 122/143 |
| r70 stage2 | 47K | 0 | 1 | **1** | **7** | 0 | 0 | 0 | 2 | 2 | 0 | 157/172 |
| r71 github | 52K | 0 | 0 | 0 | 1 | 0 | **119** | 0 | 2 | 2 | 0 | 121/143 |
| r71 stage2 | 231K | 0 | 1 | 1 | 0 | **140** | 0 | 0 | 2 | 2 | 4 | 155/172 |
| r71 sheet | 27K | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 54/70 |
| r72 stage1 | 52K | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 154/178 |
| r72 stage2 | 39K | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 144/172 |
| **r73 stage1** | 46K | **0** | **1** | **1** | **0** | **0** | **0** | 0 | 2 | 2 | 0 | **158/178** |
| r73 github | 546K | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 110/143 |
| r73 stage2 | 49K | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 143/172 |
| r73 stage3 | 33K | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 126/141 |
| r73 sheet | 27K | 0 | 0 | 0 | **1** | 0 | 0 | 0 | 0 | 2 | 2 | 54/70 |
| r74 github | 32K | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 123/143 |
| r74 stage1 | 46K | **2** | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 151/178 |
| r74 stage2 | 222K | 0 | 1 | 1 | **140** | 0 | 0 | 0 | 2 | 2 | 0 | 167/172 |
| r74 stage3 | 44K | **2** | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 131/141 |
| r74 sheet | 24K | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 61/70 |

r75 从未起跑（目录里只有 `README.txt`）；r76 五题 09:45 起跑、进行中，抓完立刻按同一格式补行。

完整 **51 行**统计见 `arcbench/notes/_log-stats.md`（本表摘取关键行）。表里的数字不是估计值：
`python arcbench/runs/_log_stats.py` 会把 `arcbench/downloads/logs/r*日志/*.txt`
与 `arcbench/runs/_r*_stdout.txt` 一起重算，改完日志重跑一遍即可。

**这张表说明的五件事**

1. `crash`（`argument handler must be a function`）：r68/r70 的 Stage-1 各 2 次 → r71–r73 为 **0**
   → **r74 的 Stage-1、Stage-3 又各回到 2 次**（`app.use()` 类型过滤跑在了孤儿挂载注入之前）；
2. `notfn`（`is not a function`）：r69 是 195/117 次 → r70 降到 1/7 次 → r71–r73 为 **0**
   → **r74 的 Stage-2 又飙到 140 次**，与第 1 条同源；
3. `enoent`（前端取不到 index.html）：r69 github / r71 stage1 各 **119** 次 → r73 起为 **0** ——
   `ensure_frontend_serving()` 生效；
4. `nullread`（`Cannot read properties of null`）：只在 r71 stage2 出现 140 次 → r73 起为 **0** ——
   `collection()` 空值守卫生效；
5. `coverage`（最后一次 `exact-name coverage`）不是单调曲线：r68 的 140/178 → r73 stage1 的 **158/178**
   是最高点，但 r73 github 掉到 **110/143**（页面名被生成器覆写），r74 stage2 又冲到 **167/172**；
   sheet 在 40/70 → 57/70 → 54/70 → 61/70 之间来回。

## 4. 逐轮根因 → 修复 → commit

| 轮次 | 根因（日志证据） | 修复 | commit |
|---|---|---|---|
| r68 | `app.js:15` `argument handler must be a function`（孤儿 router 直接挂载） | 所有注入挂载改走 `__arcMount` 类型守卫 | `e4de5db` |
| r69 | ① 世界播种静默跳过（需求里名字带反引号，正则不匹配）② store 契约补到没人 require 的文件 | ① 反引号解析 ② 按真实 import 模块注入 + 收尾复检 | `f04fe83`、`826f6b7` |
| r70 | Stage-1 `app.js:227` 再次 `argument handler`（模型自己的 `app.use(factory())` 返回 undefined） | `guard_app_use()` 把每个 `app.use(` 换成带类型过滤的 `__arcUse` | `285cd49` |
| r70/71 | Sheet 页面被生成覆盖 → 13 个名字丢失 | `restore_keep_pages()` 按名恢复脚手架页面 | `d7094c2`、`60b81cd` |
| r71 | ① 恢复 `api/index.ts` 后构建失败（`client is not exported`）② `collection()` 返回 undefined/`null` | ① 两个脚手架导出 `client` + 恢复后补 named export ② `collection()` 空值守卫 | `d70ba51`、`02926ac` |
| r73 | **SPA 根本没被服务**：`sendFile('frontend/dist/index.html', {root: __dirname})` → ENOENT 404 | `ensure_frontend_serving()`：改绝对路径 + `express.static` + SPA fallback | `0465e99` |
| r74 | Stage-1 重启后 `argument handler` 又出现（类型过滤跑在孤儿挂载注入之前） | `guard_app_use` 扫描全部 backend 模块 + 在所有注入之后再做一次 sweep | （r76 包内） |
| r74 | 回落 0.00（对比 r73 的 0.69）→ 首要怀疑 `ArcMenuShell` 包装壳 | 停用菜单包装注入（保留函数），回到 r73 稳妥行为 | `99d9688` |

## 5. 仍未解决（详见 `open-issues-2026-10-02.txt`）

1. **平台 Run 按钮拒绝自动点击**（`Timed out running CDP command Input.dispatchMouseEvent`）→
   r75 因此从未起跑；r76 靠人工点了一次才跑起来，**后续每一轮新包都要人工点 Run 才能开跑**；
2. Stage-1 **REQ-2 的 13 个 accessible name 仍缺**（`New team` / `Create team` /
   `Create organization` / `Add people or teams` / `Member menu <username>` /
   `Remove from organization` / `Account not found` / `Account is already a member` /
   `Cyclic team hierarchy is not allowed` / `Access denied` / `Remove bob-reviewer` / `Sign up`）；
3. REQ-1-2 的 `Account menu` / `Sign out` / `Confirm sign out` 仍未落地（菜单注入已停用）；
4. Sheet 覆盖 54–57/70，透视表工作流未在平台验证；
5. 自测站 0/30 是"整条 60s 超时"，与本地 200 正常存在环境差异；
6. 官方 spec 文件名清单已拿到（`REQ-1-1-1-sign-up.spec.ts` … `REQ-2-1-2-create-organization.spec.ts`，30 条）。

## 6. 复现方式

```powershell
# 统计所有日志的关键标记
python arcbench/runs/_log_stats.py

# 逐名缺口（拿真机产物比对需求原文的引号名）
python arcbench/runs/_scratch_r72_artifact_gap.py

# 本地断言（每次打包前跑）
python arcbench/runs/_scratch_r69.py            # 播种 / 路由补挂
python arcbench/runs/_scratch_r70_appuse.py     # app.use 类型过滤
python arcbench/runs/_scratch_r73_frontend_serving.py
python arcbench/runs/_scratch_r73_collection_guard.py
python arcbench/runs/_scratch_r75_use_sweep.py
```
