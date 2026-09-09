# GitHub 复刻题 · 领域模型提示

用于生成器把 47 条原子需求落成数据模型与权限语义。先读
`../requirement-map.json`，再按本提示实现。

## 对象与持久化

- account：id、username、verified_email、password_hash、credential_status、session 所有权。
- session：id、account_id、active；登出/改密/找回后立即失效。
- organization：id、identifier（全局唯一）、display_name、creator；页面标题为组织名，
  含 Repositories / People / Teams。
- organization-account 关系：member/owner；owner 对组织及仓库有 Admin。
- team：id、organization_id、name（组织内唯一）、parent_team_id（同组织、防环）、
  creator；团队成员关系独立，不自动传播权限。
- repository：id、owner_type/owner_id、name、visibility、default_branch、
  description、creator；公开仓库访客可读，私有仓库按授权规则可读。
- branch：name、head_commit_id；repository 内唯一。
- commit：id、parent_id、author、message、timestamp、changed_files（不可变快照）。
- file：path、content、commit_id（Web 编辑走新 commit）。
- issue：repository 内唯一 number、title、description、status(Open/Closed)、
  comments、assignees、labels、milestone、timeline。
- milestone / label：仓库内预置元数据，不跨仓库。
- pull_request：repository 内唯一 number、base_branch、compare_branch、
  base_commit、compare_commit、title、description、author、status
  （Draft/Open/Closed/Merged）、reviews、inline_comments、checks、timeline。
- review：reviewer、compare_commit、decision(Comment/Approve/Request changes)、
  explanation、timestamp；同一 reviewer 同一 compare_commit 只有最新决定生效。
- check：name（固定 `test`）、status(pending/success/failure)、setter、time、
  归属 compare_commit。

## 权限矩阵

- Read：查看；Triage：查看并管理 issue/PR 元数据；Write：建分支/提交文件/建
  issue/PR/评论/评审；Maintain：管理 label/milestone/assignee/reviewer；Admin：
  仓库可见性、授权、分支保护。
- 组织 Owner=Admin；repository Admin 由显式授权或组织 Owner 得来。
- 私有组织仓库可读：组织 Owner、直接授权者、有授权的团队直接成员；普通组织成员
  不因成员身份自动获得私有仓库权限。
- 有效权限取最高：Owner-Admin、直接授权、团队授权三者最高；团队层级不传播。

## 状态机与不变量

- PR：normal→Open，draft→Draft→(Ready for review)→Open→Merged 或 Closed→Open；
  Merged 终态。compare 分支新增 commit 时更新 compare_commit、旧评审标 stale、
  重算 merge eligibility。
- 分支保护仅两条：≥1 个非作者 Approve + required check `test` success；保护分支
  禁止直接写。
- 合并仅支持 create a merge commit；原子更新 base head + PR=Merged。
- 删除成员原子清理：组织关系 + 该成员在本组织的团队关系 + 该成员在本组织仓库的
  直接授权；不删账号、个人仓库、他组织关系、团队本身与团队授权。
