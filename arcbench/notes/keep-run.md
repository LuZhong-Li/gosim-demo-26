# P1 keep 参考实现闭环结果

日期：2026-09-09。状态：**本地闭环已跑通，31/32 通过**。

结论：

- 不依赖 Docker：手写最小 keep 应用
  `arcbench/apps/keep/index.html`（localStorage 种子 + 静态交互），
  用官方 Playwright runner 本地跑官方 32 条 keep 测试，**31 条通过**。
- 运行命令（官方 runner 依赖 `npx`，本机无 npm，用本地 Playwright 二进制等价执行）：

```powershell
$env:ARC_APP="keep"; $env:TARGET_URL="http://127.0.0.1:3301"
$env:PLAYWRIGHT_OUTPUT_DIR="test-results/keep"
$env:PLAYWRIGHT_REPORT_DIR="playwright-report/keep"
& "arcbench/upstream/node_modules/.bin/playwright.CMD" test arc-bench/webapp/keep/tests --config playwright.config.ts --workers 1
```

唯一失败：`REQ-2.7.2 Remove label from a note`。原因不是应用逻辑，而是公开 runner
不做 `testdata.yaml` 的按需 fixture 注入：该用例只应包含 `labeled_note`，但本地
一次性灌入全部种子，导致 `Design review`（label=Work）残留，`expectTextAbsent("Work")`
失败。正式 ARC-Bench 平台会按 `requirementBindings` 逐用例注入 fixture。
