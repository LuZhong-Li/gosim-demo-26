# Mock Agent 技能说明

GX-Sheet 的自然语言入口目前是「字符串匹配」原型，不是在线大模型。
所有指令只调用 `core/service_bus.py` 门面，不直接访问存储或领域层。

## 支持的自然语言指令

| 自然语言示例 | 对应 CLI / 门面动作 |
| --- | --- |
| 添加成员 bob 为 member | `gx member add bob member` |
| 添加成员 carol | `gx member add carol member`（默认角色 member） |
| 列出成员 | `gx member list` |
| 创建 PR demo change | `gx pr create --title "demo change"` |
| 列出 PR | `gx pr list` |
| 审批 PR 1 alice | `gx pr approve 1 alice` |
| 合并 PR 1 | `gx pr merge 1` |
| 运行工作流 ci-check | `gx workflow run ci-check` |
| 列出工作流 | `gx workflow list` |
| 列出团队 | `gx team list` |

## 使用方式

```bash
python agent/mock_nl_parser.py "添加成员 bob 为 member"
python agent/mock_nl_parser.py "运行工作流 ci-check"
python agent/mock_nl_parser.py "创建 PR demo change"
```

可选参数：`--workbook` 指定工作簿路径、`--actor` 指定操作者成员 ID。

## 后续扩展

接入真实 LLM Agent 属于初赛不实现项，见根目录 `FUTURE.md`。
