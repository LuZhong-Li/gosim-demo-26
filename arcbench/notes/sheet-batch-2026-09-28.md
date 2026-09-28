# Sheet 模板对齐批次（2026-09-28）

## 背景

官网在这一天确认初赛为 9/24–9/30，平台恢复且官方赛道 `hackathon` 已挂 2 个任务包 /
200 条测试（`/api/competitions`）。正赛入口需要登录 + 确认队伍，本批次先做本地可验证的
代码优化：把 Sheet 模板对齐 `docs`/需求图里可读到的规格文本。

## 发现

1. **工作区里的 `templates/sheet/frontend/dist/` 是旧构建**（dist 被
   `.gitignore` 忽略、未入库，但本地 Playwright 跑的就是它）：用当前 `src` 重新
   `vite build` 后，`sheet-ui.spec.ts` 里原本 FAILED 的透视表用例直接转绿。GitHub
   模板重建后 hash 不变，说明只有 Sheet 的产物是旧的。平台侧会重新构建前端，
   所以这条不影响线上评分，但本地验收前必须先 `vite build`，否则测的是旧产物。
2. **网格缺少 REQ-3-1-3 要求的 ARIA 语义**：需求要求 `grid` 带
   `aria-multiselectable="true"`、每个单元格是 `gridcell` 且暴露
   `aria-selected`，并支持从一角拖到对角选中矩形。原实现只有
   `input[aria-label="Cell A1"]`，没有选区语义，也没有持久化。
3. **选区未持久化**：REQ-3-1-3 要求「每个工作表记住最近一次成功选区，刷新后
   aria-selected 不变，切换工作表互不覆盖」。
4. **透视表与 REQ-5-3-1 全面不符**：原实现是「四个文本框 + 一个按钮」，
   目标名固定 `Pivot`，无对话框、无 `PivotN` 命名、无 Grand Total、无
   AVERAGE、无刷新、无字段失效提示；而规格要求 `Create pivot table` 对话框
   （`Source range: A1:B6` + `New worksheet` 单选 + `Create`）、
   `Pivot table editor` 区域内 `Rows`/`Columns`/`Values`/`Summarize by`
   四个组合框与 `Apply`、`Refresh pivot table` 按钮。
5. **单元格提交竞态**（本次新发现的真 bug）：公式栏同步 effect
   `useEffect(..., [sheet, selected])` 会在提交响应回填时覆盖
   `editRef.current`。快速连续输入时，最后一格的输入会被写成上一格的值，
   或者整格丢失。用 `zz-debug` 临时用例抓到的请求日志：
   12 格输入后第 13 个 PATCH 写成 `A6`（应为 `B6`）。

## 本批次改动

### Sheet 后端

- `worksheets/:sheet/selection`：新增 `PUT`，持久化 `{anchor, focus}`；
  `sheetPayload` 返回 `selection`。
- 透视表重写：`POST /pivot` 只负责按选区建 `PivotN` 工作表并记录配置；
  `PUT .../pivot` 应用 `rowField/colField/valueField/agg` 并计算；
  `POST .../pivot/refresh` 用同一配置重算。引擎按「首次出现顺序」排列行列，
  输出 `SUM of <值字段>` 表头、`Grand Total` 行列，支持 SUM/COUNT/AVERAGE，
  字段失效时返回 `Pivot field no longer exists; please select the field again`
  且保留上一次结果。
- 行/列插入删除时同步平移/收缩透视表源区间（覆盖 REQ-5-3-1 的第 3、4 个场景）。

### Sheet 前端

- 网格：`role="grid"` + `aria-multiselectable="true"`，单元格改为
  `role="gridcell"` + `aria-label="Cell A1"` + `aria-selected`；
  支持拖拽选区、Shift 扩展；选区变化落库，切换工作表/刷新后恢复。
- 双击单元格打开行内编辑器（`aria-label="Edit A1"`），Enter 提交、Esc 取消。
- 数据菜单：`Data` 按钮 + `menuitem`「Create pivot table」；菜单关闭时同时
  保留同名直接按钮（避免按 accessible name 定位时出现重复匹配）。
- 新建透视表对话框与 `Pivot table editor` 区域，字段下拉直接使用源区间表头文本。
- 修复提交竞态：新增 `editingRefRef`，`commitCell` 优先使用「正在编辑的单元格」；
  公式栏同步 effect 在编辑进行中不再回填。

## 验证

| 配置 | 用例 | 结果 |
| --- | --- | --- |
| `arcbench/runs/sheet-grid.config.cjs` | 3（REQ-3-1-3 ×2、REQ-3-1-1 ×1） | 3 passed |
| `arcbench/runs/sheet-pivot.config.cjs` | 3（REQ-5-3-1 ×3） | 3 passed |
| `arcbench/runs/sheet-playwright.config.cjs` | 2（smoke） | 2 passed |
| `arcbench/runs/gh-batchA.config.cjs` | 12（GitHub 回归） | 12 passed |

运行方式（后端分别用 `PORT=3003` / `PORT=3002` 启动）：

```powershell
node arcbench/upstream/node_modules/@playwright/test/cli.js test --config arcbench/runs/sheet-pivot.config.cjs
```

## 下一步（未完成）

- **CSV 导入**：规格要求 `Import CSV` 对话框 + `CSV file` 文件控件 +
  `Confirm import`，当前是 textarea + 按钮；解析还要支持引号内逗号/换行/转义引号
  并拒绝未闭合引号。
- **列表校验下拉**：规格要求每个受控单元格暴露
  `Open dropdown for A1` 按钮，当前是直接渲染 `combobox`。
- **公式错误值**：`=A0`/未支持函数/畸形表达式应分别显示 `#REF!`/`#NAME?`/
  `#ERROR!`，当前统一 `#VALUE!`。
- **Undo/Redo 细化**：规格要求 Ctrl+Z/Ctrl+Y、重做分支失效、跨工作表隔离。
- GitHub 侧尚未重跑完整需求审计（本轮只做回归）。
