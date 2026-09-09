# ARC-Bench 最小提交 Agent（P2 本地自测版）

## 目录

- `main.py`：平台入口，读取需求包 → 生成应用 → 自测 → 上报 SDK 事件与 traceability → git 提交。
- `requirements.txt`：PyYAML。
- `arcbench_agent_runtime/`：本地 SDK mock，平台运行时用真包替换。
- `templates/keep/index.html`：keep 任务的参考生成模板。

## 本地自测

```powershell
$env:PYTHONPATH = "arcbench/agent"
$env:ARC_WORKSPACE = "arcbench/runs/keep"
$env:ARC_REQUIREMENTS_DIR = "arcbench/data/keep/requirements"
$env:ARC_TESTS_DIR = "arcbench/data/keep/tests"
$env:ARC_NODE = "<node.exe>"
$env:ARC_PLAYWRIGHT_CLI = "arcbench/upstream/node_modules/@playwright/test/cli.js"
$env:ARC_PLAYWRIGHT_CONFIG = "arcbench/upstream/playwright.config.ts"
python arcbench/agent/main.py
```

平台真实环境会注入 `arcbench_agent_runtime` 并分别挂载需求/测试目录，本包只负责
生成实现与上报状态。
