# ARC-Bench 最小提交 Agent（P2 本地自测版）

## 目录

- `main.py`：平台入口，读取需求包 → 生成应用 → 自测 → 上报 SDK 事件与 traceability → git 提交。
- `requirements.txt`：PyYAML。
- `arcbench_agent_runtime/`：本地 SDK mock，平台运行时用真包替换。
- `templates/keep/index.html`：keep 任务的参考生成模板。

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

`requirements-source` 可以是目录（内含 `requirements.yaml`）或 yaml 文件；
平台环境会注入真实 `arcbench_agent_runtime`，本包只负责生成实现与上报状态。
