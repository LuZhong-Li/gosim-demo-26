# Spreadsheets 复刻题 · 数据模型提示

先读 `../requirement-map.json`，再按本提示实现。目标是“界面像 Google Sheets”
的在线表格，刷新后恢复工作簿/工作表/活动表/矩形区域/公式结果。

## 对象

- workbook：id、name、worksheets[]、active_worksheet、created/updated。
- worksheet：id、workbook_id、name、order、cells、row_count、col_count。
- cell：key=`<sheet>:<col><row>`、raw、display、formula、style/validation、
  dependency_set。
- range：矩形区域，用于选择/复制/排序/筛选/校验/透视。
- operation history：undo/redo 栈。

## 关键语义

- 主页列出 workbook；打开进入编辑器，编辑器只作用于当前活动 worksheet。
- CSV 导入创建 workbook；CSV 导出当前 worksheet。
- 行列插入/删除只影响当前 sheet。
- 公式：基本表达式 + 聚合函数（SUM/AVG/COUNT/MIN/MAX 至少），相对引用复制时
  调整引用；源变化触发依赖重算；错误单元格可显示并修复。
- 校验：范围级下拉或数值校验。
- 排序/筛选只影响当前范围；透视表可创建并刷新。
