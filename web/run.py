"""启动脚本：python -m web.run [--reset] [--port 8765]。

--reset 会重建种子工作簿并清空 Web trace，不影响正式 demo 基线。
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
for path in (ROOT, SRC):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from config import WEB_TRACE_PATH, WEB_WORKBOOK_PATH
from demo.init_seed import create_seed_workbook
from web.server import make_server


def build_app_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="GX-Sheet Web 演示")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--workbook", default=WEB_WORKBOOK_PATH)
    parser.add_argument("--trace", default=WEB_TRACE_PATH)
    parser.add_argument("--actor", type=int, default=1)
    parser.add_argument("--reset", action="store_true", help="重建种子工作簿并清空 Web trace")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = build_app_args(argv)
    if args.reset:
        trace_path = Path(args.trace)
        trace_path.parent.mkdir(parents=True, exist_ok=True)
        if trace_path.exists():
            trace_path.unlink()
        Path(args.workbook).parent.mkdir(parents=True, exist_ok=True)
        create_seed_workbook(args.workbook)
        print(f"[OK] Web 种子工作簿已重建: {args.workbook}")
    server = make_server(
        args.workbook,
        trace_path=args.trace,
        host=args.host,
        port=args.port,
        actor=args.actor,
    )
    host, port = server.server_address[:2]
    print(f"[OK] GX-Sheet Web: http://{host}:{port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
