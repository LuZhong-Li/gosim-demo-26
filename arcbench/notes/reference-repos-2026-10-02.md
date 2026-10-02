# 官方新给的参考仓库 — 浏览结论（2026-10-02）

用户转来官方追加的参考清单。**最关键的那个我们本地早就有**：
`arcbench/upstream/agentic-requirement-compiler`（code-philia 官方参考 agent ARC）。
其余（WebArena / VisualWebArena / OSWorld / AppWorld / Agent-S / arXiv 2407.18901）
是通用"计算机使用/网页 agent"基准与论文，属于**背景参考**，不是我们的交付物，
也不包含本题的隐藏用例；除非要写方法论，不值得花时间。

## 一、ARC 的流水线（我们已经在照着做）

`src/agents/{interface_designer,test_generator,test_driven_developer}.py`
+ `src/agents/context/pipeline.py`，正好是四段式：
结构化需求 → 接口设计 → test-first → traceability。
我们的 `compile_assertions` / `report_traceability` 就是这套的简化版。

## 二、⭐ 真正有价值的东西：官方示例里带着**真的 Playwright 用例**

`example/ticketbooking-demo/tests/`（6 个 spec + `support/e2e.ts`）。
这暴露了基准用例的**写法约定**——正是我们一直缺的信息：

```ts
// support/e2e.ts 里的关键约定
export function baseUrl() { return process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'; }
export async function openHome(page) { await page.goto(baseUrl()); }
export async function openLogin(page) {
  await openHome(page);
  await page.getByRole('link', { name: /login/i }).click();   // ← 登录入口必须是 LINK 名为 *login*
}
export async function expectSignedIn(page, username) {
  await expect(page.getByText(username, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /sign out/i })).toBeVisible();  // ← 必须有 Sign out 链接
}
export async function signIn(page, id, pw) {
  await page.getByLabel(/username or email|email\/username\/mobile number/i).fill(id);
  await page.getByLabel(/^password$/i).fill(pw);
  await page.getByRole('button', { name: /login|sign in/i }).click();
}
// 表单字段一律 getByLabel(/nationality/i) 这种**正则 + 标签**
// 错误提示用 getByText(/invalid credentials|login failed|…/i) 这种**多候选正则**
```

### 由此得到的、可执行的推断

1. **用例是"角色 + 名称正则"驱动的**：`getByRole('link'|'button'|'checkbox', {name:/…/i})`、
   `getByLabel(/…/i)`、`getByText(x, { exact: true })`。光在页面里"出现这段文字"不够——
   **元素角色（link/button/checkbox）和可访问名都要对**。
2. 我们现在的 `exact-name coverage` 只检查**文本是否存在**，不检查**角色与可访问名**——
   这正好是它 142/173 看着不错、评测却是 0 的原因之一。
3. 官方示例里登录入口是 **link**（不是 button），且名字要匹配 `/login/i`；
   登录后要能看到**用户名精确文本** + **`/sign out/i` 链接**。
   GitHub 题的第一步就是"从首页进登录页 → 用 alice-dev 登录"，所以这条尤其致命。
4. 示例 demo 里测试**自己注册账号**；我们的 GitHub/Sheet 题是**预置种子**——
   所以除了"注册/登录链路要通"，还必须保证**种子记录能被检索到**（我们已在此发力）。

### 下一步（r63 方向，优先级最高）

把 `selfcheck` 的 exact-name 检查从"文本存在"升级为**角色感知的可访问名检查**：
对每条用例里出现的控件名，判断页面上是否存在**对应角色**（link/button/checkbox/textbox + label）
且可访问名匹配的元素；并针对 GitHub 题**强制**存在：
首页的 `link[login]`、登录表单的 `label(username/email)`+`label(password)`+`button(login|sign in)`、
登录后的**用户名精确文本**与 `link[sign out]`。
这条比继续堆 exact-name 数量更可能直接把 0 变成非 0。
