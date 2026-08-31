"""pytest 根配置：确保仓库根目录与 src/ 在 sys.path 上，便于导入根模块与 gx 包。"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
for path in (ROOT, SRC):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))
