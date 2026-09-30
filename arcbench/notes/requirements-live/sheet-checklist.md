# sheet: live-spec fix checklist

105 checkable assertions across 24 requirements
(filtered from the raw delta; generic scenario boilerplate removed)

## Summary

| Requirement | Assertions |
| --- | --- |
| REQ-5-3-1 Create and Refresh a Basic Pivot Table | 9 |
| REQ-3-2-2 Undo and Redo Recent Operations | 7 |
| REQ-5-2-1 Set Dropdown or Numeric Validation for a Range | 7 |
| REQ-2-2-1 Insert and Delete Rows | 6 |
| REQ-2-2-2 Insert and Delete Columns | 6 |
| REQ-3-1-2 Paste Two-Dimensional Table Data | 6 |
| REQ-5-1-1 Sort a Data Range by a Specified Column | 6 |
| REQ-2-1-2 Switch Worksheets | 5 |
| REQ-3-2-1 Copy, Cut, and Paste Cell Ranges | 5 |
| REQ-4-1-1 Calculate Basic Expressions and Aggregate Functions | 5 |
| REQ-4-2-2 Display and Fix Formula Errors | 5 |
| REQ-5-1-2 Filter Rows by Value or Condition | 5 |
| REQ-1-3-1 Import CSV to Create a Workbook | 4 |
| REQ-1-3-2 Export the Current Worksheet as CSV | 4 |
| REQ-2-1-4 Delete a Worksheet | 4 |
| REQ-3-1-1 Edit a Cell Through the Grid or Formula Bar | 4 |
| REQ-2-1-3 Rename a Worksheet | 3 |
| REQ-4-2-1 Recalculate Dependent Formulas After Source Data Changes | 3 |
| REQ-1-1-1 View and Open a Workbook | 2 |
| REQ-1-2-2 Rename a Workbook | 2 |
| REQ-2-1-1 Add a Worksheet | 2 |
| REQ-3-1-3 Select a Rectangular Cell Range | 2 |
| REQ-4-1-2 Copy Formulas and Adjust Relative References | 2 |
| REQ-1-2-1 Create a Blank Workbook | 1 |

## Checklist

### REQ-5-3-1 Create and Refresh a Basic Pivot Table

- [ ] The application exposes the observable result for "the requested workflow Pivot1 the requested workflow Region the requested workflow Sales,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow COUNT the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "AVERAGE the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow COUNT the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-3-2-2 Undo and Redo Recent Operations

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-5-2-1 Set Dropdown or Numeric Validation for a Range

- [ ] In the persisted multi-cell 0-to-100 boundary scenario, rejecting 101 in B3 displays "Please enter a number from 0 to 100".
- [ ] The application exposes the observable result for "the requested workflow A1:A2 the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-2-2-1 Insert and Delete Rows

- [ ] If a shifted 0-to-100 numeric validation rule rejects an out-of-range value, the page displays "Please enter a number from 0 to 100".
- [ ] The application exposes the observable result for "the requested workflow 3 the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow 3 the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-2-2-2 Insert and Delete Columns

- [ ] If a shifted 0-to-100 numeric validation rule rejects an out-of-range value, the page displays "Please enter a number from 0 to 100".
- [ ] The application exposes the observable result for "the requested workflow B the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow B the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-3-1-2 Paste Two-Dimensional Table Data

- [ ] The full paste either updates every cell in the rectangle and persists after refresh, or displays an error while all target cells retain their original values; when a 0-to-100 numeric validation rule rejects the paste, that error is "Please enter a number from 0 to 100".
- [ ] The application exposes the observable result for "the requested workflow B2 the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow A1 the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow C3 the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-5-1-1 Sort a Data Range by a Specified Column

- [ ] The application exposes the observable result for "the requested workflow Sales the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow ISO the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-2-1-2 Switch Worksheets

- [ ] The application exposes the observable result for "the requested workflow, the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-3-2-1 Copy, Cut, and Paste Cell Ranges

- [ ] The source range, target range, and affected formulas must either all update and persist after refresh or all remain in their original state; when a target 0-to-100 numeric validation rule rejects the operation, the page displays "Please enter a number from 0 to 100".
- [ ] The application exposes the observable result for "the requested workflow A1:B2 the requested workflow D1:E2,the requested workflow, the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow A1:B2 the requested workflow D1:E2,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-4-1-1 Calculate Basic Expressions and Aggregate Functions

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow, the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-4-2-2 Display and Fix Formula Errors

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-5-1-2 Filter Rows by Value or Condition

- [ ] The application exposes the observable result for "the requested workflow Region the requested workflow Sales the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow, the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "CSV the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-1-3-1 Import CSV to Create a Workbook

- [ ] The application exposes the observable result for "the requested workflow UTF-8 CSV,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow CSV the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow CSV,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow CSV,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-1-3-2 Export the Current Worksheet as CSV

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow Sheet1 the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-2-1-4 Delete a Worksheet

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-3-1-1 Edit a Cell Through the Grid or Formula Bar

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "Escape the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow, the requested workflow, the requested workflow, the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-2-1-3 Rename a Worksheet

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-4-2-1 Recalculate Dependent Formulas After Source Data Changes

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-1-1-1 View and Open a Workbook

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow page entry the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-1-2-2 Rename a Workbook

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-2-1-1 Add a Worksheet

- [ ] The application exposes the observable result for "the requested workflow Sheet2,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow SheetN the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-3-1-3 Select a Rectangular Cell Range

- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-4-1-2 Copy Formulas and Adjust Relative References

- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- [ ] The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.

### REQ-1-2-1 Create a Blank Workbook

- [ ] The application exposes the observable result for "the requested workflow,the requested workflow Sheet1 the requested workflow A1 the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
