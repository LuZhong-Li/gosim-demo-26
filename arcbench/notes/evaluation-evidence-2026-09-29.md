# ARC-Bench 官方评测 0% 证据整理（2026-09-29）

## 一句话结论

连续四次官方提交（r14 / r14-fixed / r15 / r16）全部是 **0.00 分 / 0.0% 通过 / 约 1s / 0 token / ¥0**，
且运行页 Stdout 在“后端启动”之后没有任何 Playwright 输出。用官方同一评测命令在本地对同一应用跑
Playwright，**12/12 全过并输出完整日志**。因此 0% 的原因在**平台评测侧没有真正执行测试套件**，
而不是本仓库生成的应用答不对。

## E1 · 官方评测契约（来自 code-philia/arc-bench 复刻仓库 arcbench/upstream）

| 项 | 官方定义 |
| --- | --- |
| 测试文件位置 | `arc-bench/webapp/<app>/tests/REQ-*.spec.ts`（`apps.config.json` 的 `testDir`） |
| Playwright 配置 | harness 根目录 `playwright.config.ts`（chromium 项目、list reporter、`baseURL = $TARGET_URL`，默认 `http://127.0.0.1:3301`） |
| 评测触发命令 | `npm run test -- --app <name>` → `node scripts/run-playwright.js --app <name>` → `npx playwright test <testDir> --config playwright.config.ts` |
| 关键环境变量 | `TARGET_URL`、`PLAYWRIGHT_OUTPUT_DIR`、`PLAYWRIGHT_REPORT_DIR` |

本仓库调用形态与官方一致：`main.py` 自测同样执行
`node <ARC_PLAYWRIGHT_CLI> test <tests_dir> --config <config>`，并设置 `TARGET_URL`。

## E2 · 本地复刻官方命令：12/12 通过，日志完整

- 应用：本仓库 GitHub 模板（与提交包内一致），前端 dist 构建后由后端托管；
- 端口：`TARGET_URL=http://127.0.0.1:3301`（官方默认端口）；
- 命令（原样）：`node node_modules/@playwright/test/cli.js test arc-bench/webapp/github/tests --config playwright.config.ts --workers 1 --reporter list`；
- 结果：**12 passed（17.9s）**，list 日志逐条输出 `ok N ...`；
- 原始日志：`arcbench/notes/evidence/local-official-shape-12passed.log`（2026-09-29 生成）。

复刻时的注意点：把我们的 gh-batchA spec 放进官方布局 `arc-bench/webapp/github/tests/REQ-batchA.spec.ts`，
并把 spec 内的 base URL 指向 3301（官方配置只提供 `TARGET_URL`，不覆盖 spec 里硬编码的地址）。
第一次复刻曾因 spec 硬编码 3002 误连到旧实例导致偶发 11/12，修正后稳定 12/12。

## E3 · 平台四次提交的结果（均 0.00 / 0.0% / ~1s / 0 token）

| 提交 | GitHub run | Sheet run | 得分 | 通过率 | 时长 | Token | 成本 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| arc-agent-r14 | e42e0c085b89 | cf5bf1fe4be3 | 0.00 | 0.0% | 1s / 0s | 0 | ¥0 |
| arc-agent-r14-fixed | cd0e85c9ad84 | ec37083a6e8e | 0.00 | 0.0% | — | 0 | ¥0 |
| arc-agent-r15 | da8e7531667c | ceec9ef57284 | 0.00 | 0.0% | 1s / 0s | 0 | ¥0 |
| arc-agent-r16 | 443e0bacf2f4 | b7511d28f837 | 0.00 | 0.0% | 1s / 1s | 0 | ¥0 |

排行榜上 LiMengYuan 唯一条目仍是 2026-09-28 12:59:19 的 0.00，之后没有任何新分数入榜。

## E4 · 平台 Stdout 止于后端启动，无任何 Playwright 输出

GitHub run（r14、r15、r16）Stdout 统一是：

```
frontend npm install/build OK
backend npm install OK
Backend listening at http://127.0.0.1:3000
```

之后**没有任何** `[chromium] › ...` 测试输出。这与最早的 r12 平台日志
`No Playwright tests found; skipping test execution` 完全同模式——评测 runner 在该任务
tests 目录里没有找到可执行用例，于是直接判 0%。

## E5 · 平台侧构建/启动均成功，排除应用自身问题

- 前端 `vite build`：✓ 99 modules transformed（r16：✓ built in 2.62s）；
- 后端：依赖安装成功，`Backend listening at http://127.0.0.1:3000`；
- 本地同应用：官方命令 12/12 通过。说明应用可构建、可启动、可通过真实 Playwright 测试。

## 建议

1. 把本文件 + `local-official-shape-12passed.log` 提交给主办方，请其核对
   hackathon（TASK-001/002）测试套件是否已挂到评测 runner 的 tests 目录；
2. 平台侧如确认测试已挂载，我们再用 r16 复跑一次验证；
3. 在此之前继续改代码无法改变 0% 的现状（评测没有执行测试）。
