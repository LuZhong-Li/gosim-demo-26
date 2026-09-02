"""规则引擎表驱动单元测试（评审优化第一轮切片 2）。

验证：RuleService 从 RuleSetRepo 读取 active 规则，disabled 规则不参与判定，
空 active 列表 = 全部规则关闭；repo=None 保持内置默认（兼容既有直接单测）。
"""

from datetime import datetime, timezone

from demo.init_seed import SHEET_COLUMNS, seed_default_rules
from gx.domain.enums import RuleStatus, RuleType, RunStatus
from gx.domain.models import PullRequest
from gx.domain.repositories import RuleSetRepo
from gx.services.rules.service import RuleService
from gx.storage.xlsx import LocalXlsxStorage


def _ts() -> datetime:
    return datetime(2026, 9, 1, tzinfo=timezone.utc)


def _pr(approvers=None):
    return PullRequest(
        id=1,
        title="demo",
        author="alice",
        approvers=approvers or [],
        created_at=_ts(),
    )


def _storage_with_rules(tmp_path):
    storage = LocalXlsxStorage.create_workbook(str(tmp_path / "rules.xlsx"))
    for sheet_name, columns in SHEET_COLUMNS.items():
        storage.add_sheet(sheet_name, columns)
    storage.remove_sheet("Sheet")
    seed_default_rules(storage)
    return storage


def test_active_default_rules_still_block(tmp_path):
    repo = RuleSetRepo(_storage_with_rules(tmp_path))
    service = RuleService(repo)
    assert [v.rule_id for v in service.evaluate(_pr())] == [RuleType.APPROVAL.value]
    assert [
        v.rule_id
        for v in service.evaluate(
            _pr(approvers=["alice"]),
            context={"workflow_status": RunStatus.FAILED.value},
        )
    ] == [RuleType.REQUIRED_CHECK.value]


def test_disabled_approval_skips_approval_rule(tmp_path):
    storage = _storage_with_rules(tmp_path)
    repo = RuleSetRepo(storage)
    repo.update("approval", {"status": RuleStatus.DISABLED.value})
    service = RuleService(repo)
    assert service.evaluate(_pr()) == []


def test_disabled_required_check_ignores_failed_workflow(tmp_path):
    storage = _storage_with_rules(tmp_path)
    repo = RuleSetRepo(storage)
    repo.update("required_check", {"status": RuleStatus.DISABLED.value})
    service = RuleService(repo)
    assert (
        service.evaluate(
            _pr(approvers=["alice"]),
            context={"workflow_status": RunStatus.FAILED.value},
        )
        == []
    )


def test_reenabled_rule_blocks_again(tmp_path):
    storage = _storage_with_rules(tmp_path)
    repo = RuleSetRepo(storage)
    repo.update("approval", {"status": RuleStatus.DISABLED.value})
    assert RuleService(repo).evaluate(_pr()) == []
    repo.update("approval", {"status": RuleStatus.ACTIVE.value})
    assert [v.rule_id for v in RuleService(repo).evaluate(_pr())] == [
        RuleType.APPROVAL.value
    ]


def test_empty_active_list_means_no_rules(tmp_path):
    storage = _storage_with_rules(tmp_path)
    repo = RuleSetRepo(storage)
    repo.update("approval", {"status": RuleStatus.DISABLED.value})
    repo.update("required_check", {"status": RuleStatus.DISABLED.value})
    service = RuleService(repo)
    assert service.evaluate(_pr()) == []
    assert (
        service.evaluate(
            _pr(approvers=[]),
            context={"workflow_status": RunStatus.FAILED.value},
        )
        == []
    )
