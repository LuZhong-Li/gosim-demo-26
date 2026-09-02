"""Rulesets 领域模型与种子规则测试（评审优化第一轮切片 1）。

覆盖：RuleSet.status 默认值与解析、seed_default_rules 幂等写入、
build_seed 预置两条 active 规则。此切片不改规则引擎行为。
"""

from demo.init_seed import SHEET_COLUMNS, build_seed, seed_default_rules
from gx.domain.enums import RuleStatus, RuleType
from gx.domain.models import RuleSet
from gx.domain.repositories import RuleSetRepo
from gx.storage.xlsx import LocalXlsxStorage


def _workbook(path: str) -> LocalXlsxStorage:
    """按 SHEET_COLUMNS 新建 8 表工作簿（不含种子数据）。"""
    storage = LocalXlsxStorage.create_workbook(path)
    for sheet_name, columns in SHEET_COLUMNS.items():
        storage.add_sheet(sheet_name, columns)
    storage.remove_sheet("Sheet")
    return storage


def test_seed_default_rules_writes_two_active_rules(tmp_path):
    storage = _workbook(str(tmp_path / "rules.xlsx"))
    seed_default_rules(storage)
    rules = RuleSetRepo(storage).list()
    by_id = {rule.id: rule for rule in rules}
    assert set(by_id) == {"approval", "required_check"}
    assert by_id["approval"].rule_type == RuleType.APPROVAL
    assert by_id["approval"].status == RuleStatus.ACTIVE
    assert by_id["required_check"].rule_type == RuleType.REQUIRED_CHECK
    assert by_id["required_check"].status == RuleStatus.ACTIVE


def test_seed_default_rules_is_idempotent(tmp_path):
    storage = _workbook(str(tmp_path / "rules.xlsx"))
    seed_default_rules(storage)
    seed_default_rules(storage)
    assert len(RuleSetRepo(storage).list()) == 2


def test_build_seed_contains_default_rules(tmp_path):
    storage = _workbook(str(tmp_path / "seed.xlsx"))
    build_seed(storage)
    assert len(RuleSetRepo(storage).list()) == 2


def test_rule_set_status_defaults_to_active():
    rule = RuleSet(id="approval", name="PR 合并需要审批", rule_type=RuleType.APPROVAL)
    assert rule.status == RuleStatus.ACTIVE


def test_rule_set_parses_disabled_status():
    rule = RuleSet.parse_raw(
        {
            "id": "required_check",
            "name": "required-check 工作流需通过",
            "rule_type": RuleType.REQUIRED_CHECK.value,
            "status": RuleStatus.DISABLED.value,
            "config": {},
        }
    )
    assert rule.status == RuleStatus.DISABLED
