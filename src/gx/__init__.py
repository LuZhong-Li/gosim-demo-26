"""GX-Sheet 核心包。

可编辑安装（pip install -e .）只把 src/ 挂到 sys.path；
根目录的 constants/config/errors 顶层模块在这里补充挂载，
保证 `gx` 命令与 `python -m gx` 可用。
"""

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
