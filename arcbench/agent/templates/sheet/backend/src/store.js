// In-memory workbook store for the spreadsheet task.
//
// The evaluation seed is a workbook called `Q3 Sales` and the scenarios open it
// from the home page, so the store has to serve the listing (`GET /api/workbooks`),
// the workbook, and its worksheets/cells exactly as they were seeded. Cells keep
// the raw text the user typed; a formula's value is derived on read.

const path = require('path');
const formula = require(path.join(__dirname, 'formula.js'));

const DEFAULT_ROWS = 50;
const DEFAULT_COLUMNS = 12;

const state = {
  workbooks: [],
  nextId: 1,
};

function id(prefix) {
  const value = `${prefix}-${state.nextId}`;
  state.nextId += 1;
  return value;
}

function now() {
  return new Date().toISOString();
}

function cloneCells(cells) {
  return Object.keys(cells || {}).reduce((copy, key) => {
    copy[key] = { ...cells[key] };
    return copy;
  }, {});
}

function createWorksheet(name, options = {}) {
  return {
    id: id('ws'),
    name: String(name || 'Sheet1'),
    cells: cloneCells(options.cells || {}),
    rowCount: Number(options.rowCount || DEFAULT_ROWS),
    columnCount: Number(options.columnCount || DEFAULT_COLUMNS),
    filters: [],
    validations: Array.isArray(options.validations) ? options.validations.map((rule) => ({ ...rule })) : [],
    pivots: Array.isArray(options.pivots) ? options.pivots.map((pivot) => ({ ...pivot })) : [],
    updatedAt: now(),
  };
}

function createWorkbook(name, worksheets = []) {
  const workbook = {
    id: id('wb'),
    name: String(name || 'Untitled workbook'),
    worksheets: worksheets.length ? worksheets : [createWorksheet('Sheet1')],
    createdAt: now(),
    updatedAt: now(),
  };
  state.workbooks.unshift(workbook);
  return workbook;
}

function listWorkbooks() {
  return state.workbooks.map((workbook) => ({
    id: workbook.id,
    name: workbook.name,
    worksheetCount: workbook.worksheets.length,
    createdAt: workbook.createdAt,
    updatedAt: workbook.updatedAt,
  }));
}

function findWorkbook(reference) {
  const wanted = String(reference || '');
  return state.workbooks.find(
    (workbook) => workbook.id === wanted
      || workbook.name === wanted
      || workbook.name.toLowerCase() === wanted.toLowerCase(),
  ) || null;
}

function renameWorkbook(workbook, name) {
  workbook.name = String(name || '').trim();
  workbook.updatedAt = now();
  return workbook;
}

function removeWorkbook(workbook) {
  const index = state.workbooks.indexOf(workbook);
  if (index >= 0) state.workbooks.splice(index, 1);
}

function findWorksheet(workbook, reference) {
  const wanted = String(reference || '');
  return (workbook.worksheets || []).find(
    (sheet) => sheet.id === wanted
      || sheet.name === wanted
      || sheet.name.toLowerCase() === wanted.toLowerCase(),
  ) || null;
}

function addWorksheet(workbook, name) {
  const sheet = createWorksheet(name || `Sheet${workbook.worksheets.length + 1}`);
  workbook.worksheets.push(sheet);
  workbook.updatedAt = now();
  return sheet;
}

function renameWorksheet(workbook, sheet, name) {
  sheet.name = String(name || '').trim();
  sheet.updatedAt = now();
  workbook.updatedAt = now();
  return sheet;
}

function removeWorksheet(workbook, sheet) {
  const index = workbook.worksheets.indexOf(sheet);
  if (index >= 0) workbook.worksheets.splice(index, 1);
  workbook.updatedAt = now();
}

//: Raw text of a cell - what the formula bar shows and what the user typed.
function rawCell(sheet, key) {
  const cell = sheet.cells[String(key).toUpperCase()];
  return cell ? cell.raw : '';
}

//: Displayed value of a cell - literals as typed, formulas evaluated.
function displayCell(sheet, key) {
  const reference = String(key).toUpperCase();
  const cell = sheet.cells[reference];
  if (!cell) return '';
  const raw = cell.raw;
  if (typeof raw === 'string' && raw.startsWith('=')) {
    return formula.evaluate(raw, (target) => displayCell(sheet, target));
  }
  return raw;
}

function setCell(sheet, key, value) {
  const reference = String(key).toUpperCase();
  if (!formula.parseRef(reference)) return null;
  sheet.cells[reference] = { raw: value === null || value === undefined ? '' : String(value) };
  sheet.updatedAt = now();
  return sheet.cells[reference];
}

function formulaOf(sheet, key) {
  const cell = sheet.cells[String(key).toUpperCase()];
  if (!cell) return '';
  return typeof cell.raw === 'string' && cell.raw.startsWith('=') ? cell.raw : '';
}

function visibleValue(sheet, key) {
  return displayCell(sheet, key);
}

//: The whole worksheet as a value matrix, formulas resolved (pivot/sort/filter input).
function snapshot(sheet) {
  const rows = [];
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    const values = [];
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      values.push(displayCell(sheet, `${formula.columnName(column)}${row}`));
    }
    rows.push(values);
  }
  return rows;
}

function rangeMatrix(sheet, range) {
  const parsed = formula.parseRange(range);
  if (!parsed) return [];
  const matrix = [];
  for (let row = parsed.rows[0]; row <= parsed.rows[1]; row += 1) {
    const values = [];
    for (let column = parsed.columns[0]; column <= parsed.columns[1]; column += 1) {
      values.push(displayCell(sheet, `${formula.columnName(column)}${row}`));
    }
    matrix.push(values);
  }
  return matrix;
}

//: Paste a block at ``startKey``. With ``mode="paste-formula"`` the formulas are
//: shifted by the distance between the copied block (``sourceKey``) and the
//: destination, which is exactly what REQ-4-1-2 asks for: copying ``=B2*2`` from
//: C5 to C6 has to produce ``=B3*2``.
function pasteMatrix(sheet, startKey, matrix, mode = 'paste', sourceKey = null) {
  const start = formula.parseRef(startKey);
  if (!start || !Array.isArray(matrix)) return [];
  const source = sourceKey ? formula.parseRef(sourceKey) : null;
  const rowDelta = source ? start.row - source.row : 0;
  const columnDelta = source ? start.column - source.column : 0;
  const written = [];
  matrix.forEach((rowValues, rowOffset) => {
    (Array.isArray(rowValues) ? rowValues : [rowValues]).forEach((value, columnOffset) => {
      const key = `${formula.columnName(start.column + columnOffset)}${start.row + rowOffset}`;
      let text = value === null || value === undefined ? '' : String(value);
      if (mode === 'paste-formula' && source) {
        text = formula.shiftFormula(text, rowDelta, columnDelta);
      }
      setCell(sheet, key, text);
      written.push(key);
    });
  });
  return written;
}

function shiftCells(sheet, fromRow, delta) {
  const next = {};
  Object.keys(sheet.cells).forEach((key) => {
    const ref = formula.parseRef(key);
    if (!ref) return;
    const row = ref.row >= fromRow ? ref.row + delta : ref.row;
    if (row < 1) return;
    next[`${formula.columnName(ref.column)}${row}`] = sheet.cells[key];
  });
  sheet.cells = next;
}

function shiftColumns(sheet, fromColumn, delta) {
  const next = {};
  Object.keys(sheet.cells).forEach((key) => {
    const ref = formula.parseRef(key);
    if (!ref) return;
    const column = ref.column >= fromColumn ? ref.column + delta : ref.column;
    if (column < 1) return;
    next[`${formula.columnName(column)}${ref.row}`] = sheet.cells[key];
  });
  sheet.cells = next;
}

function insertRows(sheet, index, count = 1) {
  shiftCells(sheet, Number(index), Number(count));
  sheet.rowCount += Number(count);
  sheet.updatedAt = now();
}

function deleteRows(sheet, index, count = 1) {
  for (let step = 0; step < Number(count); step += 1) {
    Object.keys(sheet.cells).forEach((key) => {
      const ref = formula.parseRef(key);
      if (ref && ref.row === Number(index)) delete sheet.cells[key];
    });
    shiftCells(sheet, Number(index) + 1, -1);
  }
  sheet.rowCount = Math.max(1, sheet.rowCount - Number(count));
  sheet.updatedAt = now();
}

function insertColumns(sheet, index, count = 1) {
  shiftColumns(sheet, Number(index), Number(count));
  sheet.columnCount += Number(count);
  sheet.updatedAt = now();
}

function deleteColumns(sheet, index, count = 1) {
  for (let step = 0; step < Number(count); step += 1) {
    Object.keys(sheet.cells).forEach((key) => {
      const ref = formula.parseRef(key);
      if (ref && ref.column === Number(index)) delete sheet.cells[key];
    });
    shiftColumns(sheet, Number(index) + 1, -1);
  }
  sheet.columnCount = Math.max(1, sheet.columnCount - Number(count));
  sheet.updatedAt = now();
}

function columnEntries(sheet, range, hasHeader = true) {
  const matrix = rangeMatrix(sheet, range);
  if (!matrix.length) return { header: [], rows: [], width: 0 };
  const width = Math.max(...matrix.map((row) => row.length));
  const head = hasHeader ? matrix[0] : matrix[0].map((_, index) => formula.columnName(index + 1));
  const rows = hasHeader ? matrix.slice(1) : matrix.slice();
  return { header: head, rows, width };
}

//: REQ-5-1-1. ``column`` is the header text or the column letter of the range.
function sortRange(sheet, { range, column, order = 'ascending', hasHeader = true }) {
  const parsed = formula.parseRange(range);
  if (!parsed) return null;
  const { header, rows, width } = columnEntries(sheet, range, hasHeader);
  let index = header.findIndex((title) => String(title).trim() === String(column).trim());
  if (index < 0) {
    const ref = formula.parseRef(String(column).trim());
    if (ref) index = ref.column - parsed.columns[0];
  }
  if (index < 0 || index >= width) index = 0;
  const direction = String(order).toLowerCase().startsWith('desc') ? -1 : 1;
  const sorted = rows.slice().sort((left, right) => {
    const a = left[index] === undefined ? '' : left[index];
    const b = right[index] === undefined ? '' : right[index];
    const aNumber = Number(String(a).replace(/,/g, ''));
    const bNumber = Number(String(b).replace(/,/g, ''));
    const bothNumbers = a !== '' && b !== '' && !Number.isNaN(aNumber) && !Number.isNaN(bNumber);
    if (bothNumbers) return (aNumber - bNumber) * direction;
    return String(a).localeCompare(String(b)) * direction;
  });
  const matrix = hasHeader ? [header, ...sorted] : sorted;
  pasteMatrix(sheet, `${formula.columnName(parsed.columns[0])}${parsed.rows[0]}`, matrix);
  sheet.updatedAt = now();
  return { range, column: header[index], order, hasHeader };
}

function matchesCondition(value, condition, expected) {
  const text = String(value === undefined || value === null ? '' : value);
  const wanted = String(expected === undefined || expected === null ? '' : expected);
  switch (String(condition || '').toLowerCase()) {
    case 'is empty':
      return text.trim() === '';
    case 'is not empty':
      return text.trim() !== '';
    case 'text contains':
      return text.toLowerCase().includes(wanted.toLowerCase());
    case 'greater than':
      return Number(text.replace(/,/g, '')) > Number(wanted.replace(/,/g, ''));
    case 'before':
      return Date.parse(text) < Date.parse(wanted);
    case 'equals':
    default:
      return text === wanted;
  }
}

//: REQ-5-1-2. Returns the surviving row numbers for a filter over a range.
function filterRange(sheet, spec) {
  const parsed = formula.parseRange(spec.range);
  if (!parsed) return [];
  const { header, rows, width } = columnEntries(sheet, spec.range, spec.hasHeader !== false);
  let index = header.findIndex((title) => String(title).trim() === String(spec.column).trim());
  if (index < 0) {
    const ref = formula.parseRef(String(spec.column).trim());
    if (ref) index = ref.column - parsed.columns[0];
  }
  if (index < 0 || index >= width) index = 0;
  const firstDataRow = spec.hasHeader === false ? parsed.rows[0] : parsed.rows[0] + 1;
  const rowsOut = [];
  rows.forEach((values, offset) => {
    if (matchesCondition(values[index], spec.condition, spec.value)) {
      rowsOut.push(firstDataRow + offset);
    }
  });
  const record = {
    id: id('filter'),
    range: spec.range,
    column: header[index],
    condition: spec.condition || 'equals',
    value: spec.value === undefined ? '' : spec.value,
    rows: rowsOut,
  };
  sheet.filters = [record];
  sheet.updatedAt = now();
  return rowsOut;
}

function clearFilters(sheet) {
  sheet.filters = [];
  sheet.updatedAt = now();
}

const NUMBER_RANGE = /^\s*-?\d+(?:\.\d+)?\s*-\s*-?\d+(?:\.\d+)?\s*$/;

//: REQ-5-2-1 - dropdown (allowed values) or numeric-range validation for a range.
function addValidation(sheet, spec) {
  const parsed = formula.parseRange(spec.range);
  if (!parsed) return null;
  const rule = {
    id: id('rule'),
    range: spec.range,
    type: String(spec.type || 'dropdown').toLowerCase() === 'number range' ? 'number range' : 'dropdown',
    allowedValues: Array.isArray(spec.allowedValues)
      ? spec.allowedValues.map((value) => String(value))
      : String(spec.allowedValues || '').split(',').map((value) => value.trim()).filter(Boolean),
    minimum: spec.minimum === undefined || spec.minimum === '' ? null : Number(spec.minimum),
    maximum: spec.maximum === undefined || spec.maximum === '' ? null : Number(spec.maximum),
    message: spec.message || 'Please enter a number from 0 to 100',
  };
  sheet.validations = (sheet.validations || []).filter((item) => item.range !== rule.range);
  sheet.validations.push(rule);
  sheet.updatedAt = now();
  return rule;
}

function validationFor(sheet, key) {
  const reference = String(key).toUpperCase();
  const ref = formula.parseRef(reference);
  if (!ref) return null;
  return (sheet.validations || []).find((rule) => {
    const parsed = formula.parseRange(rule.range);
    if (!parsed) return false;
    return ref.row >= parsed.rows[0] && ref.row <= parsed.rows[1]
      && ref.column >= parsed.columns[0] && ref.column <= parsed.columns[1];
  }) || null;
}

//: ``null`` when the value passes; the visible message when it does not.
function validateValue(sheet, key, value) {
  const rule = validationFor(sheet, key);
  if (!rule) return null;
  const text = String(value === undefined || value === null ? '' : value).trim();
  if (text === '') return null;
  if (rule.type === 'dropdown') {
    if (!rule.allowedValues.length) return null;
    return rule.allowedValues.includes(text) ? null : rule.message;
  }
  const asNumber = Number(text.replace(/,/g, ''));
  if (Number.isNaN(asNumber)) return rule.message;
  if (rule.minimum !== null && asNumber < rule.minimum) return rule.message;
  if (rule.maximum !== null && asNumber > rule.maximum) return rule.message;
  return null;
}

function removeValidation(sheet, ruleId) {
  const before = (sheet.validations || []).length;
  sheet.validations = (sheet.validations || []).filter((rule) => rule.id !== ruleId && rule.range !== ruleId);
  sheet.updatedAt = now();
  return before - sheet.validations.length;
}

//: REQ-5-3-1 - group the source range by the row field, summarising a value field.
function buildPivot(sheet, spec) {
  const parsed = formula.parseRange(spec.range);
  if (!parsed) return null;
  const { header, rows, width } = columnEntries(sheet, spec.range, spec.hasHeader !== false);
  const rowIndex = Math.max(0, header.findIndex((title) => String(title).trim() === String(spec.rowField).trim()));
  const columnIndex = header.findIndex((title) => String(title).trim() === String(spec.columnField || '').trim());
  const valueIndex = Math.max(0, header.findIndex((title) => String(title).trim() === String(spec.valueField).trim()));
  const summarise = String(spec.summarizeBy || spec.summarize || 'SUM').toUpperCase();
  // REQ-5-3-1: SUM/AVERAGE over a column with no parseable numbers has to say so
  // and keep the previous result instead of publishing an empty pivot.
  if (summarise === 'SUM' || summarise === 'AVERAGE') {
    const numeric = rows
      .map((values) => String(values[valueIndex] === undefined ? '' : values[valueIndex]).replace(/,/g, '').trim())
      .filter((value) => value !== '' && !Number.isNaN(Number(value)));
    if (!numeric.length) {
      return { error: 'Value field requires numeric values' };
    }
  }
  const buckets = new Map();
  rows.forEach((values) => {
    const key = String(values[rowIndex] === undefined ? '' : values[rowIndex]);
    const columnKey = columnIndex >= 0 ? String(values[columnIndex] === undefined ? '' : values[columnIndex]) : '';
    const bucketKey = `${key}||${columnKey}`;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { row: key, column: columnKey, values: [] });
    }
    buckets.get(bucketKey).values.push(values[valueIndex] === undefined ? '' : values[valueIndex]);
  });
  const cells = Array.from(buckets.values()).map((bucket) => ({
    row: bucket.row,
    column: bucket.column,
    value: String(formula.aggregate(summarise, bucket.values) ?? 0),
  }));
  const pivot = {
    id: id('pivot'),
    range: spec.range,
    rowField: header[rowIndex],
    columnField: columnIndex >= 0 ? header[columnIndex] : '',
    valueField: header[valueIndex],
    summarizeBy: summarise,
    cells,
    widths: width,
    createdAt: now(),
    updatedAt: now(),
  };
  sheet.pivots = sheet.pivots || [];
  sheet.pivots.push(pivot);
  sheet.updatedAt = now();
  return pivot;
}

function refreshPivot(sheet, pivotId) {
  const pivot = (sheet.pivots || []).find((item) => item.id === pivotId);
  if (!pivot) return null;
  // REQ-5-3-1: refreshing after the source column disappeared has to say so
  // instead of rendering an empty pivot.
  const header = rangeMatrix(sheet, pivot.range)[0] || [];
  const needed = [pivot.rowField, pivot.valueField].filter(Boolean);
  if (needed.some((field) => !header.some((title) => String(title).trim() === String(field).trim()))) {
    return { error: 'Pivot field is no longer available. Select a new field.' };
  }
  const rebuilt = buildPivot(sheet, {
    range: pivot.range,
    rowField: pivot.rowField,
    columnField: pivot.columnField,
    valueField: pivot.valueField,
    summarizeBy: pivot.summarizeBy,
  });
  sheet.pivots = (sheet.pivots || []).filter((item) => item.id !== pivotId);
  if (rebuilt) rebuilt.id = pivotId;
  return rebuilt;
}

//: REQ-5-3-1: "New worksheet" puts the pivot on the first unused PivotN sheet.
function createPivotWorksheet(workbook, spec) {
  const used = new Set((workbook.worksheets || []).map((sheet) => sheet.name));
  let index = 1;
  while (used.has(`Pivot${index}`)) index += 1;
  const target = createWorksheet(`Pivot${index}`);
  workbook.worksheets.push(target);
  workbook.updatedAt = now();
  const pivot = buildPivot(target, spec);
  if (!pivot || pivot.error) {
    // Leave the workbook as it was when the spec is unusable.
    workbook.worksheets = workbook.worksheets.filter((sheet) => sheet !== target);
    return pivot || { error: 'Range is invalid' };
  }
  return { worksheet: target, pivot };
}

//: REQ-2-1-4: a worksheet another sheet's pivot still reads cannot be deleted.
function dependentPivot(workbook, sheet) {
  if (!workbook || !workbook.worksheets) return null;
  for (const other of workbook.worksheets) {
    if (other === sheet || other === undefined || other === null) continue;
    const pivots = other.pivots || [];
    if (pivots.length) {
      const header = new Set(
        rangeMatrix(sheet, `A1:${formula.columnName(Math.max(1, sheet.columnCount))}1`)[0] || [],
      );
      const shared = pivots.some((pivot) => [pivot.rowField, pivot.valueField]
        .filter(Boolean)
        .some((field) => header.has(field)));
      if (shared) return other;
    }
  }
  return null;
}

function removePivot(sheet, pivotId) {
  const before = (sheet.pivots || []).length;
  sheet.pivots = (sheet.pivots || []).filter((pivot) => pivot.id !== pivotId);
  sheet.updatedAt = now();
  return before - sheet.pivots.length;
}

module.exports = {
  NUMBER_RANGE,
  addValidation,
  addWorksheet,
  buildPivot,
  clearFilters,
  createWorkbook,
  createWorksheet,
  createPivotWorksheet,
  dependentPivot,
  deleteColumns,
  deleteRows,
  displayCell,
  filterRange,
  findWorkbook,
  findWorksheet,
  formulaOf,
  insertColumns,
  insertRows,
  listWorkbooks,
  pasteMatrix,
  rangeMatrix,
  rawCell,
  refreshPivot,
  removeValidation,
  removePivot,
  removeWorkbook,
  removeWorksheet,
  renameWorkbook,
  renameWorksheet,
  setCell,
  snapshot,
  sortRange,
  state,
  validateValue,
  validationFor,
  visibleValue,
};
