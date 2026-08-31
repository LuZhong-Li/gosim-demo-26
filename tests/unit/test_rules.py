"""Rulesets 规则引擎单元测试。"""

from datetime import datetime, timezone

from gx.domain.enums import RuleType, RunStatus
from gx.domain.models import PullRequest
from gx.services.rules.service import RuleService


def _pr(approvers=None):
    return PullRequest(
        id=1,
        title="demo",
        author="alice",
        approvers=approvers or [],
        created_at=datetime(2026, 9, 1, tzinfo=timezone.utc),
    )


def test_merge_without_approval_violates():
    violations = RuleService().evaluate(_pr())
    assert len(violations) == 1
    assert violations[0].rule_id == RuleType.APPROVAL.value
    assert violations[0].resource_id == "1"


def test_approved_pr_passes():
    assert RuleService().evaluate(_pr(approvers=["alice"])) == []


def test_required_check_failed_violates():
    violations = RuleService().evaluate(
        _pr(approvers=["alice"]),
        context={"workflow_status": RunStatus.FAILED.value},
    )
    assert [v.rule_id for v in violations] == [RuleType.REQUIRED_CHECK.value]
