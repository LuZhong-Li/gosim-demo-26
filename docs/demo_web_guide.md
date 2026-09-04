# GX-Sheet Web 演示手册（第四轮 S1 + 第五轮 N1）

## 启动

```bash
python -m web.run --reset
# 打开 http://127.0.0.1:8765/
# Web 工作簿/trace 位于 demo/output/web-workbook.xlsx、demo/output/trace-web.jsonl，
# 不触碰正式 demo 基线
```

## 复现链路

1. 顶栏切换操作者为 admin；成员区添加 `reader`（readonly）；团队区添加
   `data`（描述「数据团队」）并确认列表出现 core / data 两行。
2. 把操作者切到 reader，创建 PR → 页面展示 `[P001] permission denied`。
3. 切回 admin 创建 PR；直接点「合并」→ 展示 `[R001]` 规则拦截。
4. 审批人填 `alice`，点「审批」；运行 `ci-check` 工作流；点该 PR 行
   「历史」查看 pr.create / pr.approve / workflow.run / pr.merge 事件；
   再点「合并」→ 状态 merged。
5. 加载审计日志；点「导出审计 JSON」下载 `audit-log.json`。
6. 关闭/开启 `approval` ruleset，验证按钮状态与规则拦截行为变化。

## 与正式基线的边界

- Web 交互写 `demo/output/trace-web.jsonl`，不触碰正式 `demo/output/trace.jsonl`。
- 页面错误码与 CLI 一致：P001 权限 / R001 规则 / B001 业务 / S 前缀存储。
