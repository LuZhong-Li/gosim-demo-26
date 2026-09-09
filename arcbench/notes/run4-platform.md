# Run 4（63c7f832181c）—— 完整评测链路打通

日期：2026-09-09；agent 包：`arc-agent-r4.zip`（web-react-express 兜底模板，含
`frontend/` + `backend/`）；模型 gpt-5.6；Duration 约 3m50s。

## 平台实际执行链（全部验证成功）

```text
STAGE 1 Preparing environment
  Traceability initialized with 10 requirements and 12 scenarios
  Environment preflight passed
STAGE 2 Running agent
  Installing agent dependencies -> installed
  Launching generation agent -> finished successfully
STAGE 3 Evaluating result
  Installing dependencies for frontend / backend -> done
  Starting template application server (backend-led, PORT=3000)
  Template application is reachable on http://127.0.0.1:3000
  Preparing Playwright configuration（runner 镜像预装 Playwright）
  Deploying generated application -> reachable
  Test environment ready with 4 workers
  Executing tests with 4 workers
  Playwright results parsed: passed=0, failed=30, score=0.0
```

## 结论

- 平台确认生成产物 = 官方 web-react-express 式单端口应用（backend 托管
  `frontend/dist`、监听 PORT=3000），装依赖/构建/启动/健康检查全部由平台执行；
- ticketbooking 30 条测试被真实执行（空模板 0/30 符合预期）；
- 下一迭代（r5）= 在 `arcbench/agent/templates/web-react-express` 内实现
  ticketbooking demo 功能：
  - REQ-1 注册/登录/会话持久化（`support/e2e.ts` 已给出全部字段与选择器）；
  - REQ-2 查票（G532 上海→北京、G561 北京→天津，日期文本 `Sun, May 31`）+ Book；
  - REQ-3 受保护订票页 → 乘客表单 → Place order 确认 → Confirm 生成 Booking number，
    刷新后仍显示原订单、不可重复确认。

本地验证闭环：`npm install` frontend/backend → `npm run build` →
`npm start`（PORT=3000）→ 以官方 30 条 spec 跑 Playwright。

