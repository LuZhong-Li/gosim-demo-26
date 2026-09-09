# GitHub 官方题 v1（结构合规 + 真实后端 MVP）

日期：2026-09-09；分支 `codex/arc-harness`。

## 交付内容

`arcbench/agent/templates/github/`（由 web-react-express 复制改造）：

- `frontend/`（Vite + React）：首页/公开仓库、Sign in/Sign up（account-access
  形态）、Your organizations、Org 页（Repositories + 建仓）、Repo 页
  （Code/Issues 入口 + Issue 列表/新建）；
- `backend/`（Express，`/api/health` + 托管 frontend/dist）：
  - 注册（用户名/邮箱/密码规则、terms、去重；email 直接 verified）与登录会话；
  - 组织创建（Creator → Owner membership）；
  - 组织仓库创建（visibility public/private、defaultBranch=main）；
  - 仓库可见性（匿名/登录用户公共仓库，私有按 owner/membership）；
  - Issue 列表/新建（仓库内递增 number）。
- 数据为服务器内存存储（单进程一次运行，刷新/重登一致），符合
  “所有写操作必须在服务端持久化为对象/关系”方向（后续切文件/DB 便于跨进程）。

本地验证：前端 vite build 通过；后端 API 冒烟通过
（register → login → org acme → repo acme/docs(public) → issue #1 → 匿名可见）。

## 与 47 需求的关系（后续迭代路线）

- 已覆盖骨架：REQ-1 账号注册/登录（部分）、REQ-2 组织命名空间雏形、
  REQ-3 仓库资源雏形、REQ-5 Issue 雏形；
- 待补：密码找回/改密/登出即时性、组织发现/团队/授权角色矩阵、分支/提交/
  代码浏览、Issue 元数据（assignee/label/milestone/评论/关闭重开）、PR/评审/
  分支保护、权限校验前置。
- 初赛前按官方需求 yaml 逐条补齐并用自建 Playwright smoke 迭代；
  Sheets 模板待 GitHub 结构稳定后同样迁移（templates/sheet → full-stack）。

## v2 增补（同分支）

- Forgot password / reset（固定验证码 123456、同账号改密）；
- 组织 People（成员列表/添加成员，Owner/Admin 才可管理）与 Teams（创建/列表）；
- Issue 详情：关闭/重开、评论列表与新增；
- 仓库可见性切换（public/private，权限校验）；
- 首页 /discover 聚合公开组织与可见仓库。

验证：
- API 冒烟脚本 `arcbench/runs/gh-api-smoke.ps1` 全通过
  （register→forgot/reset→login→org→repo→member/team→issue→close→comment→
  visibility→匿名可见）；
- Playwright UI smoke `arcbench/upstream/smoke/github/gh-ui.spec.ts`：
  注册→登录→建组织→建公开仓库→建 Issue→评论，1 passed。

修复记录：`store.repos` → `store.state.repos`（org 详情读取崩溃）、注册成功提示
被模式切换清空。

## v3 增补（同分支）

- 仓库内容模型：新建仓库种子 README.md + initial commit + main 分支；
- Code 能力：文件树/文件读取、Add file（写入文件并生成 commit）、commit 历史、
  分支创建/列表；Express 5 通配符改为 `?path=` 传参；
- Issue 元数据：assignee / labels / milestone 创建与展示，PATCH 合并状态与
  元数据更新；
- 仓库搜索 `/api/search?q=` + 首页搜索框；
- 权限：create issue / commit file / create branch 需 Write+（org 角色矩阵
  Read<Triage<Write<Maintain<Admin/Owner，Member=Write）。

验证：
- API v3 冒烟：README 写回读取、commits=2、分支 main/dev、搜索命中、
  issue 元数据（dave | bug,ui | v1）全部通过；
- Playwright UI smoke 2 条通过：注册→组织→仓库→Issue→评论；Code 标签
  Add file（docs/guide.md + commit history）。

下一步剩余主线：PR（compare/base、评审 Approve/Comment/Request changes、
合并规则与分支保护）、Issue 评论时序/关闭重开入口完善、组织团队层级与
repository access grants、recovery 登录会话即时失效细节。
