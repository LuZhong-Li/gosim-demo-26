"""Zip a staged agent tree exactly the way the submitted packages were built.

Usage: py -3 arcbench/runs/_pack_agent_zip.py <stage-dir> <out.zip>

The previous submissions (r73/r74/r76) all had the stage contents at the zip
root, forward-slash entry names and a single extra entry for the one empty
directory in the tree (``templates/scaffold/backend/src/database/``), which is
what ``zipfile.write()`` produces for a directory. Compress-Archive drops it, so
the packaging step uses this script instead.
"""

from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    stage = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    if not stage.is_dir():
        print(f"stage dir missing: {stage}")
        return 2
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        for root, dirs, files in os.walk(stage):
            dirs.sort()
            for name in dirs:
                path = Path(root) / name
                if not any(path.iterdir()):
                    archive.write(path, str(path.relative_to(stage)).replace(os.sep, "/") + "/")
                    count += 1
            for name in sorted(files):
                path = Path(root) / name
                archive.write(path, str(path.relative_to(stage)).replace(os.sep, "/"))
                count += 1
    print(f"{out.name}: {count} entries, {out.stat().st_size / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
