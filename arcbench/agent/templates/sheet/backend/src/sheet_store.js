// In-memory spreadsheet store with a small formula engine.

const state = { workbooks: [] };

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function colToIndex(letters) {
  let index = 0;
  for (const ch of letters.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index; // 1-based
}

function indexToCol(index) {
  let n = index;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function parseRef(ref) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(String(ref || '').trim());
  if (!match) return null;
  return { col: colToIndex(match[1]), row: Number(match[2]) };
}

function refOf(col, row) {
  return `${indexToCol(col)}${row}`;
}

function rangeRefs(startRef, endRef) {
  const a = parseRef(startRef);
  const b = parseRef(endRef);
  if (!a || !b) return [];
  const refs = [];
  for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row += 1) {
    for (let col = Math.min(a.col, b.col); col <= Math.max(a.col, b.col); col += 1) {
      refs.push(refOf(col, row));
    }
  }
  return refs;
}

function isNumeric(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function cellValue(cells, ref) {
  const cell = cells[String(ref).toUpperCase()];
  if (!cell) return null;
  if (cell.error) return cell.error;
  if (isNumeric(cell.value)) return cell.value;
  if (typeof cell.value === 'string' && cell.value.trim() !== '' && !Number.isNaN(Number(cell.value))) {
    return Number(cell.value);
  }
  return cell.value;
}

function numbersIn(cells, refs) {
  const numbers = [];
  let error = null;
  for (const ref of refs) {
    const value = cellValue(cells, ref);
    if (typeof value === 'string' && value.startsWith('#')) {
      error = error || value;
      continue;
    }
    if (isNumeric(value)) numbers.push(value);
  }
  return { numbers, error };
}

const FUNCTIONS = {
  SUM: (nums) => nums.reduce((sum, value) => sum + value, 0),
  AVERAGE: (nums) => (nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : 0),
  MIN: (nums) => (nums.length ? Math.min(...nums) : 0),
  MAX: (nums) => (nums.length ? Math.max(...nums) : 0),
  COUNT: (nums) => nums.length,
};

function evaluateExpression(source, cells, depth = 0) {
  if (depth > 12) return { error: '#REF!' };
  const text = String(source || '').trim();
  if (!text.startsWith('=')) return { value: text };

  let expr = text.slice(1).trim();

  // Resolve functions (innermost first).
  const functionPattern = /([A-Za-z]+)\(([^()]*)\)/;
  let guard = 0;
  while (functionPattern.test(expr) && guard < 20) {
    guard += 1;
    expr = expr.replace(functionPattern, (match, name, args) => {
      const upper = String(name).toUpperCase();
      const fn = FUNCTIONS[upper];
      if (!fn) return '#VALUE!';
      const refs = [];
      for (const rawArg of String(args).split(',')) {
        const arg = rawArg.trim();
        const rangeMatch = /^([A-Za-z]+\d+):([A-Za-z]+\d+)$/.exec(arg);
        if (rangeMatch) refs.push(...rangeRefs(rangeMatch[1], rangeMatch[2]));
        else if (parseRef(arg)) refs.push(arg.toUpperCase());
        else if (arg !== '' && !Number.isNaN(Number(arg))) refs.push(null);
      }
      const numbers = [];
      let error = null;
      for (const rawArg of String(args).split(',')) {
        const arg = rawArg.trim();
        if (arg !== '' && !Number.isNaN(Number(arg))) {
          numbers.push(Number(arg));
          continue;
        }
        const rangeMatch = /^([A-Za-z]+\d+):([A-Za-z]+\d+)$/.exec(arg);
        const refsForArg = rangeMatch
          ? rangeRefs(rangeMatch[1], rangeMatch[2])
          : parseRef(arg)
            ? [arg.toUpperCase()]
            : [];
        const result = numbersIn(cells, refsForArg);
        error = error || result.error;
        numbers.push(...result.numbers);
      }
      if (error) return error;
      return String(fn(numbers));
    });
    if (expr.includes('#VALUE!')) return { error: '#VALUE!' };
  }

  // Replace cell references with values.
  expr = expr.replace(/([A-Za-z]+\d+)/g, (match) => {
    const value = cellValue(cells, match.toUpperCase());
    if (typeof value === 'string') {
      if (value.startsWith('#')) return value;
      return 'NaN';
    }
    if (value === null) return '0';
    return String(value);
  });
  if (expr.includes('#')) return { error: '#VALUE!' };

  // Recursive descent arithmetic evaluator.
  let pos = 0;
  function skip() {
    while (expr[pos] === ' ') pos += 1;
  }
  function parseFactor() {
    skip();
    if (expr[pos] === '(') {
      pos += 1;
      const value = parseSum();
      skip();
      if (expr[pos] === ')') pos += 1;
      return value;
    }
    if (expr[pos] === '-') {
      pos += 1;
      return -parseFactor();
    }
    const start = pos;
    while (pos < expr.length && /[0-9.]/.test(expr[pos])) pos += 1;
    if (start === pos) return NaN;
    return Number(expr.slice(start, pos));
  }
  function parseProduct() {
    let value = parseFactor();
    for (;;) {
      skip();
      const op = expr[pos];
      if (op !== '*' && op !== '/') return value;
      pos += 1;
      const right = parseFactor();
      if (op === '/' && right === 0) return '#DIV/0!';
      value = op === '*' ? value * right : value / right;
    }
  }
  function parseSum() {
    let value = parseProduct();
    for (;;) {
      skip();
      const op = expr[pos];
      if (op !== '+' && op !== '-') return value;
      pos += 1;
      const right = parseProduct();
      if (typeof value === 'string' || typeof right === 'string') return '#DIV/0!';
      value = op === '+' ? value + right : value - right;
    }
  }
  const value = parseSum();
  if (typeof value === 'string' && value.startsWith('#')) return { error: value };
  if (Number.isNaN(value)) return { error: '#VALUE!' };
  return { value };
}

function recompute(sheet) {
  const cells = sheet.cells || {};
  const formulas = Object.keys(cells).filter(
    (ref) => typeof cells[ref].formula === 'string' && cells[ref].formula.startsWith('='),
  );
  let guard = 0;
  let changed = true;
  while (changed && guard < 12) {
    changed = false;
    guard += 1;
    for (const ref of formulas) {
      const result = evaluateExpression(cells[ref].formula, cells);
      const nextValue = result.error ? result.error : result.value;
      const nextError = result.error || null;
      if (cells[ref].value !== nextValue || cells[ref].error !== nextError) {
        cells[ref].value = nextValue;
        cells[ref].error = nextError;
        changed = true;
      }
    }
  }
}

function createWorkbook(name) {
  const workbook = {
    id: newId('wb'),
    name: String(name || 'Untitled workbook').trim() || 'Untitled workbook',
    createdAt: new Date().toISOString(),
    worksheets: [{ name: 'Sheet1', cells: {}, validations: {} }],
  };
  state.workbooks.push(workbook);
  return workbook;
}

function findWorkbook(id) {
  return state.workbooks.find((workbook) => workbook.id === id) || null;
}

function findSheet(workbook, name) {
  return workbook.worksheets.find((sheet) => sheet.name === name) || null;
}

function usedBounds(sheet) {
  let maxCol = 0;
  let maxRow = 0;
  for (const ref of Object.keys(sheet.cells || {})) {
    const parsed = parseRef(ref);
    if (!parsed) continue;
    maxCol = Math.max(maxCol, parsed.col);
    maxRow = Math.max(maxRow, parsed.row);
  }
  return { maxCol, maxRow };
}

function ensureValidations(sheet) {
  if (!sheet.validations) sheet.validations = {};
  return sheet.validations;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

module.exports = {
  FUNCTIONS,
  cellValue,
  colToIndex,
  createWorkbook,
  csvEscape,
  evaluateExpression,
  ensureValidations,
  findSheet,
  findWorkbook,
  indexToCol,
  parseRef,
  rangeRefs,
  recompute,
  refOf,
  state,
  usedBounds,
};
