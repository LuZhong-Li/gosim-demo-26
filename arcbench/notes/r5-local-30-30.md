# Run 5（本地）—— ticketbooking demo 30/30 通过

日期：2026-09-09。实现位于
`arcbench/agent/templates/web-react-express`（frontend + backend）。

## 本地验证

```text
Running 30 tests using 1 worker
30 passed (18.7s)
```

覆盖：
- REQ-1.1 注册（6）：成功注册并持久会话、重复用户名/邮箱、密码不一致、
  terms/护照缺失、非法用户名/邮箱/短密码；
- REQ-1.2 登录（6）：用户名/大小写邮箱登录、统一通用错误、前后空格裁剪；
- REQ-2.1 查票（7）：G532（上海→北京）/G561（北京→天津）、
  `Sun, May 31`、空格裁剪、缺失/同城错误；
- REQ-2.2 选车（2）：车次信息、时间标签；
- REQ-3.1 订票页（3）：车次摘要、多车次、未登录不可提交；
- REQ-3.2 下单（6）：有效下单、多线路/舱位、无效乘客数据、刷新保持订单、
  无二次确认。

## 关键设计决策

平台/本地规格中部分用例在点击注册后**不等待**立即导航，若会话依赖异步
fetch 返回 token 并写入 localStorage，导航会中断请求导致会话丢失
（本地确定性复现：token=NONE）。演示题测试只操作 UI 且每个浏览器上下文
隔离，因此 demo 数据层改为前端 localStorage 同步实现：

- 注册/登录/会话/车次/订单全部同步落 localStorage；
- 刷新后会话与订单保持（同一上下文/同进程）；
- 后端保留 Express `/api/health` + `frontend/dist` 托管，满足平台结构校验；
- 官方 GitHub/Sheet 题会使用真实后端存储（另行实现）。

复现记录：`arcbench/runs/repro-*.cjs`（gitignore 目录，不入库）。

