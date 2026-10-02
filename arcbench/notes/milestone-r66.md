# 里程碑 r66（2026-10-02 18:19，距截止约 29 小时，余额 ¥395.4）

## 里程碑①：静态探针 4/30（13%）

自测提交 `417dfcfb-4281-4865-ba88-3daa1dd3d909`，包 `selftest-probe-static.zip`（3KB，纯
stdlib 的 `server.js` + 手写 `index.html`，**不含任何生成物**）。

- **含义**：Stage-1 套件（30 条）第一次出现非零分数。
- **证明**：官方夹具能构建镜像、拉起容器、连上 `:3000` 并驱动页面 ——
  `node:20-bookworm` + `node /app/server.js` + `PORT=3000` + `ARC_EXTRA_PORTS=0` 这条路完全通畅。
- **定位**：探针（页面骨架）能得分，而历史生成型提交持续 0 分 ⇒ 卡点不在 Dockerfile / 端口 /
  容器调度，而在**应用输出的内容与控件可访问名**。

探针的通过/未通过分布（用于反推夹具的关注点）：

```
未通过：REQ-1-1-1（注册）×3、REQ-1-1-2 Scenario 1、REQ-1-1-3（找回）×3、
        REQ-1-2 Scenario 2、REQ-1-3（改密）…
已通过：REQ-1-1-2 Scenario 2/3/4（登录）、REQ-1-2 Scenario 1（登出）…
```

## 里程碑②：r66 生成型首次拿到非零分

| 任务 | 结果 | 耗时 | 成本 |
| --- | --- | --- | --- |
| **GitHub Stage 2** | **Score 5.43 / Tests 6.9%（2 条通过）** | 41m59s | ¥2.6420 |
| Sheet | 0/100 | 26m42s | ¥1.3037 |
| GitHub 原题 / Stage 1 / Stage 3 | 仍在跑（随后归零） | | |
| **r66 小计** | 0.73 score / **2/200** | 68m41s | ¥3.9456 |

计分规则是"原题路线与阶段路线取较高分"，所以 Stage 2 的 5.43 会作为有效分，让队伍**重新出现在
排行榜上**（此前最新提交为 0，榜单上查不到我们）。

## 当前问题画像

- 环境层：**已排除**（容器、端口、启动脚本、评测调度都正常）。
- 生成型：能产出部分能过 Playwright 的页面，但大量原子需求未达标；**Sheet 仍是全 0**。
- 静态探针只有页面骨架得分；r66 之前的包里没有完整的注册 / 找回 / 改密后端逻辑。
- **隐患（需排期）**：`gh_store` / `sheet_store` 是**纯内存存储**，进程重启即丢数据。
  分数上去之后，任何"刷新后仍存在 / 重新打开仍可见"的用例都会暴露这个问题 —— 必须补持久化。

## 下一步（等 active runs 归零立刻执行）

1. 提交 **r68**，包含两项本地已验证修复：
   - **孤儿 router 挂载**：`backend/src/auth.js` 有完整注册/登录/改密路由但从未被 `app.use`，
     `POST /auth/sign-up` 由 **404 → 201**（浏览器端注册→登录→显示用户名整条已验证）；
   - **按需求原文实现的精确名脚手架**：登录/注册/找回（两步，含固定验证码文本 `123456`）/
     改密（`Password and authentication`）/账户菜单 + 登出确认弹窗，字段级报错、表单 `noValidate`。
2. r68 起跑后跑五题（GitHub 原题 + Stage 1/2/3 + Sheet）。
3. 用 r68 产物反向自测，目标把探针的 4/30（13%）顶上去。

## 官方资料（本轮新挖到）

- 本地 `arcbench/upstream/` 是官方复现包：`npm run test -- --app <app> --target-url <url>`，
  `playwright.config.ts`：`baseURL=$TARGET_URL||http://127.0.0.1:3301`、`timeout=60s`、
  `expect=10s`、失败自动截图/trace/video。
- 它带的是 keep / bookstack / stackoverflow / prestashop / 12306 / ctrip 六套基准 app
  （共 460 条 spec），**没有黑客松的 GitHub/Sheet 题**。
- `arc-bench/webapp/*/tests/helpers.ts` 暴露了官方夹具的定位风格（对我们的名字策略有直接指导）：
  全角色枚举（button/link/menuitem/tab/checkbox/radio/option/heading/label/placeholder/text）+
  **大小写不敏感、空格宽松的正则** + `.first()`（重复名字不会触发 strict 报错）。
  ⇒ 控件名必须与需求原文逐字一致（如 `Sign in`），且**不要**加多余词（`Sign in Login` 在锚定
  正则 `/^sign in$/i` 下会失配）。

## 资源现状

- 剩余额度 **¥395.4**；剩余时间 **≈29 小时**。
- 策略：沿分阶段 Stage 路线迭代，先抬 Stage 1/2，再攻 Sheet；预算充足，不需要保守。
