# ARC-Bench 最小提交 Agent（P2 本地自测版）

## 目录

- `main.py`：平台入口，读取需求包 → 生成应用 → 自测 → 上报 SDK 事件与 traceability → git 提交。
- `requirements.txt`：PyYAML。
- `arcbench_agent_runtime/`：vendor 自 code-philia/agentic-requirement-compiler 的
  真实 SDK（平台不预装，需随包上传）。
- `templates/keep/index.html`：keep 任务的参考生成模板。
- `templates/web-react-express/`：官方 frontend/ + backend/ 单端口 Web 模板，
  平台要求生成产物含这两个目录；未知任务默认落此模板。

## 本地自测

平台真实调用（已在失败 run 日志确认）：

```bash
python3 main.py <requirements-source> --output-dir <output-dir>
```

本地自测：

```powershell
$env:PYTHONPATH = "arcbench/agent"
$env:ARC_TESTS_DIR = "arcbench/data/keep/tests"
$env:ARC_NODE = "<node.exe>"
$env:ARC_PLAYWRIGHT_CLI = "arcbench/upstream/node_modules/@playwright/test/cli.js"
$env:ARC_PLAYWRIGHT_CONFIG = "arcbench/upstream/playwright.config.ts"
python arcbench/agent/main.py arcbench/data/keep/requirements --output-dir arcbench/runs/keep-cli
```

`requirements-source` 可以是目录（内含 `requirements.yaml`）或 yaml 文件。

平台结构校验：web 任务生成产物必须含 `frontend/` 与 `backend/`
（backend 监听 `PORT`、暴露 `/api/health`、托管 `frontend/dist`），
见 `notes/run3-platform.md`。
