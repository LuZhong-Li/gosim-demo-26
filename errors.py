"""统一错误体系。

所有业务错误统一抛 ``GXError``，按固定链路流转：
raise GXError -> 拦截器捕获 -> 写 audit_log(success=false) -> 写 trace.jsonl -> CLI 格式化输出。
"""


class GXError(Exception):
    """GX-Sheet 统一异常。

    属性：
        code: 错误码，格式为大写前缀 + 三位数字，如 ``S001``。
        message: 错误描述。
        module: 出错模块名，如 ``storage`` / ``perms`` / ``rules``。
        context: 结构化上下文（dict），便于排查与留痕。
    """

    def __init__(
        self,
        code: str,
        message: str,
        module: str = None,
        context: dict | None = None,
    ):
        self.code = code
        self.message = message
        self.module = module
        self.context = context or {}
        super().__init__(f"[{code}] {message}")


# 错误码常量统一定义在 constants.py（ERR_* 前缀），值如下，业务代码禁止硬编码：
# ERR_STORAGE_FILE_NOT_FOUND  S001 文件不存在
# ERR_STORAGE_SHEET           S002 工作表不存在（或重复建表）
# ERR_STORAGE_LOCK            S003 存储写锁被占用（并发写）
# ERR_STORAGE_ROW             S004 数据行不存在或越界
# ERR_STORAGE_IO              S005 存储读写 IO 失败
# ERR_DOMAIN_VALIDATION       D001 领域模型校验失败（domain 层 parse_raw）
# ERR_PERMISSION_DENIED       P001 权限拒绝（readonly 用户写操作被拒）
# ERR_RULE_PR_APPROVE         R001 规则违规（如 PR 合并缺审批 / required-check 未通过）
# ERR_AUDIT_WRITE             A001 审计写入失败
# ERR_WORKFLOW_RUN            W001 工作流运行错误
# ERR_BUSINESS_VALIDATION     B001 PR 状态/身份校验失败（如 PR 自审批、重复合并）
