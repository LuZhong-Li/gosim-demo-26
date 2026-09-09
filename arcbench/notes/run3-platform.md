# Run 3（aee1336e3980）—— 平台链路首次跑通 SDK，暴露输出结构契约

日期：2026-09-09；agent 包：`arcbench/dist/arc-agent-r3.zip`（真实 SDK + main.py 校准）；模型 gpt-5.6。

## 结果

提交 `aee1336e3980`，Duration 2s，最终 FAILED，但阶段推进远超前两次：

- STAGE 1 Preparing environment：通过。
- STAGE 2 Running agent：
  - `Generation agent finished successfully`（此前 run 1/2 在 import 阶段即崩，
    根因是包内 mock SDK 而非平台注入的真实 `arcbench_agent_runtime`；r3 已改为
    vendor `code-philia/agentic-requirement-compiler` 的 `src/arcbench_agent_runtime`）；
  - `Uploaded agent finished; traceability artifacts are expected to be written directly by the SDK`；
  - **`web template is incomplete: expected frontend/ and backend/ directories`**；
  - `Runner did not produce any executed Playwright tests`。
- STAGE 3 Evaluating result：进入收集测试产物，因无测试可跑而失败。

## 根因（下一个迭代的输入）

平台对 web 任务要求生成产物是官方风格单端口应用：

```text
<output-dir>/
|-- frontend/            # Vite/React，构建产物 frontend/dist
`-- backend/             # Express，监听 PORT，/api/health，托管 frontend/dist
```

我们的模板仍是单个 `index.html`（keep/github/sheet）或 stub（ticketbooking），
因此平台 preflight 判定模板不完整、不执行 Playwright。

官方结构参考已克隆：`arcbench/upstream/arc-template/templates/web-react-express`
（README：backend-led 单端口，`cd frontend && npm run build` → `cd backend && npm run start`）。

## 结论 / 下一步（r4）

1. 把 `web-react-express` 模板并入 agent 包作为未知/兜底任务模板，使输出含
   `frontend/` + `backend/`，先跑通「测试被执行」的完整链路；
2. 之后基于该模板实现 ticketbooking demo（REQ-1 账号会话 / REQ-2 查票 /
   REQ-3 订票），用本仓库的官方需求与 30 条可见测试迭代提分；
3. github/sheet 官方题同样需要迁移到该结构（或生成时补 frontend/backend 包装）。

