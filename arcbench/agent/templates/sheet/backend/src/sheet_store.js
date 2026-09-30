// Spreadsheet store with a small formula engine. State lives in memory for the
// run and is mirrored to a JSON file so workbooks, worksheets, cells, formulas,
// filters, validation rules and pivots survive a process restart.

const fs = require('fs');
const os = require('os');
const path = require('path');

// The node test runner sets NODE_TEST_CONTEXT, and the suites rely on a fresh
// in-memory seed, so file persistence is skipped there.
const PERSIST = !process.env.NODE_TEST_CONTEXT && process.env.ARC_STORE !== 'memory';
const STORE_FILE =
  process.env.ARC_DB_FILE || path.join(os.tmpdir(), 'arcbench-sheet-store.json');

const state = { workbooks: [] };

function save() {
  if (!PERSIST) return;
  try {
    // Written synchronously so a write is never lost to a killing signal; the
    // state is tiny and writes only happen on mutations.
    const tmp = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, STORE_FILE);
  } catch {
    // Persistence is best effort: keep serving from memory.
  }
}

function hydrate() {
  if (!PERSIST) return;
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    if (Array.isArray(raw.workbooks)) state.workbooks = raw.workbooks;
  } catch {
    // A missing or corrupt file simply falls back to the seed.
  }
}

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

const ERROR_TOKENS = ['#DIV/0!', '#NAME?', '#ERROR!', '#REF!', '#VALUE!'];

function firstErrorToken(text) {
  const value = String(text || '');
  for (const token of ERROR_TOKENS) {
    if (value.includes(token)) return token;
  }
  return null;
}

function evaluateExpression(source, cells, depth = 0) {
  if (depth > 12) return { error: '#REF!' };
  const text = String(source || '').trim();
  if (!text.startsWith('=')) return { value: text };

  let expr = text.slice(1).trim();
  let malformed = false;

  // A formula that is exactly one cell reference returns that cell's value,
  // including text values (REQ-4-1-1 / REQ-4-2-2).
  const singleRef = /^([A-Za-z]+\d+)$/.exec(expr);
  if (singleRef) {
    const parsed = parseRef(singleRef[1]);
    if (!parsed || parsed.row < 1 || parsed.col < 1) return { error: '#REF!' };
    const referenced = cellValue(cells, singleRef[1].toUpperCase());
    if (typeof referenced === 'string') {
      if (referenced.startsWith('#')) return { error: referenced };
      return { value: referenced };
    }
    return { value: referenced === null ? 0 : referenced };
  }

  // Resolve functions (innermost first).
  const functionPattern = /([A-Za-z]+)\(([^()]*)\)/;
  let guard = 0;
  while (functionPattern.test(expr) && guard < 20) {
    guard += 1;
    expr = expr.replace(functionPattern, (match, name, args) => {
      const upper = String(name).toUpperCase();
      const fn = FUNCTIONS[upper];
      if (!fn) return '#NAME?';
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
    const functionError = firstErrorToken(expr);
    if (functionError) return { error: functionError };
  }

  // Replace cell references with values.
  expr = expr.replace(/([A-Za-z]+\d+)/g, (match) => {
    const parsed = parseRef(match);
    if (!parsed || parsed.row < 1 || parsed.col < 1) return '#REF!';
    const value = cellValue(cells, match.toUpperCase());
    if (typeof value === 'string') {
      if (value.startsWith('#')) return value;
      return 'NaN';
    }
    if (value === null) return '0';
    return String(value);
  });
  const referenceError = firstErrorToken(expr);
  if (referenceError) return { error: referenceError };

  // Recursive descent arithmetic evaluator.
  let pos = 0;
  function skip() {
    while (expr[pos] === ' ') pos += 1;
  }
  function parseFactor() {
    skip();
    if (pos >= expr.length) {
      malformed = true;
      return NaN;
    }
    if (expr[pos] === '(') {
      pos += 1;
      const value = parseSum();
      skip();
      if (expr[pos] === ')') pos += 1;
      else malformed = true;
      return value;
    }
    if (expr[pos] === '-') {
      pos += 1;
      return -parseFactor();
    }
    const start = pos;
    while (pos < expr.length && /[0-9.]/.test(expr[pos])) pos += 1;
    if (start === pos) {
      malformed = true;
      return NaN;
    }
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
  if (malformed) return { error: '#ERROR!' };
  if (Number.isNaN(value)) return { error: '#VALUE!' };
  return { value };
}

function formulaRefs(formula) {
  const refs = new Set();
  for (const match of String(formula || '').matchAll(/([A-Za-z]+\d+)/g)) {
    refs.add(match[1].toUpperCase());
  }
  return [...refs];
}

function circularRefs(cells, formulaRefsList) {
  const formulaSet = new Set(formulaRefsList);
  const deps = new Map(
    formulaRefsList.map((ref) => [
      ref,
      formulaRefs(cells[ref].formula).filter((dep) => formulaSet.has(dep)),
    ]),
  );
  const state = new Map();
  const cyclic = new Set();
  const visit = (ref, stack) => {
    if (state.get(ref) === 1) {
      const start = stack.indexOf(ref);
      for (const item of stack.slice(start < 0 ? 0 : start)) cyclic.add(item);
      return;
    }
    if (state.get(ref) === 2) return;
    state.set(ref, 1);
    stack.push(ref);
    for (const dep of deps.get(ref) || []) visit(dep, stack);
    stack.pop();
    state.set(ref, 2);
  };
  for (const ref of formulaRefsList) visit(ref, []);
  return cyclic;
}

function recompute(sheet) {
  const cells = sheet.cells || {};
  const formulas = Object.keys(cells).filter(
    (ref) => typeof cells[ref].formula === 'string' && cells[ref].formula.startsWith('='),
  );
  const cyclic = circularRefs(cells, formulas);
  let guard = 0;
  let changed = true;
  while (changed && guard < 12) {
    changed = false;
    guard += 1;
    for (const ref of formulas) {
      const result = cyclic.has(ref)
        ? { error: '#REF!' }
        : evaluateExpression(cells[ref].formula, cells);
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
    updatedAt: new Date().toISOString(),
    lastActiveSheet: 'Sheet1',
    worksheets: [{ name: 'Sheet1', cells: {}, validations: {}, selection: null }],
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


function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      if (field.length > 0) return null;
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    if (ch === '\r') continue;
    field += ch;
  }
  if (inQuotes) return null;
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function importCsvWorkbook(name, text) {
  const rows = parseCsv(text);
  if (!rows) return { error: 'Invalid CSV file format. Import failed.' };
  const cells = {};
  rows.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value === '' || value === undefined || value === null) return;
      cells[refOf(colIndex + 1, rowIndex + 1)] = { value };
    });
  });
  const workbook = createWorkbook(name);
  workbook.worksheets[0].cells = cells;
  return workbook;
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
  importCsvWorkbook,
  parseRef,
  rangeRefs,
  recompute,
  refOf,
  save,
  state,
  usedBounds,
};


function seedQ3Sales() {
  const workbook = createWorkbook('Q3 Sales');
  const sheet1 = workbook.worksheets[0];
  const table = [
    ['Region', 'Sales', 'Status'],
    ['East', 1200, 'Open'],
    ['North', 800, 'Closed'],
    ['South', 700, 'Open'],
  ];
  table.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      sheet1.cells[refOf(colIndex + 1, rowIndex + 1)] = { value };
    });
  });

  const sheet2 = { name: 'Sheet2', cells: {}, validations: {}, selection: null };
  sheet2.cells['A1'] = { value: 'East' };
  sheet2.cells['B1'] = { value: 1200 };
  sheet2.cells['A2'] = { value: 'North' };
  sheet2.cells['B2'] = { value: 800 };
  workbook.worksheets.push(sheet2);
}

// REQ-3-1-2 / REQ-3-2-1: the fixture also describes a two column Item/Qty table
// whose range A1:B2 has an empty D1:E2 target beside it.
function seedInventory() {
  const workbook = createWorkbook('Inventory');
  const sheet = workbook.worksheets[0];
  sheet.cells['A1'] = { value: 'Item' };
  sheet.cells['B1'] = { value: 'Qty' };
  sheet.cells['A2'] = { value: 'Pen' };
  sheet.cells['B2'] = { value: 4 };
}

// REQ-3-1-1 / REQ-4-1-1: a preconfigured sheet with a literal formula chain so
// the calculation scenarios have their source data on arrival.
function seedFormulaExamples() {
  const workbook = createWorkbook('Formula examples');
  const sheet = workbook.worksheets[0];
  sheet.cells['A1'] = { value: 2 };
  sheet.cells['B1'] = { value: 3 };
  sheet.cells['C1'] = { value: 0, formula: '=A1+B1' };
  sheet.cells['D1'] = { value: 0, formula: '=C1*2' };
  recompute(sheet);
}

function seed() {
  if (!state.workbooks.some((workbook) => workbook.name === 'Q3 Sales')) seedQ3Sales();
  if (!state.workbooks.some((workbook) => workbook.name === 'Inventory')) seedInventory();
  if (!state.workbooks.some((workbook) => workbook.name === 'Formula examples')) {
    seedFormulaExamples();
  }
}

// Load the previous run's workbooks before the seed tops up anything missing.
hydrate();
seed();
