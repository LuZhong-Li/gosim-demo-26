# r69 结果分析检查清单（跑完后逐项核对）

用途：r69 五个 run 跑完后逐项核对，区分「致命错误 / 播种状态 / 指标变化 / 用例得分变化 /
数据缺失 vs 页面 UI 缺失」，输出 r70 输入。

> ⚠️ 修正一处前提：**`_splice_routes()`（路由手术）已经在 r69 里生效**。
> 打包输入 `arcbench/runs/stage-r69-200555/guard.py` 里既有定义也有调用：
> `341: def _splice_routes(...)`、`412: patched = _splice_routes(body, missing)`。
> `5c31bc3` 早于打包，只有 `a16b373`（补挂后再补一遍 default export）是 r70 生效。
> 所以 **`unrouted pages after patch` 在 r69 就应该下降**，不是"预期仍 ≈26"。

## 🔴 第一层：致命阻断检查（全部必须满足，否则分数无参考意义）

- [ ] 全部 run 的 `template-app.stderr` **不再出现** `argument handler must be a function`
      （P0 是否被 `__arcMount` 守卫真正修掉）
- [ ] Stdout 存在 `[arc-seed] world seed finished`
      （账号 + 组织/团队/仓库/成员/授权整套世界播种执行完毕）
- [ ] 没有大量种子相关 ERROR（登录失败、401、组织/仓库 POST 全 500）；
      少量 "already exists" 属正常，不计错误
- [ ] 应用正常监听 3000 端口，评测日志出现 `Backend listening at http://127.0.0.1:3000`

> 任意一项不满足 → 先不看用例通过率，优先定位 r69 包的播种/守卫链路。

## 🟡 第二层：播种链路证据（stdout 关键词）

- [ ] `[arc-seed] signed in as org-owner via /api/auth/login`
- [ ] 播种计数行：`[arc-agent] the backend now seeds the pre-provisioned world ...`
      （账号数、org、teams、repos）
- [ ] POST 记录可见：`/api/orgs`、`/api/orgs/:name/members`、
      `/teams`、`/teams/:team/members`、`/repos`、`/access`
- [ ] 过滤逻辑验证：**没有**注册 `nora.demo` / `unknown-*` / `new-member`
      （`new-member` 要**注册**但不能是组织成员 —— 它是 REQ-2-2-3 的现场加人对象）

## 🟢 第三层：Stage-1 用例变化（r68 自测基线 6/30）

已通过基线：REQ-1-1-1 S1/S2/S3、REQ-1-1-2 S1/S3、REQ-1-1-3 S1。

- [ ] REQ-1-1-3 S2、S3 是否解锁
- [ ] REQ-1-3 S1、S2、S3 是否解锁
- [ ] REQ-2 十五条：GIVEN 前置是否通过

失败分类（必须写进 run-log）：

1. ❗**数据类**：GIVEN 断言失败，提示账号/组织/仓库不存在 → 播种仍有漏洞。
2. ⚠️**UI/业务实现类**：GIVEN 通过但按钮/表单/文案/弹窗/跳转不对 → 数据已就位，r70 补实现。

## 📊 第四层：观测指标与非致命警告

- [ ] `unrouted pages after patch` 数值（**r69 应已下降**；若仍 ≈26 说明补挂没生效，
      要查 `ensure_app_router` 的判定分支）

  > ⚠️ 实测提醒：`unrouted pages after patch: 25` 这行是**补挂之前**打印的，不能当结论。
  > 要看的是后面那句
  > `[arc-agent] entry points now mount the generated pages: [...]`：
  > - 带 `frontend/src/App.tsx (+N route(s))` → 走的是 `_splice_routes` 增量补挂；
  > - 只有 `['frontend/src/__arc_auth__.tsx', 'frontend/src/App.tsx', 'frontend/src/main.tsx']`
  >   不带 `+N` → 模型没写 `<Routes>`（例如用了 `createBrowserRouter`），走了整体重写，
  >   虽然每个页面都被挂上，但模型自己的参数路由会丢。
  > r69 Stage 2 就是后者。
- [ ] rehearsal 是否仍在第一次前端构建上白耗 40–55s（P2）
- [ ] Sheet 得分（预期仍 0）与 `no listing route` 类日志（P4）
- [ ] P6 播种兜底报错、P7 LLM 超时（仅记录）

## 📝 第五层：r70 输入

1. 启用 `a16b373`（补挂路由后再补 default export），继续压低 unrouted 页面。
2. **Sheet 独立脚手架**（最高优先级，`templates/sheet/`，见 `plan-r70-sheet.md`）。
3. r69 识别出的 UI/接口缺口清单（按 REQ 编号）。
4. 长期风险：`gh_store.js` / `sheet_store.js` 内存存储，重启丢种子。

## 🚩 异常预案

### ⚠️ 读数陷阱（本轮踩到）

`https://arc-bench.com/running` **会先渲染空状态再看数据**：页面先出现
"0 active / No runs are currently active."，随后才变成真实数字。用
`if (body.includes("active")) break;` 之类的等待条件会**误判为 0 active（run 已结束）**。
正确做法：等待出现 `RUNNING` 或具体 run id，再读 `(\d+)\s+active`；
历史页同理，卡片先显示 `running` 占位，分数要等刷新后才出现。

1. 有 `world seed finished` 但 REQ-1-1-3 / REQ-1-3 的 GIVEN 仍全失败
   → 查 ①token 鉴权 ②接口探测选错路径 ③播种顺序 ④内存存储重启清空。
2. seed 日志正常但大量页面 404 且 `unrouted pages = 26`
   → 说明补挂分支没触发，回到 `ensure_app_router` 的 `missing and "</Routes>" in body` 判定。
3. Sheet 仍全 0 且日志确认无 listing route
   → 确认 `templates/sheet/` 是 r70 最高优先级。

## 极简速查

```markdown
【r69 速查】
🔴致命阻断：
□ stderr 无 argument handler must be a function
□ stdout 存在 [arc-seed] world seed finished
□ 3000 端口正常监听

🟡播种证据：
□ org-owner 登录成功
□ 看到 org/team/repo POST 调用
□ 没有预注册 nora.demo / unknown-*

🟢Stage-1 用例对比（r68 基线 6/30）：
□ REQ-1-1-3 S2/S3
□ REQ-1-3 S1/S2/S3
区分：□数据类失败 □UI 实现失败
REQ-2：GIVEN 是否通过 □是 □否

📊指标：
unrouted pages after patch = ____
Sheet 得分 = ____

👉r70 任务：
1. 启用 a16b373 路由手术（补挂后补 default export）
2. Sheet 独立脚手架（最高优先级）
3. 本轮 UI/接口缺口清单：________
4. 长期：内存持久化存储
```
