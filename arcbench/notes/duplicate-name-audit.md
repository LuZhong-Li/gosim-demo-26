# 同名可访问性普查（2026-09-30）

## 为什么要做

线上 206 个引号串里只有 25 个不在我们代码中（且多是测试输入值/动态模板），说明**控件和文案层面已经基本齐全**，
但 GitHub 只过 10/100。剩下最可能的一类系统性失败是：**元素在、角色或数量不对**。
Playwright 的 `getByRole(...)` 一旦命中多个元素就会抛 strict mode violation，页面看起来完全正确却整条用例判失败。

工具：

```powershell
cd arcbench/upstream
$env:TARGET_URL='http://127.0.0.1:3301'
node node_modules/@playwright/test/cli.js test --config ..\notes\dup-name.config.cjs --workers 1 --reporter list
```

`smoke/github/dup-name-probe.spec.ts` 会登录后遍历 17 个关键页面（首页/登录/注册/组织列表/组织/团队/仓库 Code・Issues・
议题详情・PR 列表・PR 详情・PR Files changed・仓库设置・分支设置・compare・搜索结果/账号设置），
在每个页面上枚举 `a/button/input/select/textarea/h1-h4`，用 `aria-label` → `aria-labelledby` → 关联 `<label>` →
可见文本的顺序近似计算可访问名，然后按 `角色|名称` 分组，只报**出现次数 > 1** 的项。

## 结果

| 页面 | 重复项 | 判断 |
| --- | --- | --- |
| `/acme-demo/acme-docs?tab=issues&issue=1` | `2x button|👍 0` | ⚠️ 真问题：议题本身和它的评论各有一个同名按钮，二者语义不同却无法区分 |
| `/acme-demo/acme-docs?tab=pulls&pull=1&view=files` | `4x button|Add comment` | ✅ 符合需求：REQ-6-3-3 原文要求"每一条可评论行都有 `Add comment` 按钮，**文档序第一个**对应第一条可评论行"，即测试本身预期多个并会用 `.first()` |

其余 15 个页面**没有同名重复**。

## 待处理

**`👍 0` 的歧义（未修）**：需求（REQ-5-2-3）只规定"同一用户、同一目标、同一 reaction 只存一条关联，再次选择即移除"，
场景里写作"在已有评论的 **reaction menu** 上选择"，并未规定该控件的可访问名。当前实现是议题/评论各一个即时切换的
`👍 <count>` 按钮，没有菜单。

两种改法各有风险，需要先确认评测的定位方式再动手：

1. 保持可见文本作为可访问名不变，只把两个按钮的 `aria-label` 改成可区分的（如 `React to issue` / `React to comment <id>`）
   —— 更符合"同名元素不应重复"，但若测试用 `getByRole('button', { name: '👍 0' })` 就会失配；
2. 改成按钮名 `Reaction menu` + 展开后的 `role="menuitem"` 选项 —— 贴合场景措辞，但改动更大。

在拿到评测侧定位方式之前，倾向方案 1，并保留一个显示计数的可见元素。
