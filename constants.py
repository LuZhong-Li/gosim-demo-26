"""全局常量定义。

工作表名、角色、错误码前缀统一在此注册；业务代码禁止硬编码这些字符串。
参见 docs/plans/03-分层与代码结构.md 4.4。
"""

# ---- 8 张固定工作表名（Workbook = 组织，Sheet = 资源集，行 = 实体）----
MEMBERS = "members"  # 组织成员
TEAMS = "teams"  # 团队
ROLES = "roles"  # 角色与权限配置
WORKFLOWS = "workflows"  # 工作流定义
WORKFLOW_RUNS = "workflow_runs"  # 工作流运行实例
PULL_REQUESTS = "pull_requests"  # PR 模拟记录
AUDIT_LOG = "audit_log"  # 审计日志（只追加，禁止修改历史行）
RULESETS = "rulesets"  # 规则配置

# 全部工作表名，便于种子脚本统一建表
SHEET_NAMES = [
    MEMBERS,
    TEAMS,
    ROLES,
    WORKFLOWS,
    WORKFLOW_RUNS,
    PULL_REQUESTS,
    AUDIT_LOG,
    RULESETS,
]

# ---- 角色枚举预留（见 docs/plans/02-核心模块设计.md 3.3 权限矩阵）----
OWNER = "owner"  # 组织所有者
ADMIN = "admin"  # 管理员
MEMBER = "member"  # 普通成员
READONLY = "readonly"  # 只读用户

# ---- 错误码常量（完整错误码表见 errors.py 与 docs/plans/03-分层与代码结构.md 4.4）----
# 值保持原样；业务代码禁止硬编码错误码字符串，统一从这里导入。
ERR_PREFIX_STORAGE = "S"  # 存储
ERR_PREFIX_PERMS = "P"  # 权限
ERR_PREFIX_RULES = "R"  # 规则
ERR_PREFIX_AUDIT = "A"  # 审计
ERR_PREFIX_WORKFLOW = "W"  # 工作流

ERR_STORAGE_FILE_NOT_FOUND = "S001"  # 工作簿文件不存在
ERR_STORAGE_SHEET = "S002"  # 工作表不存在（或重复建表）
ERR_STORAGE_LOCK = "S003"  # 存储写锁被占用（并发写）
ERR_STORAGE_ROW = "S004"  # 数据行不存在或越界
ERR_STORAGE_IO = "S005"  # 存储读写 IO 失败
ERR_DOMAIN_VALIDATION = "D001"  # 领域模型校验失败
ERR_PERMISSION_DENIED = "P001"  # 权限拒绝（readonly 用户写操作被拒）
ERR_RULE_PR_APPROVE = "R001"  # 规则违规（PR 合并缺审批 / required-check 未通过）
ERR_AUDIT_WRITE = "A001"  # 审计写入失败
ERR_WORKFLOW_RUN = "W001"  # 工作流运行错误
