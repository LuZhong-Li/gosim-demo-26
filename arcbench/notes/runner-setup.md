# P1 runner 安装记录

记录日期：2026-09-08。

| 项 | 值 |
| --- | --- |
| 官方仓库 | https://github.com/code-philia/arc-bench.git |
| clone 提交 | `d0b7a21` |
| Node | v24.19.0（工作区自带，无 npm） |
| 包管理器 | pnpm v11.19.0（`pnpm.cmd`，替代 `npm`） |
| @playwright/test | 1.61.1 |
| Playwright 浏览器 | chromium + ffmpeg + headless shell + winldd 已装（`playwright install chromium`） |

本机命令适配：

```powershell
$PNPM = "C:\Users\HW\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
& $PNPM install
& $PNPM exec playwright install chromium
& "D:\gosim-demo-26\arcbench\upstream\node_modules\.bin\playwright.CMD" --version
```

`package.json` 脚本经 pnpm 运行时等价于官方 `npm run ...`（如
`pnpm run test -- --app keep --target-url http://127.0.0.1:3301`）。
