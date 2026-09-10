# Sheets 官方题 v1（结构合规 + 真实后端）

日期：2026-09-10；分支 `codex/arc-harness`。

## 交付内容

`arcbench/agent/templates/sheet/`（由 web-react-express 复制改造）：

- `backend/`（Express，`/api/health` + 托管 frontend/dist）：
  - Workbook 生命周期：列表/新建/打开/重命名/删除；
  - Worksheet：新增/重命名/删除（至少保留一个）、切换；
  - 单元格：PATCH 增量写入、PUT 全量替换（供 undo/redo）；
  - 公式引擎：`=` 表达式 + `SUM/AVERAGE/MIN/MAX/COUNT`（范围 A1:B2）、
    四则运算与括号、引用替换、迭代重算（依赖变化后收敛）、错误
    `#DIV/0!` / `#VALUE!`；
  - 行列结构：指定位置插入/删除行/列（含单元格整体位移）；
  - 数据组织：按列升/降序排序、CSV 导入、CSV 导出；
- `frontend/`（Vite + React）：workbook 列表/新建、表格页
  （公式栏、单元格直编、行列操作、排序、worksheet 标签与增删改、
  CSV 导入、导出链接、Undo/Redo）。

## 本地验证

- API smoke `arcbench/runs/sheet-api-smoke.ps1`：
  SUM=5、AVERAGE=7.5、除零 `#DIV/0!`、插入/删除行位移正确、
  CSV 导入后升序排序 1..3、导出首行 `2,10,#DIV/0!`、worksheet 重命名；
- Playwright UI smoke `arcbench/upstream/smoke/sheet/sheet-ui.spec.ts`：
  新建 workbook → A1=2/A2=3/A3=SUM(A1:A2) 显示 5 → 新增工作表 Extra →
  CSV 导入 → 编辑后 Undo 回落，1 passed。

## 与 24 需求的关系 / 后续

- 已覆盖：REQ-1 生命周期（除分享/权限外）、REQ-2 结构操作、REQ-3 编辑
  （直编/公式栏/区域粘贴尚未做 2D 粘贴与区域选择 UI）、REQ-4 公式
  （基本/聚合/相对引用复制待补）、REQ-5 排序/CSV（筛选、校验下拉、
  透视表待补）；
- 后续候选：区域选择与二维粘贴/剪切、相对引用复制重写、数据校验下拉、
  按条件筛选、透视表创建/刷新、workbook 共享与访问控制。

