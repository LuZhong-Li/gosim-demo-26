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
