"""内存写锁。

同一时间只允许一个写操作；并发尝试抛 S003。
参见 docs/plans/02-核心模块设计.md 3.1 与 06-风险预案与保底方案.md。
"""

import threading

from errors import GXError


class MemoryLock:
    """基于线程锁的内存写锁，作为上下文管理器使用。"""

    def __init__(self) -> None:
        self._thread_lock = threading.Lock()

    def __enter__(self) -> "MemoryLock":
        if not self._thread_lock.acquire(blocking=False):
            raise GXError(
                "S003",
                "存储写锁被占用，检测到并发写操作",
                module="storage",
                context={"reason": "concurrent_write"},
            )
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: object | None,
    ) -> None:
        self._thread_lock.release()
