"""Trace 输出：向 demo/output/trace.jsonl 追加 JSON 行。

类型枚举：prompt / api_call / tool_call / workflow_run / human_intervene。
trace 文件只由程序写入，禁止手动编辑。
参见 docs/plans/02-核心模块设计.md 3.2。
"""

import json
from datetime import datetime, timezone
from typing import Any

from errors import GXError


class TraceWriter:
    """追加式 trace 写入器。"""

    def __init__(self, path: str) -> None:
        self._path = path

    def append(
        self,
        *,
        timestamp: datetime,
        type: str,
        actor: Any,
        action: str,
        resource: str,
        detail: Any = None,
        success: bool = True,
        error_msg: str = "",
    ) -> None:
        """追加一行 JSON 到 trace 文件；写入失败抛 GXError(A001)。"""
        line = {
            "timestamp": timestamp.isoformat(),
            "type": type,
            "actor": str(actor),
            "action": action,
            "resource": resource,
            "detail": detail,
            "success": success,
            "error_msg": error_msg,
        }
        try:
            with open(self._path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(line, ensure_ascii=False, default=str) + "\n")
        except OSError as exc:
            raise GXError(
                "A001",
                f"trace 写入失败: {exc}",
                module="audit",
                context={"path": self._path},
            ) from exc

    def log_human_intervene(self, desc: str, actor: str = "human") -> None:
        """人工干预留痕（human_intervene 类型）。"""
        self.append(
            timestamp=datetime.now(timezone.utc),
            type="human_intervene",
            actor=actor,
            action="human_intervene",
            resource="",
            detail=desc,
            success=True,
            error_msg="",
        )
