const express = require('express');
const fs = require('fs');
const path = require('path');

const store = require('./sheet_store');

const app = express();
app.use(express.json({ limit: '5mb' }));

function sheetPayload(sheet) {
  return { name: sheet.name, cells: sheet.cells, validations: sheet.validations || {} };
}

function workbookSummary(workbook) {
  return {
    id: workbook.id,
    name: workbook.name,
    createdAt: workbook.createdAt,
    worksheets: workbook.worksheets.map((sheet) => sheet.name),
  };
}

function requireWorkbook(req, res) {
  const workbook = store.findWorkbook(req.params.id);
  if (!workbook) {
    res.status(404).json({ error: 'Workbook not found.' });
    return null;
  }
  return workbook;
}

// ---------- workbook lifecycle ----------

app.get('/api/health', (req, res) => res.json({ code: 200, message: 'Sheets Ready' }));

app.get('/api/workbooks', (req, res) => {
  res.json({ workbooks: store.state.workbooks.map(workbookSummary) });
});

app.post('/api/workbooks', (req, res) => {
  const workbook = store.createWorkbook(String((req.body || {}).name || '').trim());
  res.status(201).json({ workbook: workbookSummary(workbook) });
});

app.get('/api/workbooks/:id', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  res.json({
    workbook: {
      ...workbookSummary(workbook),
      sheets: workbook.worksheets.map(sheetPayload),
    },
  });
});

app.patch('/api/workbooks/:id', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const name = String((req.body || {}).name || '').trim();
  if (!name) return res.status(400).json({ error: 'Workbook name is required.' });
  workbook.name = name;
  res.json({ workbook: workbookSummary(workbook) });
});

app.delete('/api/workbooks/:id', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  store.state.workbooks = store.state.workbooks.filter((item) => item.id !== workbook.id);
  res.json({ ok: true });
});

// ---------- worksheets ----------

app.post('/api/workbooks/:id/worksheets', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const name = String((req.body || {}).name || '').trim() || `Sheet${workbook.worksheets.length + 1}`;
  if (store.findSheet(workbook, name)) {
    return res.status(409).json({ error: 'A worksheet with that name already exists.' });
  }
  const sheet = { name, cells: {}, validations: {} };
  workbook.worksheets.push(sheet);
  res.status(201).json({ sheet: sheetPayload(sheet) });
});

app.patch('/api/workbooks/:id/worksheets/:sheet', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const name = String((req.body || {}).name || '').trim();
  if (!name) return res.status(400).json({ error: 'Worksheet name is required.' });
  if (store.findSheet(workbook, name)) {
    return res.status(409).json({ error: 'A worksheet with that name already exists.' });
  }
  sheet.name = name;
  res.json({ sheet: sheetPayload(sheet) });
});

app.delete('/api/workbooks/:id/worksheets/:sheet', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  if (workbook.worksheets.length <= 1) {
    return res.status(400).json({ error: 'A workbook needs at least one worksheet.' });
  }
  const exists = store.findSheet(workbook, req.params.sheet);
  if (!exists) return res.status(404).json({ error: 'Worksheet not found.' });
  workbook.worksheets = workbook.worksheets.filter((sheet) => sheet.name !== req.params.sheet);
  res.json({ ok: true });
});

// ---------- cells ----------

app.patch('/api/workbooks/:id/worksheets/:sheet/cells', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const updates = (req.body || {}).updates || {};
  for (const [rawRef, payload] of Object.entries(updates)) {
    const ref = String(rawRef).toUpperCase();
    if (payload === null || payload === undefined || payload === '') {
      delete sheet.cells[ref];
      continue;
    }
    const formula = typeof payload === 'object' ? payload.formula : undefined;
    const rawValue = typeof payload === 'object' ? payload.value : payload;
    const cell = { value: rawValue === undefined || rawValue === null ? '' : rawValue };
    if (typeof formula === 'string' && formula.startsWith('=')) {
      cell.formula = formula;
    }
    sheet.cells[ref] = cell;
  }
  store.recompute(sheet);
  res.json({ sheet: sheetPayload(sheet) });
});

app.put('/api/workbooks/:id/worksheets/:sheet/cells', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const cells = (req.body || {}).cells;
  if (!cells || typeof cells !== 'object') {
    return res.status(400).json({ error: 'cells payload is required.' });
  }
  sheet.cells = JSON.parse(JSON.stringify(cells));
  store.recompute(sheet);
  res.json({ sheet: sheetPayload(sheet) });
});

app.post('/api/workbooks/:id/worksheets/:sheet/rows', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const action = String((req.body || {}).action || 'insert');
  const index = Math.max(1, Number((req.body || {}).index) || 1);
  const count = Math.max(1, Number((req.body || {}).count) || 1);
  const moved = {};
  for (const [ref, cell] of Object.entries(sheet.cells)) {
    const parsed = store.parseRef(ref);
    if (!parsed) continue;
    if (action === 'insert') {
      const row = parsed.row >= index ? parsed.row + count : parsed.row;
      moved[store.refOf(parsed.col, row)] = cell;
    } else if (parsed.row < index || parsed.row >= index + count) {
      const row = parsed.row >= index + count ? parsed.row - count : parsed.row;
      moved[store.refOf(parsed.col, row)] = cell;
    }
  }
  sheet.cells = moved;
  store.recompute(sheet);
  res.json({ sheet: sheetPayload(sheet) });
});

app.post('/api/workbooks/:id/worksheets/:sheet/columns', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const action = String((req.body || {}).action || 'insert');
  const index = Math.max(1, Number((req.body || {}).index) || 1);
  const count = Math.max(1, Number((req.body || {}).count) || 1);
  const moved = {};
  for (const [ref, cell] of Object.entries(sheet.cells)) {
    const parsed = store.parseRef(ref);
    if (!parsed) continue;
    if (action === 'insert') {
      const col = parsed.col >= index ? parsed.col + count : parsed.col;
      moved[store.refOf(col, parsed.row)] = cell;
    } else if (parsed.col < index || parsed.col >= index + count) {
      const col = parsed.col >= index + count ? parsed.col - count : parsed.col;
      moved[store.refOf(col, parsed.row)] = cell;
    }
  }
  sheet.cells = moved;
  store.recompute(sheet);
  res.json({ sheet: sheetPayload(sheet) });
});

// ---------- data organization ----------

app.post('/api/workbooks/:id/worksheets/:sheet/sort', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const column = store.colToIndex(String((req.body || {}).column || 'A'));
  const direction = String((req.body || {}).direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
  const { maxCol, maxRow } = store.usedBounds(sheet);
  if (maxRow < 2) return res.json({ sheet: sheetPayload(sheet) });
  const rows = [];
  for (let row = 1; row <= maxRow; row += 1) {
    const cells = [];
    for (let col = 1; col <= maxCol; col += 1) {
      cells.push(sheet.cells[store.refOf(col, row)] || null);
    }
    rows.push(cells);
  }
  rows.sort((left, right) => {
    const a = left[column - 1]?.value ?? '';
    const b = right[column - 1]?.value ?? '';
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction;
    return String(a).localeCompare(String(b)) * direction;
  });
  const rebuilt = {};
  rows.forEach((cells, rowIndex) => {
    cells.forEach((cell, colIndex) => {
      if (cell) rebuilt[store.refOf(colIndex + 1, rowIndex + 1)] = cell;
    });
  });
  sheet.cells = rebuilt;
  store.recompute(sheet);
  res.json({ sheet: sheetPayload(sheet) });
});

app.get('/api/workbooks/:id/export', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, String(req.query.sheet || workbook.worksheets[0].name));
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const { maxCol, maxRow } = store.usedBounds(sheet);
  const lines = [];
  for (let row = 1; row <= maxRow; row += 1) {
    const values = [];
    for (let col = 1; col <= maxCol; col += 1) {
      const value = store.cellValue(sheet.cells, store.refOf(col, row));
      values.push(store.csvEscape(value));
    }
    lines.push(values.join(','));
  }
  res.type('text/csv').send(lines.join('\n'));
});

app.post('/api/workbooks/:id/import', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const name = String((req.body || {}).sheet || workbook.worksheets[0].name);
  const sheet = store.findSheet(workbook, name);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const csv = String((req.body || {}).csv || '');
  const rows = csv.split(/\r?\n/).filter((line, index, all) => line !== '' || index < all.length - 1);
  const cells = {};
  rows.forEach((line, rowIndex) => {
    const values = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (ch === '"') {
          quoted = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        values.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current);
    values.forEach((value, colIndex) => {
      if (value === '') return;
      const numeric = Number(value);
      cells[store.refOf(colIndex + 1, rowIndex + 1)] = {
        value: Number.isNaN(numeric) ? value : numeric,
      };
    });
  });
  sheet.cells = cells;
  store.recompute(sheet);
  res.json({ sheet: sheetPayload(sheet) });
});

// ---------- validations ----------

app.put('/api/workbooks/:id/worksheets/:sheet/validations', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const range = String((req.body || {}).range || '').toUpperCase();
  const rule = (req.body || {}).rule || null;
  const match = /^([A-Z]+\d+):([A-Z]+\d+)$/.exec(range);
  const refs = match
    ? store.rangeRefs(match[1], match[2])
    : store.parseRef(range)
      ? [range]
      : [];
  if (!refs.length) return res.status(400).json({ error: 'A cell or range like A1:B3 is required.' });
  if (
    !rule ||
    !['list', 'number'].includes(rule.type) ||
    (rule.type === 'list' && !Array.isArray(rule.values)) ||
    (rule.type === 'number' &&
      (typeof rule.min !== 'number' || typeof rule.max !== 'number'))
  ) {
    return res.status(400).json({ error: 'Rule must be a list with values or a numeric min/max range.' });
  }
  const validations = store.ensureValidations(sheet);
  for (const ref of refs) validations[ref] = rule;
  res.json({ validations });
});

app.get('/api/workbooks/:id/worksheets/:sheet/validations', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  res.json({ validations: store.ensureValidations(sheet) });
});

// ---------- pivot ----------

app.post('/api/workbooks/:id/pivot', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const source = store.findSheet(workbook, String((req.body || {}).source || workbook.worksheets[0].name));
  if (!source) return res.status(404).json({ error: 'Source worksheet not found.' });
  const rowCol = store.colToIndex(String((req.body || {}).rowField || 'A'));
  const colCol = store.colToIndex(String((req.body || {}).colField || 'B'));
  const valueCol = store.colToIndex(String((req.body || {}).valueField || 'C'));
  const agg = String((req.body || {}).agg || 'sum').toLowerCase();
  const targetName = String((req.body || {}).target || 'Pivot');
  const { maxRow } = store.usedBounds(source);

  const matrix = new Map();
  const headers = new Set();
  for (let row = 2; row <= maxRow; row += 1) {
    const rowKey = String(store.cellValue(source.cells, store.refOf(rowCol, row)) ?? '');
    const colKey = String(store.cellValue(source.cells, store.refOf(colCol, row)) ?? '');
    const raw = store.cellValue(source.cells, store.refOf(valueCol, row));
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!rowKey || !colKey) continue;
    headers.add(colKey);
    if (!matrix.has(rowKey)) matrix.set(rowKey, {});
    const bucket = matrix.get(rowKey);
    if (!bucket[colKey]) bucket[colKey] = [];
    if (!Number.isNaN(value)) bucket[colKey].push(value);
  }

  const headerList = Array.from(headers).sort();
  const cells = { A1: { value: `${req.body.rowField || 'A'} \\ ${req.body.colField || 'B'}` } };
  headerList.forEach((header, index) => {
    cells[store.refOf(index + 2, 1)] = { value: header };
  });
  let rowIndex = 2;
  for (const rowKey of Array.from(matrix.keys()).sort()) {
    cells[store.refOf(1, rowIndex)] = { value: rowKey };
    headerList.forEach((header, index) => {
      const values = matrix.get(rowKey)[header] || [];
      const aggregated =
        agg === 'count'
          ? values.length
          : values.reduce((sum, item) => sum + item, 0);
      cells[store.refOf(index + 2, rowIndex)] = { value: aggregated };
    });
    rowIndex += 1;
  }

  let target = store.findSheet(workbook, targetName);
  if (!target) {
    target = { name: targetName, cells: {}, validations: {} };
    workbook.worksheets.push(target);
  }
  target.cells = cells;
  store.recompute(target);
  res.json({ sheet: sheetPayload(target), worksheets: workbook.worksheets.map((item) => item.name) });
});

// ---------- static frontend hosting ----------

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(503).type('html').send('<!doctype html><html><body><h1>Frontend build missing</h1></body></html>');
  });
}

module.exports = app;
