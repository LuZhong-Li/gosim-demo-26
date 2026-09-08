# P1 阻塞清单

## 2026-09-08

### B1 Docker 不可用（Task 3 Track A 被阻塞）

- 现象：`docker --version` 提示命令不存在。
- 影响：官方 `npm run docker:build` 与 `npm run reference:keep` 无法执行；
  upstream 仓库内 `arc-bench/webapp/keep/` 只有 `requirements/` 与 `tests/`，
  未内置参考实现 `project/`，`agentic-requirement-compiler` 子模块也未初始化。
- 可选出路：
  1. 安装 Docker Desktop / Docker Engine 后重跑 Task 3；
  2. 用 LLM/Codex 先生成一个最小 keep 应用（提前进入 P2 的生成能力），
     再 `pnpm run test -- --app keep --target-url http://127.0.0.1:3301` 跑分；
  3. 等 ARC-Bench 登录开放后走 Task 4（Agent Template / 平台沙箱）。

### B2 ARC-Bench 登录未开放（Task 4 Track B 被阻塞）

- 现象：Task 4 需要登录后下载 Agent Template 与任务包；当前无账号凭证/开放通知。
- 影响：ticketbooking 30/30 本地闭环暂无法按 Task 4 执行。
- 可选出路：待官网开放登录；或先从 DOM 提取 ticketbooking 的 7 个 spec 文件
  到 `arcbench/data/ticketbooking/tests/` 自建夹具（脚本另行评审）。
