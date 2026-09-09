# GitHub 复刻题 · UI 路由与可访问名称提示

供前端生成，保证 Playwright 可访问名称与导航可命中。所有写操作须先做 session
与目标对象权限校验，成功后结果在详情页/列表可读。

## 页面与路由

- `/`：未登录首页，显示公开组织/公开仓库入口；右上角 Sign in / Sign up。
- 账号访问页：Sign in / Create account / Forgot password 三种表单切换；
  找回密码直接展示固定验证码 `123456`。
- 工作区：登录后账户菜单（当前用户、Your organizations、Sign out、Settings）。
- 组织概览：`/org/<name>`，Repositories / People / Teams。
- 仓库概览：`/<owner>/<repo>`，标题 `owner/repo`，Code / Issues / Pull requests /
  Settings。
- 仓库文件：Code 页文件树、commit history、diff、代码搜索、分支切换。
- Issue 列表/详情；PR 列表/比较/详情（Conversation / Commits / Files changed /
  Checks）。

## 可访问名称要点

- 注册字段：Username、Email、Password、Confirm password、terms 复选框、
  Create account。
- 登录字段：Username or email、Password、Sign in。
- 搜索：全局搜索框（类型过滤 Repositories/Issues/...）。
- 组织：New organization、Create organization、Add member、New team、
  Create team、Remove from organization。
- 仓库：New repository、Create repository、Fork、Clone URL、Settings→Branches。
- PR：New pull request、Create pull request、Create draft pull request、
  Ready for review、Review changes、Approve、Request changes、Submit review、
  Merge pull request、Confirm merge、Close/Reopen pull request。
- Issue：New issue、Comment、Assignees、Labels、Milestone、Close/Reopen issue。
- 设置：Add branch protection rule、Require 1 approval、Require status check test、
  Update password、Save、Cancel。
