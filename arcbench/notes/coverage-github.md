# GitHub 模板需求覆盖率审计（2026-09-10）

对象：`arcbench/agent/templates/github`（= 提交包 `arc-agent-r12.zip` 内的
GitHub 模板，平台任务 TASK-001/TASK-002）。

## 审计方法

1. 需求树：`node arcbench/notes/list_reqs.cjs github`
   → 64 个标题（47 个模块，239 条 GIVEN/WHEN/THEN 步骤）；
2. 后端接口面：`rg -o "app\.(get|post|put|patch|delete)\('...'" backend/src/app.js`
   → 41 条路由；
3. 前端面：`App.tsx` 5 条路由（`/`、`/auth`、`/orgs`、`/orgs/:name`、
   `/:owner/:name`）+ `api/index.ts` 39 个导出函数；
4. 逐条特性关键词扫描（fork / reaction / draft / compare / reviewer /
   password / parentTeam / clipboard / assignees …）。

规模参考：后端 `app.js` 747 行 + `gh_store.js` 288 行；前端
`RepoPage.tsx` 432、`PullsTab.tsx` 254、`OrgPage.tsx` 214、`AuthPage.tsx` 207 行。

## 结论摘要

| 状态 | 数量 | 说明 |
| --- | --- | --- |
| ✅ 已实现 | 31 | 有后端路由 + 前端入口 |
| ⚠️ 部分实现 | 6 | 有主体，缺规格细节 |
| ❌ 未实现 | 10 | 需求存在、代码中无对应物 |

## 逐条覆盖表

| REQ | 名称 | 状态 | 证据 / 缺口 |
| --- | --- | --- | --- |
| 1-1-1 | Register | ✅ | `POST /api/auth/register` + `isPasswordValid`（app.js:27）按规格校验；AuthPage |
| 1-1-2 | Sign in | ✅ | `POST /api/auth/login`；AuthPage |
| 1-1-3 | Recover access | ✅ | `POST /api/auth/forgot` + `/reset`（固定码 123456） |
| 1-2 | Sign out | ✅ | **批次 B 已补**：登出改为两步确认（"Sign out of this session only?" + Confirm/Cancel），取消保留会话 |
| 1-3 | Change password | ✅ | **批次 A 已补**：`POST /api/auth/password` + `/settings` 页（Password and authentication） |
| 2-1-1 | Browse org repos | ✅ | `GET /api/orgs/:name` + OrgPage Repositories 标签 |
| 2-1-2 | Create org | ✅ | `POST /api/orgs` + OrgsPage |
| 2-2-1 | Create team | ✅ | `POST /api/orgs/:name/teams`（含 parentTeam 字段） |
| 2-2-2 | Team members & hierarchy | ✅ | **批次 B2 已补**：`PATCH /api/orgs/:name/teams/:team` 改父团队 + 环检测；团队行内可编辑父级 |
| 2-2-3 | Add org member | ✅ | `POST /api/orgs/:name/members` |
| 2-2-4 | Remove org member | ✅ | **批次 A 已补**：`DELETE /api/orgs/:name/members/:username` + People 页两步确认；级联清团队关系、拒绝移除最后 Owner |
| 2-3 | Grant repo access | ⚠️ | `GET/POST /api/orgs/:name/access` 只支持 **team** 授权；规格要求的“直接授权给个人”缺失 |
| 3-1 | Search repos | ✅ | `GET /api/search` + `searchRepos` |
| 3-2-1 | Create repo | ✅ | **批次 B 已补**：新增 `POST /api/repos`（个人命名空间）+ 首页 "New repository" 表单；组织仓库原有 |
| 3-2-2 | Fork repo | ✅ | **批次 A 已补**：`POST /api/repos/:owner/:name/fork` + 仓库页 Fork 按钮，`forkedFrom` 记录来源 |
| 3-2-3 | Clone URL | ✅ | **批次 A 已补**：repo 载荷 `cloneUrl` + Code 区可复制输入框 |
| 3-3 | Public repo overview | ✅ | `GET /api/repos/:owner/:name` + RepoPage |
| 3-4 | Change visibility | ✅ | `PATCH /api/repos/:owner/:name` + `setRepoVisibility` |
| 4-1 | Browse files/dirs | ✅ | `GET .../tree`、`.../contents` |
| 4-2-1 | Commit history | ✅ | `GET .../commits` |
| 4-2-2 | Inspect commit diff | ❌ | 无 `.../commits/:sha`，无 diff 视图 |
| 4-2-3 | Search code in repo | ✅ | `GET /api/search`（仓库范围检索） |
| 4-3-1 | List/switch branches | ✅ | `gh_store` 的 `repo.branches` + RepoPage branch 状态 |
| 4-3-2 | Create branch | ✅ | `POST .../branches` |
| 4-3-3 | Change default branch | ✅ | `PATCH /api/repos/:owner/:name` 带 defaultBranch |
| 4-4 | Manage files in web UI | ✅ | `POST .../contents`（新建/更新） |
| 5-1-1 | List/filter issues | ✅ | `GET .../issues` + RepoPage 过滤 |
| 5-1-2 | View issue & discussion | ✅ | `GET .../issues/:number`（含 comments） |
| 5-2-1 | Create issue | ✅ | `POST .../issues` |
| 5-2-2 | Edit issue | ✅ | `PATCH .../issues/:number` |
| 5-2-3 | Comment & reaction | ⚠️ | 评论 ✅（`POST .../comments`）；**reaction 0 命中** |
| 5-3-1 | Assignees | ⚠️ | 只有单个 `assignee?: string`；规格要求多选 + 可搜索的设置菜单 |
| 5-3-2 | Labels | ✅ | `labels: string[]`（app.js:505/531） |
| 5-3-3 | Milestone | ✅ | issue 详情页 milestone 单选框 |
| 5-4 | Close/reopen issue | ✅ | `PATCH .../issues/:number` 带 state |
| 6-1 | Branch protection + checks | ✅ | `PUT .../branches/:branch/protection`、`POST .../checks` |
| 6-2-1 | List/filter PRs | ✅ | `GET .../pulls` + PullsTab |
| 6-2-2 | Compare branches | ⚠️ | 仅创建时校验 base≠head；**无独立比较页/diff 摘要** |
| 6-2-3 | Create PR | ✅ | `POST .../pulls` |
| 6-2-4 | Draft PR | ✅ | **批次 A 已补**：`draft:true` 建 Draft、`PATCH {ready:true}` 转 Open、draft 无法合并（merge 路由 `state!=='open'` 拦截） |
| 6-3-1 | PR overview & commits | ✅ | `GET .../pulls/:number` + PullsTab 三标签 |
| 6-3-2 | Files changed / diff | ❌ | 无 diff 计算与聚合统计 |
| 6-3-3 | Inline review comments | ❌ | 无行级锚点（line/position 0 命中） |
| 6-3-4 | Submit review | ✅ | `POST .../pulls/:number/reviews` |
| 6-4 | Reviewers request | ❌ | `reviewer` 仅用于统计有效 Approve，无请求/移除关系 |
| 6-5 | Merge PR | ✅ | `POST .../merge`（含保护规则校验） |
| 6-6 | Close/reopen PR | ✅ | `PATCH .../pulls/:number` 状态 |

## 缺口优先级（按“被 Playwright 用例命中的概率 × 实现成本”）

1. **REQ-6-3-2 / 6-3-3**：diff 视图 + 行级评审评论——PR 评审工作区是 REQ-6 的
   核心，且场景描述最细（逐行、Outdated、pending draft），当前完全空白；
2. **REQ-6-4**：请求/移除评审人——关系型需求，实现便宜、用例概率高；
3. **REQ-3-2-2 Fork / REQ-6-2-4 Draft PR**：两条都是 ATOMIC 需求，且都带
   独立的“反例场景”（如 draft 不能合并、fork 不回写源仓库），缺失必失分；
4. **REQ-2-2-4 移除成员**：级联语义 + “不得移除最后一个 Owner”反例；
5. **REQ-1-3 改密码**：独立设置页 + 新旧密码可用性断言；
6. **REQ-4-2-2 提交差异**：需要 commit detail + diff；
7. **REQ-5-2-3 reactions**、**REQ-5-3-1 多 assignee**、**REQ-1-2 登出确认框**、
   **REQ-2-2-2 团队环检测**、**REQ-3-2-1 个人仓库**、**REQ-3-2-3 clone URL**：
   规格细节补齐。

## 下一步

按上面 1→7 的顺序补实现，每补一组就跑本地 smoke
（`arcbench/runs/gh-playwright.config.cjs`，当前 3 passed）守住不回归，
再重新打包成 r13 上传。
