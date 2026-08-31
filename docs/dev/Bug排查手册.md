# Bug 排查手册

> 读者：维护者。依据 docs/plans/03-分层与代码结构.md 4.5。

## 标准排查步骤

遇到问题按顺序走：

1. 开 `config.py` 的 `DEBUG_MODE=True` 复现，收集调用链路和报错栈。
2. 按下表「现象 → 先查」定位到模块。
3. 跑该模块对应单元测试确认修复。
4. 修复后检查 `audit_log` / `trace.jsonl` 是否留痕，再跑集成测试。

## 按现象索引

| 现象 | 先查顺序 | 对应错误码 |
| --- | --- | --- |
| 写操作失败 | 权限 → 规则 → 存储锁 → 审计日志 | P001 / R001 / S003 |
| xlsx 打不开或损坏 | 存储错误码 → 备份文件 | S001 / S002 |
| trace 不完整 | `tools/check_trace.py` + 拦截器日志 | A001 |
| 环境跑不起来 | `tools/check_env.py`（Python 版本、依赖） | — |
| 数据被改错 | `audit_log` 的 `before_snapshot` 回溯 | — |
| 工作流运行失败 | `workflow_runs` 的 `detail` + 审计记录 | W 系列预留 |

## 错误码速查

| 前缀 | 模块 | 示例 |
| --- | --- | --- |
| S | 存储 | S001 文件不存在、S002 工作表不存在、S003 写锁占用、S004 行越界 |
| D | 领域模型 | D001 模型校验失败 |
| P | 权限 | P001 权限拒绝 |
| R | 规则 | R001 规则违规 |
| A | 审计 | A001 审计/trace 写入失败 |
| W | 工作流 | 预留（Phase3 暂未使用） |

## 常用命令

```bash
python tools/check_env.py
pytest -q
python tools/check_trace.py demo/output/trace.jsonl
python tools/debug_helper.py demo/seed-workbook.xlsx members
python tools/debug_helper.py demo/seed-workbook.xlsx audit_log --latest 10
```
