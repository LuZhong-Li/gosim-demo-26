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

---

# ✅ r69 实测结果（2026-10-02 20:5x 填入）

官方成绩：**arc-agent-r69 = 0.00 / 0.0%（0/200）**，166m26s，1.989M tokens，
¥3.9766。逐题：原题 0.00（39m29s / ¥2.7861）、Stage 1 0.00（43m44s / ¥3.0722）、
Stage 2 0.00（33m00s / ¥2.3621）、Stage 3 0.00（34m12s / ¥2.5178）、
Sheet 0.00（16m01s / ¥1.1905）。日志落盘：`arcbench/runs/_r69_*_stdout.txt`。

## 🔴 第一层

- [x] `argument handler must be a function` —— **五份日志全是 0 次** ✅ P0 真修掉了
- [x] 应用正常监听：五份都有 `[template-app.stdout] Backend listening at
      http://127.0.0.1:3000` ✅
- [ ] `[arc-seed] world seed finished` —— **五份都没有** ❌ 见下（已修）
- [x] 五份都完成了前端构建（Stage 2: `✓ 109 modules transformed`）

## 🟡 第二层（播种）

- [x] 账号播种执行了：Stage 1 `the backend now seeds every pre-provisioned account
      through its own registration route: ['backend/src/index.js -> /auth/sign-up
      (15 account(s))']`
- [ ] **世界播种一行都没有**：五份日志都没有 `the backend now seeds the pre-provisioned
      world …`，也没有 `[arc-seed]` 运行期输出
- 根因（已修，commit `f04fe83`）：需求 payload 里名字**带反引号**
      （``organization `Acme Demo` ``），`WORLD_ORG_NAME` 只匹配大写开头，
      于是 `org_display == ""` → `requirement_world()` 返回 `{}` → 整个 seeding
      被**静默跳过**。实测：旧正则对真实 bundle 命中 **0** 个候选。
      新正则兼容反引号/引号 + 大小写兜底；真实 bundle 与 Stage-1 形态都验证通过。

## 🟢 第三层（用例）

- ❌ 没有任何用例通过，因此无法区分"数据类/UI 类"——因为**根本没走到用例**：
  运行期 500 把每个请求都打死了。
- 决定性证据（运行期错误，非启动期）：
  - Stage 1：`TypeError: store.hashPassword is not a function`
    （`backend/src/auth.js:81`）**×195**
  - Stage 2：同一条 **×117**；原题 / Stage 3 / Sheet：0 次
- 根因（已修，commit `826f6b7`）：契约检查把"backend/src/store.js"写死，只认
  `require('./store')`；后端实际用的是 `gh_store.js`，于是兼容层补进了一个
  **没人 require 的文件**。现在按别名解析真实模块 + 在所有 repair turn 之后再补一次。

## 📊 第四层

- `unrouted pages after patch`：25–26（**该行在补挂之前打印，不是结论**）；
  判据是 `entry points now mount the generated pages`：
  Stage 2 是不带 `+N` 的那种 → 走了整体重写（模型没用 `<Routes>`）
- Stage 1/Stage 2 首次 rehearsal 未再白烧 40–55s（构建一次通过）
- Sheet：16m01s、0 分，r69 包里还没有 `templates/sheet`（起点错误状态）
- 无 LLM 超时；无"播种兜底报错"

## 📝 第五层：r70 输入

1. `a16b373`（补挂后补 default export）+ `893a1ed`（已接线入口不整体重写）
2. **Sheet 独立脚手架**（前后端已就绪，本地 36/36 + 浏览器 E2E）
3. 本轮两个"必中"修复：`f04fe83` 反引号世界解析、`826f6b7` 按模块补 store 兼容层
4. 长期：内存存储持久化

## 结论

r69 的两个 0 都不是"页面没实现"，而是**两个 harness 侧的静默 bug**：世界播种被
静默跳过、store 兼容层补错文件导致运行期 500。两者都已定位并修好且有本地断言，
r70 是这段时间里第一个"该拿分"的版本。

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
