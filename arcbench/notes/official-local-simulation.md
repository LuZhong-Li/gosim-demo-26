# 官方本地模拟环境调研（2026-09-30）

来源：`git clone https://github.com/code-philia/hackathon-local-simulation.git`
（群公告给的本地模拟竞赛环境）。本地无法完整运行——它要求 Docker Desktop + Linux 容器，
本机没有 Docker（见 `blockers.md` B1）。但它的**契约**与**测试写法**价值很大，记录如下。

## 一、生产 Runner 对 agent 输出的硬性要求

`examples/custom-deploy-agent/main.py` 的 docstring 明确写着：

> **WARNING: this path is local-only. The production runner has no deploy.sh branch;
> it requires `frontend/` and `backend/` in the output directory.**

也就是说：

- **生产 Runner 不认 `deploy.sh`**，只走"标准 npm"分支；
- 输出目录**必须**有 `frontend/` 与 `backend/`；
- 流程固定为：装前端依赖 → `vite build` → 装后端依赖 → 起后端 → 对
  `http://127.0.0.1:3000` 跑 Playwright。

我们的 agent 恰好输出 `frontend/` + `backend/`（整包复制模板），**与生产契约一致**；
平台日志里的 `frontend-npm-install / frontend-npm-build / backend-npm-install / template-app` 也印证了这一点。

唯一注意点：前端必须由 Runner 现构建，所以模板里**不能依赖预置 dist**（我们的 `copy.exclude` 已排除 `dist`，正确）。

## 二、官方测试的定位策略（最有价值的发现）

`public-exercise/keep/tests/helpers.ts` 里所有"按名字找控件"的辅助函数都是**多角色回退**：

```ts
const candidates = [
  t.getByRole('button', { name: pattern }),
  t.getByRole('link', { name: pattern }),
  t.getByRole('menuitem', { name: pattern }),
  t.getByRole('tab', { name: pattern }),
  t.getByRole('checkbox', { name: pattern }),
  t.getByRole('heading', { name: pattern }),
  t.getByRole('option', { name: pattern }),
];
// 逐个 isVisible()，命中即返回；都不可见时退化为 locators[0].first()
```

并且：

- 所有名称都是**大小写不敏感的 RegExp**（如 `/^Search$/i`），空白折叠；
- 每个候选都取 `.first()`，所以**同名重复不会直接触发 strict mode violation**；
- 交互常带作用域，例如 `page.getByRole('dialog', { name: /^Note editor$/i }).getByRole('textbox', ...)`。

### 对我们的三个推论

1. **角色不匹配的杀伤力比我先前判断的小**：一个元素只要是 button/link/menuitem/tab/checkbox/
   heading/option 中的任意一种，且可访问名匹配，就能被找到。先前把账号菜单里的 `Sign out`
   从 menuitem 改成 link 属于"更贴近原文"，但不是致命项。
2. **真正致命的是"可访问名根本不匹配"**：要么名字拼写/大小写不一致，要么元素被包在
   别的可访问名之下（例如名字被父元素吞掉），要么该控件在当前角色/登录态下根本不渲染。
3. **"数量"不是主要风险**：`.first()` 兜底后，重复同名不再是硬失败。我之前那份同名普查
   的价值要下调（`4x Add comment` 确实无碍，`2x 👍 0` 也大概率能被 `.first()` 带过）。

## 三、公开练习题与我们的任务

包内 `public-exercise/` 只有 `bookstack` 与 `keep` 两套（外加 README 提到的 Counter 练习），
**没有 github / sheet 的公开用例**——正式赛题的隐藏测试不随包发布，这与主办方"正式测试用例不对外开放"一致。
因此本地无法直接拿到同源断言，但上面的定位策略可以直接用来自查。

## 四、下一步该怎么用这条信息

把"字符串存在"升级为"**可访问名存在**"的自查：对线上两份赛题页里每个 UI 名称，
在对应页面上枚举渲染元素的可访问名（`aria-label` / 关联 label / 可见文本），
报告**次数为 0** 的那些——这才是 `.first()` 兜底也救不回来的真缺口。
（现有 `notes/github-dup-name-probe.spec.ts` 已经会枚举可访问名，把它从"只报重复"改成"同时报缺失"即可。）
