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


# 错误码示例（完整错误码表见 docs/plans/03-分层与代码结构.md 4.4）
# S001 文件不存在 / S002 工作表不存在
# P001 权限拒绝（readonly 用户写操作被拒）
# R001 规则违规（如 PR 合并缺审批 / required-check 未通过）
# A001 审计写入失败
# W001 工作流运行错误
