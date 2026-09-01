"""审计拦截器：统一写入口，形成哈希链并联动 trace 输出。

所有需要审计的写操作统一走 record()；先写 audit_log（只追加），
再写 trace.jsonl；trace 写入失败抛 A001。
参见 docs/plans/02-核心模块设计.md 3.2。
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from errors import GXError
from gx.domain.enums import Source
from gx.domain.models import AuditLogEntry
from gx.domain.repositories import AuditRepo
from gx.services.audit.trace import TraceWriter


def audit_hash(row: dict[str, Any]) -> str:
    """对审计行内容做 SHA-256（哈希链用）。"""
    payload = json.dumps(row, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class AuditInterceptor:
    """审计 + Trace 统一入口。"""

    def __init__(self, audit_repo: AuditRepo, trace: TraceWriter) -> None:
        self._audit = audit_repo
        self._trace = trace

    def record(
        self,
        *,
        actor_id: Any,
        action_type: str,
        resource_type: str,
        resource_id: str,
        before_snapshot: dict[str, Any] | None = None,
        after_snapshot: dict[str, Any] | None = None,
        source: Source = Source.API,
        success: bool = True,
        error_msg: str = "",
        trace_type: str = "api_call",
        timestamp: datetime | None = None,
    ) -> AuditLogEntry:
        """原子完成「写审计 + 写 trace」；trace 失败抛 GXError(A001)。

        入参：
            actor_id: 操作者标识（统一转字符串写入审计）。
            action_type: 动作名（如 member.add / pr.merge / permission.deny）。
            resource_type / resource_id: 资源定位（写入 trace 的 resource 字段）。
            before_snapshot / after_snapshot: 变更前后快照。
            source: 审计来源（api / cli / agent）。
            success: 是否成功；失败事件必须带 error_msg 留痕。
            error_msg: 失败原因，写审计与 trace 的 error_msg 字段。
            trace_type: trace 类型（api_call / workflow_run 等）。
            timestamp: 事件时间，缺省取当前 UTC 时间。

        返回值：写入审计表的 AuditLogEntry。
        """
        timestamp = timestamp or datetime.now(timezone.utc)
        entry = AuditLogEntry(
            actor_id=str(actor_id),
            action_type=action_type,
            resource_type=resource_type,
            resource_id=str(resource_id or ""),
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            timestamp=timestamp,
            source=source,
            success=success,
            error_msg=error_msg,
            prev_hash=self._last_hash(),
        )
        self._audit.create(entry)
        detail = after_snapshot if after_snapshot is not None else before_snapshot
        self._trace.append(
            timestamp=timestamp,
            type=trace_type,
            actor=actor_id,
            action=action_type,
            resource=f"{resource_type}:{resource_id or ''}",
            detail=detail,
            success=success,
            error_msg=error_msg,
        )
        return entry

    def _last_hash(self) -> str:
        rows = self._audit.list()
        if not rows:
            return "0" * 64
        return audit_hash(rows[-1].to_row())
