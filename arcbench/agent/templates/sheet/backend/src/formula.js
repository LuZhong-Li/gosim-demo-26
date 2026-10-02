// Formula evaluation for the spreadsheet task.
//
// Every cell keeps the text the user typed. A cell whose text starts with "="
// is a formula: it is parsed here, evaluated against the worksheet, and its
// result is what the grid shows while the raw text stays in the formula bar -
// which is exactly what REQ-4-1-1 (basic expressions and aggregate functions),
// REQ-4-1-2 (copying a formula adjusts relative references) and REQ-4-2-1
// (recalculate dependents after the source changes) describe.

const CELL_REF = /^([A-Za-z]{1,3})([0-9]{1,7})$/;

function columnIndex(letters) {
  let index = 0;
  for (const char of String(letters).toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index; // 1-based
}

function columnName(index) {
  let value = Math.max(1, Math.trunc(index));
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function parseRef(reference) {
  const match = CELL_REF.exec(String(reference || '').trim());
  if (!match) return null;
  const column = columnIndex(match[1]);
  const row = Number(match[2]);
  if (!row) return null;
  return { column, row, key: `${columnName(column)}${row}` };
}

function parseRange(range) {
  const parts = String(range || '').split(':');
  const start = parseRef(parts[0]);
  const end = parseRef(parts[1] || parts[0]);
  if (!start || !end) return null;
  return {
    start,
    end,
    rows: [Math.min(start.row, end.row), Math.max(start.row, end.row)],
    columns: [Math.min(start.column, end.column), Math.max(start.column, end.column)],
  };
}

function rangeKeys(range) {
  const parsed = parseRange(range);
  if (!parsed) return [];
  const keys = [];
  for (let row = parsed.rows[0]; row <= parsed.rows[1]; row += 1) {
    for (let column = parsed.columns[0]; column <= parsed.columns[1]; column += 1) {
      keys.push(`${columnName(column)}${row}`);
    }
  }
  return keys;
}

//: Shift a single reference by a row/column delta (REQ-4-1-2). "$" pins a part.
function shiftRef(reference, rowDelta, columnDelta) {
  const match = /^(\$?)([A-Za-z]{1,3})(\$?)([0-9]{1,7})$/.exec(String(reference || ''));
  if (!match) return reference;
  const letters = match[2];
  const row = Number(match[4]);
  const nextColumn = match[1] ? letters : columnName(Math.max(1, columnIndex(letters) + columnDelta));
  const nextRow = match[3] ? row : Math.max(1, row + rowDelta);
  return `${match[1]}${nextColumn}${match[3]}${nextRow}`;
}

function shiftFormula(formula, rowDelta, columnDelta) {
  const source = String(formula || '');
  if (!source.startsWith('=')) return source;
  return source.replace(
    /(\$?[A-Za-z]{1,3}\$?[0-9]{1,7})/g,
    (match) => shiftRef(match, rowDelta, columnDelta),
  );
}

const ERROR_VALUES = ['#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#N/A', '#NUM!'];

function isError(value) {
  return typeof value === 'string' && ERROR_VALUES.includes(value);
}

function numeric(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function aggregate(name, values) {
  const numbers = values.filter((value) => value !== '' && value !== null && value !== undefined)
    .map((value) => numeric(value));
  switch (name) {
    case 'SUM':
      return numbers.reduce((total, value) => total + value, 0);
    case 'AVERAGE':
      return numbers.length ? numbers.reduce((total, value) => total + value, 0) / numbers.length : 0;
    case 'COUNT':
      return numbers.length;
    case 'MIN':
      return numbers.length ? Math.min(...numbers) : 0;
    case 'MAX':
      return numbers.length ? Math.max(...numbers) : 0;
    case 'PRODUCT':
      return numbers.length ? numbers.reduce((total, value) => total * value, 1) : 0;
    default:
      return null;
  }
}

//: Evaluate a formula body against a worksheet ("A1+B1", "SUM(A1:A5)*2", ...).
function evaluate(expression, readCell, depth = 0) {
  if (depth > 32) return '#REF!';
  let text = String(expression || '').trim();
  if (text.startsWith('=')) text = text.slice(1);
  if (!text) return '';

  // Functions first: replace each call with its computed number.
  const callPattern = /\b([A-Z]+)\s*\(([^()]*)\)/gi;
  let guard = 0;
  while (callPattern.test(text) && guard < 32) {
    guard += 1;
    text = text.replace(callPattern, (match, name, argument) => {
      const upper = String(name).toUpperCase();
      const values = [];
      for (const piece of String(argument).split(',')) {
        const token = piece.trim();
        if (!token) continue;
        if (token.includes(':')) {
          values.push(...rangeKeys(token).map((key) => readCell(key)));
        } else if (parseRef(token)) {
          values.push(readCell(parseRef(token).key));
        } else {
          values.push(token);
        }
      }
      const result = aggregate(upper, values);
      if (result === null) return `#NAME?`;
      return `(${result})`;
    });
  }

  // Then cell references.
  text = text.replace(/\$?[A-Za-z]{1,3}\$?[0-9]{1,7}/g, (match) => {
    const cleaned = match.replace(/\$/g, '');
    const ref = parseRef(cleaned);
    if (!ref) return '0';
    const raw = readCell(ref.key);
    if (isError(raw)) return JSON.stringify(raw);
    if (raw === null || raw === undefined || raw === '') return '0';
    const asNumber = Number(String(raw).replace(/,/g, ''));
    return Number.isNaN(asNumber) ? JSON.stringify(String(raw)) : String(asNumber);
  });

  if (!/^[0-9+\-*/(). "\s%^eE]+$/.test(text)) return '#NAME?';
  try {
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict";return (${text});`)();
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return '#DIV/0!';
      return String(Math.round(value * 1e10) / 1e10);
    }
    return String(value);
  } catch (error) {
    return '#VALUE!';
  }
}

module.exports = {
  aggregate,
  columnIndex,
  columnName,
  evaluate,
  isError,
  numeric,
  parseRange,
  parseRef,
  rangeKeys,
  shiftFormula,
  shiftRef,
};
