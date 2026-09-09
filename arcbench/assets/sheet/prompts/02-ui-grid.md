# Spreadsheets 复刻题 · 网格 UI 提示

供前端生成，保证 Playwright 可访问名称可命中。

## 页面

- 工作簿主页：新建/重命名/打开 workbook，CSV 导入入口。
- 编辑器：工具栏 + 网格 + 公式栏 + 工作表底部标签 + 行列菜单。

## 可访问名称与控件

- Workbook：New workbook、Rename workbook、Import CSV、Export CSV。
- Worksheet：Add sheet、Switch sheet、Rename sheet、Delete sheet。
- 行列：Insert row、Delete row、Insert column、Delete column。
- 单元格：公式栏编辑、单元格编辑、Copy / Cut / Paste、Undo / Redo。
- 公式：单元格输入以 `=` 开头的表达式；公式栏显示原始公式。
- 数据：Sort、Filter、Data validation、Pivot table。
- 错误：公式错误用可见提示并允许修复。

## 刷新一致性

刷新或重新打开 workbook 后：恢复 workbook 名、worksheet 顺序与名称、活动
worksheet、矩形数据区域、公式计算值与依赖关系。
