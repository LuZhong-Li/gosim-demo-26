"""基于 openpyxl 的本地 xlsx 存储实现。

首行作为表头；写操作自动加内存锁并在锁内立即 save()。
参见 docs/plans/02-核心模块设计.md 3.1。
"""

from pathlib import Path
from typing import Any

from openpyxl import Workbook, load_workbook

from constants import AUDIT_LOG
from errors import GXError
from src.gx.storage.base import BaseStorage
from src.gx.storage.lock import MemoryLock


class LocalXlsxStorage(BaseStorage):
    """本地 xlsx 存储：唯一接触 openpyxl 的地方。"""

    def __init__(self, path: str) -> None:
        self._path = path
        self._lock = MemoryLock()
        if not Path(path).is_file():
            raise GXError(
                "S001",
                f"工作簿文件不存在: {path}",
                module="storage",
                context={"path": path},
            )
        self._workbook = load_workbook(path)

    @classmethod
    def create_workbook(cls, path: str) -> "LocalXlsxStorage":
        """新建空工作簿并保存，返回对应存储实例（种子脚本用）。"""
        workbook = Workbook()
        workbook.save(path)
        return cls(path)

    def get_sheet(self, sheet_name: str) -> list[dict[str, Any]]:
        self._ensure_sheet(sheet_name)
        worksheet = self._workbook[sheet_name]
        rows = list(worksheet.iter_rows(values_only=True))
        if not rows:
            return []
        headers = [str(header) for header in rows[0]]
        return [dict(zip(headers, row)) for row in rows[1:]]

    def append_row(self, sheet_name: str, row: dict[str, Any]) -> None:
        with self.lock():
            self._ensure_sheet(sheet_name)
            worksheet = self._workbook[sheet_name]
            headers = [str(cell.value) for cell in worksheet[1]]
            worksheet.append([row.get(header) for header in headers])
            self.save()

    def update_row(self, sheet_name: str, row_id: int, data: dict[str, Any]) -> None:
        with self.lock():
            self._ensure_sheet(sheet_name)
            if sheet_name == AUDIT_LOG:
                raise GXError(
                    "A001",
                    "audit_log 表只允许追加，禁止更新/删除",
                    module="storage",
                    context={"sheet_name": sheet_name},
                )
            worksheet = self._workbook[sheet_name]
            data_row_count = worksheet.max_row - 1
            if row_id < 0 or row_id >= data_row_count:
                raise GXError(
                    "S004",
                    f"数据行不存在或越界: row_id={row_id}",
                    module="storage",
                    context={"sheet_name": sheet_name, "row_id": row_id},
                )
            excel_row = row_id + 2  # 表头为第 0 行，数据行从 0 编号
            headers = [str(cell.value) for cell in worksheet[1]]
            for column_index, header in enumerate(headers, start=1):
                if header in data:
                    worksheet.cell(
                        row=excel_row, column=column_index, value=data[header]
                    )
            self.save()

    def add_sheet(self, sheet_name: str, columns: list[str]) -> None:
        with self.lock():
            if sheet_name in self._workbook.sheetnames:
                raise GXError(
                    "S002",
                    f"工作表已存在: {sheet_name}",
                    module="storage",
                    context={"sheet_name": sheet_name},
                )
            worksheet = self._workbook.create_sheet(title=sheet_name)
            worksheet.append(columns)
            self.save()

    def remove_sheet(self, sheet_name: str) -> None:
        """删除工作表（种子脚本清理 openpyxl 默认工作表用）。"""
        with self.lock():
            self._ensure_sheet(sheet_name)
            if sheet_name == AUDIT_LOG:
                raise GXError(
                    "A001",
                    "audit_log 表只允许追加，禁止删除",
                    module="storage",
                    context={"sheet_name": sheet_name},
                )
            self._workbook.remove(self._workbook[sheet_name])
            if self._workbook.sheetnames:
                self.save()

    def save(self) -> None:
        self._workbook.save(self._path)

    def lock(self) -> MemoryLock:
        return self._lock

    def _ensure_sheet(self, sheet_name: str) -> None:
        if sheet_name not in self._workbook.sheetnames:
            raise GXError(
                "S002",
                f"工作表不存在: {sheet_name}",
                module="storage",
                context={"sheet_name": sheet_name},
            )
