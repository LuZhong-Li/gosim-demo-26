# arcbench/notes/evidence —— 证据索引

这里放**能被别人复核的一手材料**（报告、截图、原始统计），而不是结论。
结论写在 `../milestone-r68.md` / `../run-log-2026-10-01.md` / 上级 `../../HANDOVER.md`。

## 目录里有什么

| 文件 | 是什么 | 来源 |
|---|---|---|
| `official-report-digest-a128c4309297.md` | **官方 Playwright 报告摘要（GitHub 原题，100 条）** | `arcbench/downloads/agent-packages/a128c4309297-template.zip` → `template/.arc/playwright-report.json` |
| `r30-submission.png` | 平台提交页截图（早期，用于核对提交流程） | 手工截取 |

## 怎么复现（任何一份官方报告）

```powershell
$py = "C:\Users\HW\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

# 1) 解压 run/提交产物 zip（来源：平台「Download code」或 run 页的 project.zip）
Expand-Archive "<runid>-template.zip" -DestinationPath "<dir>" -Force

# 2) 报告在 template/ 子目录下，不在 zip 根
& $py arcbench\runs\_report_digest.py "<dir>\template\.arc\playwright-report.json"
```

输出即"统计 + 状态分布 + 错误指纹 + 逐条失败"，可直接粘进笔记。

> **位置提醒**：报告**不在** run 页的 File 树根、也**不在** stdout 里。
> 它在产物 zip 的 `template/.arc/playwright-report.json`。早前"平台不给逐条结果"的结论就是
> 因为只翻了 File 树和 stdout、没解 zip —— 这条错误结论让 r79–r83 四轮都在盲修。

## 两份官方报告的对照（截至 2026-10-03）

| 报告 | 规模 | 统计 | 直接原因 |
|---|---|---|---|
| `a128c4309297`（GitHub 原题） | **100 条**（REQ-1…REQ-6 全覆盖） | `expected=0 / unexpected=100`；`timedOut 73` / `failed 27` | `frontend/src/App.tsx` 只有 **286 字节** —— `stub_unparseable_sources` 写的占位组件；同工程 25 个生成页面**一个都挂不上** |
| r72 Stage-2 | **29 条** | `expected=0 / unexpected=29` | `App.tsx` 是**能跑**的**扁平 kebab 路由表**，缺 `/:owner/:name`、`/:owner/:name/search`、`/orgs/:name/teams/:team` 等参数化路由；17 条 searchbox `Search` 超时 + 9 条找不到 `acme-docs` |

**这是两个不同的 0 分机制**：一个"入口被替换掉了"，一个"入口还在但路由表是扁平的"。
因此守卫要两档都覆盖 —— r85 只做入口恢复（且只覆盖第一种的一半），
r86 做"入口 + 它渲染的脚手架页面"恢复（两档都覆盖入口侧与页面侧）。

### 守卫在真实产物上的端到端验证（r86，不是夹具）

把 **`a128c4309297` 那份真实工程**（286 字节占位入口）喂给 r86 的守卫，实测：

| 步骤 | 结果 |
|---|---|
| 恢复前的入口含几条要求路由 | **0/5** |
| `restore_entry_route_contract` 是否触发 | **触发**（2 个 change group） |
| 恢复内容 | `App.tsx` 路由契约 + **11 个页面**（`api/index.ts`、`AuthPage`、`ComparePage`、`HomePage`、`OrgPage`、`OrgsPage` …） |
| 恢复后参数化路由 | **5/5** |
| `HomePage` | 换回脚手架版，**`aria-label="Search"` 在场** → 17 条 searchbox 超时的前提被消除 |
| 之后 `ensure_app_router` 再写入 16 条生成页面路由后 | 参数化路由 **仍 5/5 存活**（这条专门断言，因为"被后续 pass 静默冲掉"是最容易漏的回退） |

> 这条是"**结论不是从夹具推出来的**"的凭据：夹具不在时探针会 SKIP 并说明，不会假装通过。
> 对应提交 `9fca758`（拒绝诊断是 `a86d0eb`）。

## 判读阶梯（r85 出分后按这个走）

`Select-String -Path arcbench\runs\_r85_*_stdout.txt -Pattern 'entry route contract'`

| 看到 | 含义 | 下一步 |
|---|---|---|
| `restored pages the entry renders:` | 入口与页面都救回来了 | 若仍 0 → 瓶颈在别处（P9 / 控件名），看 json 定夺 |
| `entry route contract:`（无 `restored pages`） | 入口救了，页面本来就是脚手架版 | 同上 |
| `entry route contract (no change): … NOT restored because …` | **恢复被拒**，且点名了缺失模块 | 直接去补那些模块，不必重打一轮 |
