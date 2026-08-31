# GX-Sheet 核心包说明

> 读者：开发者 / 改 Bug。依据 docs/plans/03-分层与代码结构.md。

## 职责

本包是 GX-Sheet 的核心实现：以本地 xlsx 为唯一持久数据源，
模拟 GitHub 组织权限、Rulesets、审计留痕与自动化工作流。

## 分层架构

自下而上依赖，禁止反向依赖：

| 层 | 目录 | 职责 | 可 import | 禁止 import |
| --- | --- | --- | --- | --- |
| 底层 | `storage/` | 数据存取、写锁 | 标准库、openpyxl、`errors.py`、`constants.py` | `services/`、`core/`、`api/`、`agent/` |
| 底层 | `domain/` | 纯数据模型与仓储 | 标准库、pydantic、`errors.py`、`constants.py`、`storage/` | `services/`、`core/`、`api/`、`agent/` |
| 中层 | `services/` | 权限、规则、审计、工作流 | `storage/`、`domain/`、`errors.py`、`constants.py`、`config.py` | `api/`、`agent/` |
| 中层 | `core/` | 业务门面编排 | 同上 | `api/`、`agent/` |
| 上层 | `api/` | CLI 入口 | `core/service_bus.py`、`errors.py` | 直接调 `storage/`、`domain/` |
| 上层 | `agent/` | 自然语言入口 | `core/service_bus.py`、`errors.py` | 直接调 `storage/`、`domain/` |

## 主要模块

- `storage/base.py`：`BaseStorage` 抽象接口（7 个核心方法）
- `storage/lock.py`：`MemoryLock` 内存写锁，并发写抛 S003
- `storage/xlsx.py`：`LocalXlsxStorage` 实现，首行表头映射
- `domain/models.py`：8 个 Pydantic 领域模型 + `RuleViolation`
- `domain/enums.py`：角色、来源、状态等枚举
- `domain/repositories.py`：实体仓储，`AuditRepo` 只追加
- `services/perms/permission.py`：`PermissionService` + `require_permission`
- `services/rules/service.py`：`RuleService`（审批 + required-check）
- `services/audit/`：审计拦截器 + trace 输出 + 哈希链
- `services/actions/`：工作流 Runner 与触发器
- `core/service_bus.py`：统一业务门面（上层唯一入口）
- `api/cli.py`：typer CLI 命令集

## 配置与常量

- 常量（工作表名、角色、错误码前缀）：仓库根目录 `constants.py`
- 可调参数（路径、开关、`DEBUG_MODE`）：仓库根目录 `config.py`
- 错误码定义：仓库根目录 `errors.py`

## 常见排查

- 写操作失败：权限（P001）→ 规则（R001）→ 存储锁（S003）→ 审计
- xlsx 打不开：存储错误（S001/S002）→ 备份文件
- trace 不完整：`tools/check_trace.py` + 审计拦截器日志
- 数据被改错：`audit_log` 的 `before_snapshot` 回溯
