"""Rulesets 规则引擎（表驱动）。

规则唯一事实来源是 ``RULESETS`` 表的 active 行；disabled 行不参与判定，
全部禁用 = 不拦截。``ruleset_repo=None`` 仅保留内置默认两条规则，供直接
构造引擎的单元测试使用；ServiceBus 始终传入 RuleSetRepo。
参见 docs/plans/02-核心模块设计.md 3.4、docs/plans/10-评审优化第一轮.md 5.2。
"""

from typing import Any

from gx.domain.enums import RuleStatus, RuleType, RunStatus
from gx.domain.models import PullRequest, RuleViolation
from gx.domain.repositories import RuleSetRepo


class RuleService:
    """规则校验服务：读取 active 规则并逐条判定。"""

    def __init__(self, ruleset_repo: RuleSetRepo | None = None) -> None:
        self._repo = ruleset_repo

    def _enabled_rule_types(self) -> set[RuleType]:
        """返回参与判定的规则类型集合。

        repo=None 时返回内置默认两条（兼容既有直接单测）；
        repo 提供时仅返回 ``status=active`` 的行。
        """
        if self._repo is None:
            return {RuleType.APPROVAL, RuleType.REQUIRED_CHECK}
        return {rule.rule_type for rule in self._repo.list() if rule.status == RuleStatus.ACTIVE}

    def evaluate(
        self, pr: PullRequest, context: dict[str, Any] | None = None
    ) -> list[RuleViolation]:
        """返回违规列表；空列表表示放行。"""
        violations: list[RuleViolation] = []
        enabled = self._enabled_rule_types()
        if RuleType.APPROVAL in enabled and not pr.approvers:
            violations.append(
                RuleViolation(
                    rule_id=RuleType.APPROVAL.value,
                    message="PR 合并需要至少 1 个审批人",
                    resource_id=str(pr.id),
                )
            )
        workflow_status = (context or {}).get("workflow_status")
        if (
            RuleType.REQUIRED_CHECK in enabled
            and workflow_status is not None
            and workflow_status != RunStatus.SUCCESS.value
        ):
            violations.append(
                RuleViolation(
                    rule_id=RuleType.REQUIRED_CHECK.value,
                    message="required-check 工作流未通过",
                    resource_id=str(pr.id),
                )
            )
        return violations
