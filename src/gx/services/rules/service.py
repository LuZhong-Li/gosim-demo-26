"""Rulesets 规则引擎。

初赛两条规则：PR 合并需至少 1 个审批人；required-check 工作流通过。
required-check 与 workflow_runs 的联动在 Phase3 完成。
参见 docs/plans/02-核心模块设计.md 3.4。
"""

from typing import Any

from gx.domain.enums import RuleType, RunStatus
from gx.domain.models import PullRequest, RuleViolation


class RuleService:
    """规则校验服务。"""

    def evaluate(
        self, pr: PullRequest, context: dict[str, Any] | None = None
    ) -> list[RuleViolation]:
        """返回违规列表；空列表表示放行。"""
        violations: list[RuleViolation] = []
        if not pr.approvers:
            violations.append(
                RuleViolation(
                    rule_id=RuleType.APPROVAL.value,
                    message="PR 合并需要至少 1 个审批人",
                    resource_id=str(pr.id),
                )
            )
        workflow_status = (context or {}).get("workflow_status")
        if workflow_status == RunStatus.FAILED.value:
            violations.append(
                RuleViolation(
                    rule_id=RuleType.REQUIRED_CHECK.value,
                    message="required-check 工作流未通过",
                    resource_id=str(pr.id),
                )
            )
        return violations
