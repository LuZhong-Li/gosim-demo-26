// Seed data for the spreadsheet task.
//
// The scenario text is explicit about the world the first step opens:
//   "The evaluation seed contains the seeded workbook `Q3 Sales`"
//   "the seeded workbook `Q3 Sales` ... worksheet `Sheet1`"
//   header row Region/Sales/Status with East/1200/Open, North/800/Closed,
//   South/700/Open, and a second worksheet `Sheet2` with Item/Qty (Pen/4).
// Every server start recreates these records so refresh, re-login and the
// "Last updated" line keep showing the same workbook.

const ROWS = [
  ['Region', 'Sales', 'Status'],
  ['East', '1200', 'Open'],
  ['North', '800', 'Closed'],
  ['South', '700', 'Open'],
];

const SHEET2 = [
  ['Item', 'Qty'],
  ['Pen', '4'],
];

function cellsFromMatrix(matrix) {
  const columns = ['A', 'B', 'C', 'D', 'E'];
  const cells = {};
  matrix.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      cells[`${columns[columnIndex]}${rowIndex + 1}`] = { raw: String(value) };
    });
  });
  return cells;
}

function seed(store) {
  const existing = store.findWorkbook('Q3 Sales');
  if (existing) return existing;

  const sheet1 = store.createWorksheet('Sheet1', {
    cells: cellsFromMatrix(ROWS),
    rowCount: 60,
    columnCount: 12,
  });
  const sheet2 = store.createWorksheet('Sheet2', {
    cells: cellsFromMatrix(SHEET2),
    rowCount: 60,
    columnCount: 12,
  });
  const workbook = store.createWorkbook('Q3 Sales', [sheet1, sheet2]);
  workbook.lastUpdated = 'Q3';
  return workbook;
}

module.exports = { ROWS, SHEET2, seed };
