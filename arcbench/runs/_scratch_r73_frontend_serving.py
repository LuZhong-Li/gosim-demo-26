"""The app has to serve frontend/dist, or every browser scenario fails at goto('/').

Proof against the real r71 Stage 1 workspace: before the fix GET / was
"ENOENT ... backend/src/frontend/dist/index.html" (404); after it, 200 + the built
index.html.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

import time as _time

# A fresh directory per run: the previous run's patch must never be mistaken for
# the "before" state.
WORK = Path(f"D:/gosim-demo-26/arcbench/runs/_scratch_r73_serving_{int(_time.time())}")
SOURCE = Path("D:/gosim-demo-26/arcbench/runs/_r71_artifacts/205ed8a34f2f/template")
NODE = Path("C:/Users/HW/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe")
#: Hoisted backend dependencies, so the probe boots without npm.
DEPS_ZIP = Path("D:/gosim-demo-26/arcbench/dist/selftest-r71-ghstage1-served.zip")
PORT = 3811


def prepare() -> None:
    for name in ("backend", "frontend"):
        target = WORK / name
        if not target.is_dir():
            shutil.copytree(SOURCE / name, target,
                            ignore=shutil.ignore_patterns("node_modules"), dirs_exist_ok=True)
    # The image ships a built dist; copy the one we built during the selftest prep.
    built = Path("D:/gosim-demo-26/arcbench/runs/_selftest_r71_stage1/frontend/dist")
    if built.is_dir():
        shutil.copytree(built, WORK / "frontend" / "dist", dirs_exist_ok=True)
    # Reuse the installed backend deps so this runs offline.
    # (pnpm's store uses symlinks that do not survive a copy, so the caller
    # installs the dependencies into the fresh directory once.)
    manifest = WORK / "backend" / "node_modules" / "express" / "package.json"
    if not manifest.is_file() and DEPS_ZIP.is_file():
        with zipfile.ZipFile(DEPS_ZIP) as archive:
            archive.extractall(WORK, members=[name for name in archive.namelist()
                                              if name.startswith("backend/node_modules/")])


def boot_and_check(label: str) -> tuple[int, str]:
    env = {"PATH": str(NODE.parent), "PORT": str(PORT), "SystemRoot": "C:\\Windows",
           "TEMP": "C:\\Windows\\Temp", "TMP": "C:\\Windows\\Temp"}
    process = subprocess.Popen(
        [str(NODE), "src/index.js"], cwd=str(WORK / "backend"),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env,
    )
    try:
        for _ in range(20):
            time.sleep(0.5)
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=3) as response:
                    # The built index.html puts <meta>/<link> tags before the mount
                    # node, so 400 bytes is not enough to see #root.
                    body = response.read(4000).decode("utf-8", "ignore")
                    return response.status, body
            except urllib.error.HTTPError as error:
                return error.code, error.read(200).decode("utf-8", "ignore")
            except Exception:
                continue
        return 0, "no response"
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except Exception:
            process.kill()


def main() -> None:
    prepare()
    before = boot_and_check("before")
    print("BEFORE status:", before[0], before[1][:80].replace("\n", " "))

    changed = guard.ensure_frontend_serving(WORK)
    print("ensure_frontend_serving ->", changed)
    assert changed, "the broken SPA fallback must be detected"
    assert guard.ensure_frontend_serving(WORK) == [], "the pass must be idempotent"

    # r82's shape: the generated path was one directory short and spelled with a
    # nested path.join(), which the old narrow pattern never matched.
    app_js = WORK / "backend" / "src" / "app.js"
    original = app_js.read_text(encoding="utf-8")
    probe_body = (
        original
        + "\n// ARC probe: the r82 spellings\n"
        + "app.get('/probe-one', (req, res) => res.sendFile("
          "path.join(__dirname, '..', 'frontend', 'dist', 'index.html')));\n"
        + "app.get('/probe-two', (req, res) => "
          "res.sendFile('frontend/dist/index.html', { root: __dirname }));\n"
    )
    app_js.write_text(probe_body, encoding="utf-8")
    repointed = guard.ensure_frontend_serving(WORK)
    rewritten = app_js.read_text(encoding="utf-8")
    print("r82-spelling rewrite ->", repointed)
    assert "path.join(__dirname, '..', 'frontend'" not in rewritten, \
        "the nested-path sendFile survived the rewrite"
    assert rewritten.count("sendFile(__arcDistIndex)") >= 3, rewritten[-400:]

    after = boot_and_check("after")
    print("AFTER status:", after[0], after[1][:60].replace("\n", " "))
    assert after[0] == 200, after
    assert "<div id=\"root\">" in after[1], after[1][:200]
    print("DONE")


if __name__ == "__main__":
    main()
