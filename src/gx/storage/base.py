"""存储抽象层：定义 BaseStorage 抽象基类。

上层只依赖本接口，不感知底层文件格式（openpyxl / 未来 Google Sheets）。
参见 docs/plans/02-核心模块设计.md 3.1。
"""

from abc import ABC, abstractmethod
from contextlib import AbstractContextManager
from typing import Any


class BaseStorage(ABC):
    """存储抽象基类，固定 7 个核心方法。"""

    @classmethod
    @abstractmethod
    def create_workbook(cls, path: str) -> "BaseStorage":
        """新建空工作簿（种子脚本用），返回已就绪的存储实例。"""

    @abstractmethod
    def get_sheet(self, sheet_name: str) -> list[dict[str, Any]]:
        """读整表，返回 [{列名: 值}, ...]；表头为第 0 行，数据行从 0 编号。"""

    @abstractmethod
    def append_row(self, sheet_name: str, row: dict[str, Any]) -> None:
        """追加一行（审计用），row 的键 = 表头列名。"""

    @abstractmethod
    def update_row(self, sheet_name: str, row_id: int, data: dict[str, Any]) -> None:
        """更新第 row_id 条数据行（从 0 开始），只更新 data 中出现的列。"""

    @abstractmethod
    def add_sheet(self, sheet_name: str, columns: list[str]) -> None:
        """新建工作表，columns 作为首行表头。"""

    @abstractmethod
    def save(self) -> None:
        """落盘（写操作后立即调用）。"""

    @abstractmethod
    def lock(self) -> AbstractContextManager[None]:
        """写锁上下文管理器，防止并发写冲突。"""
