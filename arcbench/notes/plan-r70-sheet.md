# r70 首要项：Sheet 独立脚手架（templates/sheet/）

## 为什么 Sheet 一直是 0（已确认的机制性根因）

`main.py:1573-1575`：

```python
asset_slug = task_slug(task_name)          # "sheet"
task_map = load_task_map(asset_slug)
slug = asset_slug if (TEMPLATES / asset_slug).is_dir() else WEB_FALLBACK_TEMPLATE
```

`arcbench/agent/templates/` 下面**只有 `scaffold/`**（一份 GitHub 克隆：`/api/orgs`、
`/api/repos/:owner/:name/issues`、`gh_store.js` …）。所以 Sheet 任务拿到的是 GitHub
脚手架，模型必须在一次生成里同时发明整个表格应用；rehearsal 的探针因此报
`the seeded record \`Q3 Sales\` can never be served: the generated backend registers
no listing route at all`（`_r68_sheet_stdout.txt`），Sheet 每一轮都是 0。

只要补上 `templates/sheet/`，`task_slug()` 就会命中它，Sheet 不再复用 GitHub 脚手架。

## 需求给死的世界（必须预置，全部取自 requirements.yaml 原文）

- 工作簿 `Q3 Sales`（出现在 174 处），至少含工作表 `Sheet1`（111 处）、`Sheet2`（72 处）
- 示例数据（Region / Sales / Status）：`East/1200/Open`、`North/800/Closed`、`South/700/Open`
- 范围 `A1:C6`（表头行 + 数据行）、`A1=B1` 之类公式样例：`A1=2`、`B1=3`、`=A1+B1`、`=C1*2`
- 数字型校验样例：`Please enter a number from 0 to 100`

## 41 条原子需求（分组）

| 组 | 需求 | 关键控制名（原文） |
|---|---|---|
| REQ-1-1 | 查看/打开工作簿 | 首页工作簿列表，条目即 `Q3 Sales` |
| REQ-1-2 | 新建/重命名 | `New blank workbook`、`Rename workbook`、`Workbook name`、`Workbook name cannot be empty` |
| REQ-1-3 | CSV 导入/导出 | `Import CSV`、`CSV file`、`Confirm import`、`Invalid CSV file format. Import failed.`、`Export CSV`、`.csv` |
| REQ-2-1 | 工作表生命周期 | `Add worksheet`、`Worksheet options for <worksheet name>`、`Rename`、`Rename worksheet`、`Worksheet name`、`Worksheet name cannot be empty`、`Worksheet name already exists`、`Delete worksheet`、`A workbook must contain at least one worksheet` |
| REQ-2-2 | 行列结构 | `Insert 1 row above`、`Insert 1 row below`、`Delete row`、`Insert 1 column left`、`Insert 1 column right`、`Delete column` |
| REQ-3-1 | 单元格/区域编辑 | `Worksheet grid`、`Formula bar`、`Edit <cell coordinate>`、`Paste`、`A1`、`C3`、`A1:B2`、`D1:E2` |
| REQ-3-2 | 复制剪切 + 撤销重做 | `Undo`、`Redo` |
| REQ-4-1 | 公式与函数 | `=A1+B1`、`=C1*2`，聚合函数；相对引用复制 |
| REQ-4-2 | 依赖重算与错误 | 源数据改动后依赖公式重算；错误显示与修复 |
| REQ-5-1 | 排序/筛选 | `Sort range`、`Sort by`、`Order`、`Data has header row`、`Sort`、`Ascending`、`Descending`、`Create filter`、`Filter <header text>`、`Condition`、`Value`、`Text contains`、`Is empty`、`Is not empty`、`Greater than`、`Clear filter`、`Clear selection`、`Before` |
| REQ-5-2 | 数据校验 | `Data validation`、`Rule type`、`Dropdown`、`Allowed values`、`Number range`、`Minimum`、`Maximum`、`Apply`、`Delete rule`、`Source range: <cell range>`、`Open dropdown for <cell coordinate>` |
| REQ-5-3 | 数据透视 | `Create pivot table`、`Rows`、`Columns`、`Values`、`Summarize by`、`Refresh pivot table` |

完整抽取结果：`arcbench/runs/_sheet_req_names.txt`（41 条原子需求 + 123 个字面量名，
含出现次数）。抽取脚本：`arcbench/runs/_sheet_req_dump.py`。

## 脚手架要交付什么（与 GitHub 脚手架同构）

```
templates/sheet/
  template.yaml                 # 与 scaffold/template.yaml 同结构
  coverage.json
  backend/
    package.json  .npmrc
    src/index.js                # 监听入口（守卫/播种会挂在这里）
    src/app.js                  # Express 路由：/api/workbooks, /:id/worksheets, /:id/cells,
                                #   /:id/sort, /:id/filter, /:id/validation, /:id/pivot
    src/store.js                # 内存 store（workbooks/worksheets/cells/formulas/filters/pivots）
    src/seed.js                 # 预置 Q3 Sales + Sheet1/Sheet2 + East/1200/Open 等示例数据
    src/formula.js              # 公式求值 + 依赖图 + 重算
    test/*.test.js              # 与 GitHub 脚手架同风格的本地测试
  frontend/
    package.json  vite.config.js  eslint.config.js  index.html
    src/main.tsx  src/App.tsx   # Routes + 头部导航
    src/api/index.ts            # 上述 REST 的客户端
    src/pages/WorkbookHomePage.tsx   # 列表 + `New blank workbook` + `Import CSV`
    src/pages/WorkbookEditorPage.tsx # `Worksheet grid` + `Formula bar` + 工作表标签 +
                                     #   行列菜单 + `Data validation` + `Create filter` +
                                     #   `Create pivot table` + `Export CSV`
    src/components/Grid.tsx     # 可编辑网格（role=grid，单元格 `Edit <coordinate>`）
```

关键点：

1. **列表路由必须存在**：`GET /api/workbooks` 返回 `Q3 Sales`，首页从它渲染 —— 这正是
   `verify.probe_seeded_record()` 检查的那件事（`records` 探针找不到列表路由就直接判失败）。
2. 网格控件要能被 `getByRole` 命中：单元格用 `role="gridcell"` + `aria-label="A1"`，
   可编辑态用 `Edit A1`，下拉用 `Open dropdown for A1`，工作表选项用
   `Worksheet options for Sheet1`。
3. 公式引擎放在后端（`=A1+B1` 之类），前端只提交原始串；重算与错误码走 `/cells` 的返回。
4. 与 GitHub 脚手架共享同一套 ARC 守卫（`ensure_app_router`、`_splice_routes`、
   `ensure_startup_seed_world` 对 sheet 文本不触发，因为文本里没有那批账号名）。

## 落地顺序（r70）

1. 先把 `templates/sheet/template.yaml` + `coverage.json` + backend 骨架写出来，本地
   `npm start` + `GET /api/workbooks` 能返回 `Q3 Sales`。
2. 再写 frontend（先网格 + 首页列表，再行列/排序/筛选/校验/透视）。
3. 本地跑 `verify.probe_seeded_record` 风格的探针（列表路由 + 种子记录）确认通过。
4. 打包 → 上传 → 起跑，重点看 Sheet 的 `Run Status` 里
   `the seeded record \`Q3 Sales\` ...` 这条探针是否消失。

> 注意：r69 的 5 个 run 仍在跑（11:07 UTC 起），Sheet 脚手架属于 r70，**不与
> 运行中的提交并发上传**。
