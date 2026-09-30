# Agent 输出端到端核对（2026-09-30）

此前所有测试都是直接跑 `templates/`，而平台跑的是 **agent 复制出来的工程**。
这一步补上那段链路：`main.py` → 生成工程 → 装依赖 → `vite build` → 起后端 → Playwright。

## 怎么跑

```powershell
cd arcbench/agent
$env:ARC_SKIP_TESTS='1'
python main.py ..\runs\github\requirements --output-dir <out>\r33
python main.py ..\runs\sheet\requirements  --output-dir <out>\sheet

# 平台随后会 npm install + vite build；本地用目录联接模拟（避免联网）
New-Item -ItemType Junction -Path <out>\r33\frontend\node_modules -Target ...\templates\github\frontend\node_modules
cd <out>\r33\frontend; npx vite build

# 起服务后跑本仓库的 e2e
$env:TARGET_URL='http://127.0.0.1:3303'
node node_modules/@playwright/test/cli.js test --config ../notes/r33-regression.config.cjs --workers 1 --reporter list
```

结果：生成的 GitHub 工程 4/4、生成的 Sheet 工程 4/4（`notes/github-r33-regression.spec.ts`、
`notes/sheet-r33-clipboard.spec.ts`）。

## 过程中踩到的两个坑

### 1. agent 忽略了 template.yaml 的 copy.exclude（已修）

`main.py` 原来用 `shutil.copytree` 整目录复制，把模板里的 `node_modules` 一起带走，
而且是**残缺拷贝**（express 在、body-parser 不在），启动直接 `MODULE_NOT_FOUND`。
平台随后会 `npm install` 覆盖掉，所以线上没暴露，但生成物畸形、体积暴涨。
现在 `copy_template` 会读 `template.yaml` 的 `copy.exclude`，并始终排除
`node_modules` / `dist` / `.git` / `__pycache__` / `.arc-test-db` / `template.yaml`。

### 2. 输出目录以点开头会让 SPA 回退 404（本地环境坑，非代码问题）

`express.static` 与 `res.sendFile` 默认 `dotfiles: 'ignore'`。把工程生成到
`.tmp-agent-check/` 这类**点开头**的目录里时，`/` 由 static 正常返回 index.html，
但 SPA 回退里的 `sendFile(绝对路径)` 会因为路径中含点开头目录段被判 404。
换成非点开头目录即恢复正常。平台输出目录不是这种命名，故不影响评测；
记在这里是为了下次别再用点开头目录做这类验证。
