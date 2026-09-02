# Trace 文件格式规格

> 校验实现单一事实源：`src/gx/services/audit/validator.py`。
> CLI 入口：`tools/check_trace.py` 与 `gx trace check/export`。

## 1. 文件形态

`trace.jsonl` 是追加式 JSONL：每行一个 JSON 对象，对应一次业务事件。
**只由程序写入，禁止手动编辑**；正式提交物来自 OBS 录制那一次运行
（`demo/output/trace.jsonl`，共 10 条事件）。

## 2. 必填字段（8 个）

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | str(ISO8601 UTC) | 事件时间 |
| `type` | str | 事件类型枚举（见下表） |
| `actor` | str | 操作者标识（成员 id / human / system） |
| `action` | str | 动作名（如 `member.add` / `pr.merge` / `permission.deny`） |
| `resource` | str | 资源定位（如 `sheet:members` / `workflow:1`） |
| `detail` | any | 结构化详情（dict/列表/字符串） |
| `success` | bool | 是否成功 |
| `error_msg` | str | 失败原因（成功为空串） |

## 3. type 枚举（5 种）

| type | 含义 | 常见来源 |
|---|---|---|
| `prompt` | Agent 收到自然语言指令 | Mock Agent/脚本 |
| `tool_call` | Agent 调用内部工具 | Mock Agent/脚本 |
| `api_call` | 门面业务操作（成功/失败/权限拒绝） | CLI 与脚本共用 |
| `workflow_run` | 工作流运行 | CLI 与脚本共用 |
| `human_intervene` | 人工干预留痕（**check_trace 强制校验项**） | 演示脚本 |

## 4. 校验规则（check_trace）

1. 每行必须是合法 JSON 对象；
2. 必须包含上述 8 个必填字段；
3. `type` 必须属于 5 种枚举之一；
4. 文件内必须存在至少一条 `human_intervene`；
5. 行数超过 20（约 2 倍单次 demo）输出“历史残留”警告，不影响校验结果。

## 5. 真实示例（来自已提交的正式 trace）

```jsonl
{"timestamp": "2026-09-01T15:41:07.583344+00:00", "type": "prompt", "actor": "1", "action": "prompt", "resource": "", "detail": "添加成员 reader 为 readonly", "success": true, "error_msg": ""}
{"timestamp": "2026-09-01T15:41:07.583846+00:00", "type": "tool_call", "actor": "1", "action": "member_add", "resource": "workbook", "detail": {"name": "reader", "role": "readonly"}, "success": true, "error_msg": ""}
{"timestamp": "2026-09-01T15:41:07.618667+00:00", "type": "api_call", "actor": "1", "action": "member.add", "resource": "sheet:members", "detail": {"id": 3, "name": "reader", "role": "readonly"}, "success": true, "error_msg": ""}
```

## 6. 校验与导出命令

```bash
python tools/check_trace.py                 # 校验默认 demo/output/trace.jsonl
gx trace check demo/output/trace.jsonl      # CLI 校验并统计
gx trace export out.jsonl --source demo/output/trace.jsonl   # 导出副本并校验
```
