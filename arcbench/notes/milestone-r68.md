# 里程碑 r68（2026-10-02 18:40，余额 ¥387.0，距截止 ≈29h）

## 1. 平台起跑事故与恢复（存档）

- r68（`arc-agent-r68`，History 39）上传/保存全部正常，状态 `Ready to run`；
- 但历史页 `Run 5 remaining tasks` 与 Stage-1 任务页 `Run latest submission` 用
  force-click / Enter / 原生 AX 点击共 6 次都没生效，`/running` 长期 0 active，
  且浏览器报 `Timed out running CDP command "Input.dispatchMouseEvent"`；
- **结论**：不是包的问题，是 in-app 浏览器的 CDP 输入通道抖动，UI 事件没下发到后端；
- **恢复**：随后五个 run 成功拉起（10:32:42–10:32:45），说明只要事件真的下发就能起跑。
- **教训**：起跑失败时不要反复点；换新标签页/硬刷新，或改用桌面浏览器点一次。

## 2. r68 五题 run（2026-10-02 10:32 UTC 起跑）

| 任务 | run |
| --- | --- |
| GitHub 原题 | `045ae807ad47`（10:32:42） |
| GitHub Stage 1 | `9daee315dd83`（10:32:42） |
| GitHub Stage 2 | `8d6c21b4d5a1`（10:32:43） |
| GitHub Stage 3 | `d670a3b7b440`（10:32:45） |
| Sheet | `5113fee44572`（10:32:45） |

## 3. r68 自测：6/30（20%）——第一次拿到"有指向"的失败清单

自测提交 `0929dc3c-7dea-4f32-9ef4-a81b27d8a8d6`（18:29，包 `selftest-r68-ghstage1.zip`，
内容是 r68 产物：孤儿 router 挂载 + 精确名登录/注册/找回/改密/登出脚手架）。

| 对比 | 分数 |
| --- | --- |
| 旧生成型（r62、r66 的脚手架） | 0/30 |
| 手写静态探针 | 4/30（13%） |
| **r68 产物** | **6/30（20%）** |

**通过（6）**：`REQ-1-1-1` 注册 Scenario 1/2/3、`REQ-1-1-2` 登录 Scenario 1/3、
`REQ-1-1-3` 找回 Scenario 1。
⇒ 注册全流程（字段级报错 + 保留输入）、正确凭据登录、找回第一步可见性**都真的过了**。

**失败（24，原文清单）**：

```
REQ-1-1-2 Scenario 2 / 4
REQ-1-1-3 Scenario 2 / 3
REQ-1-2   Scenario 1 / 2
REQ-1-3   Scenario 1 / 2 / 3
REQ-2-1-1 Scenario 1 / 2
REQ-2-1-2 Scenario 1 / 2 / 3
REQ-2-2-1 Scenario 1 / 2
REQ-2-2-2 Scenario 1 / 2
REQ-2-2-3 Scenario 1 / 2
REQ-2-2-4 Scenario 1 / 2
REQ-2-3   Scenario 1 / 2
```

## 4. 根因与 r69 的第一项确定性修复

需求原文（Stage-1 任务页原文）明确写着：

> Values described as existing accounts, organizations, teams, repositories, branches, files,
> commits, issues, milestones, pull requests, reviews, and permission relationships are
> predefined seed data. **The application must provision those records before the corresponding
> scenario** …

而我们的启动自注册**只播了 `alice-dev` 一个账号**。于是：

- `REQ-1-1-3 Scenario 2/3` 需要 `recovery-invalid-code` / `recovery-success`（原文：Test setup
  pre-provisions the verified account X）；
- `REQ-1-3` 三条需要 `password-change-success` / `password-change-invalid` /
  `password-change-required`；
- `REQ-2-*` 需要 `org-owner` / `team-maintainer` / `bob-reviewer` / `repo-admin` /
  `org-member` / `protected-member` / `new-member` / `existing-member`，以及
  组织 `Acme Demo`、仓库 `acme-docs` / `secret-research`、团队 `frontend-team` 等。

**r69 修复项**：把"启动自注册"从单账号升级为**按需求原文播种**——从 `requirements.yaml`
抽 `account <name>` + email + 统一口令 `Valid-password-123!`，逐个走应用自己的注册路由；
再补组织/仓库/团队的种子记录（`Acme Demo` / `acme-docs` / `secret-research` / `frontend-team` …）。
这条修复直接对准 `REQ-1-1-3 ×3` + `REQ-1-3 ×3` = 6 条，且是 `REQ-2-*` 全部 15 条的前置。

## 5. r66 终值（对照组）

GitHub Stage 2 = 5.43 / 6.9%（2 条）；其余四项 0；小计 2/200、209 min、2.02M tokens、¥9.7107。

## 6. 风险

- `gh_store` / `sheet_store` 是**纯内存**存储，进程重启丢数据；分数上来后，"刷新后仍在"类用例会集中暴露。
- Sheet 仍全 0，需要在 Stage 1/2 稳定后单独攻。

## 7. r68 平台结果与真正死因（2026-10-02 19:55 补记）

**r68 五题 = 0/200**（185m42s / 2.121M tokens / ¥5.0764）：
GitHub 0/100（43m0s）、Stage 1 0/30（34m53s）、Stage 2 0（37m26s）、Stage 3 0（37m45s）、
Sheet 0/100（32m38s）。**本地自测 6/30 完全没有在平台上复现。**

死因（run `9daee315dd83` 的 Status + Stdout 原文）：

```
Run Status 2 STAGE 2 Running agent
  template application server exited before becoming ready (code=1)   ← 出现 3 次

[template-app.stderr] TypeError: argument handler must be a function
[template-app.stderr]     at Function.use (.../node_modules/router/index.js:392:13)
[template-app.stderr]     at Function.<anonymous> (.../express/lib/application.js:222:21)
[template-app.stderr]     at Object.<anonymous> (/workspace/template/backend/src/app.js:15:5)
```

`app.js:15` 就是 **r67 新加的孤儿 router 挂载行**。模型那边有个文件只是"出现过
`express.Router` 字样"（例如 `module.exports = { router }`），被我们判定为 router 后
`app.use('/', 该模块)` → Express 立刻抛 `argument handler must be a function` → **后端启动即崩**
→ 评测端连不上应用 → 30 条场景全 0。

**自测为什么没抓到**：自测包用的是我们**预构建的 dist + self-contained 镜像**，且那份 app 的孤儿模块
恰好都真的导出 router；平台则是**自己 rebuild + 用模型的 app.js**，于是踩中。

**r69 修复（`__arcMount` 守卫）**：所有注入挂载改为

```js
function __arcMount(prefix, loader) {
  try {
    const loaded = loader();
    const handler = loaded && loaded.default ? loaded.default : loaded;
    if (typeof handler === 'function') app.use(prefix, handler);
    else console.error('arc: skipped mount ' + prefix + ' (not a handler)');
  } catch (error) { console.error('arc: skipped mount ' + prefix + ': ' + (error && error.message)); }
}
__arcMount('/', () => require('./auth'));
```

本地验证：故意放一个 `module.exports = { router }` 的坏模块 → 服务**正常启动**，
只打印 `arc: skipped mount / (not a handler)`，`GET /` 照常响应；修复前同样的形状必然崩。

## 8. r69 现状（本轮结束）

1. ✅ 需求驱动播种：`requirement_accounts()` 从需求原文抽 15 个预置账号（排除 `unknown` /
   `unknown-reviewer` / `nora.demo`），`ensure_startup_seed_all()` 走应用自己的注册路由批量播种；
   本地 scaffold 已跑通 `seed hook -> /api/auth/register (15 account(s))`。
2. ✅ 崩溃安全挂载：`__arcMount` 守卫（见上），本地用坏模块验证通过。
3. ⏭ 待办：组织/仓库/团队种子（`Acme Demo` / `acme-docs` / `secret-research` / `frontend-team` …）
   —— REQ-2 十五条的前置；然后打包 r69 → 上传 → 五题起跑。
4. 🔎 出分后首要核对：**REQ-1-1-1 注册三条在平台是否通过**（应用这次不会再崩，才有可比性）。
