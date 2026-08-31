"""pytest 根配置：确保仓库根目录在 sys.path 上，便于导入 src/ 与根模块。"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
