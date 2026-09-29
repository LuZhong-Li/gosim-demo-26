const express = require('express');
const fs = require('fs');
const path = require('path');

const store = require('./sheet_store');

const app = express();
app.use(express.json({ limit: '5mb' }));

function sheetPayload(sheet) {
  return {
    name: sheet.name,
    cells: sheet.cells,
    validations: sheet.validations || {},
    filters: sheet.filters || [],
    selection: sheet.selection || null,
    pivot: sheet.pivot
      ? {
          source: sheet.pivot.source,
          range: pivotRangeRefs(sheet.pivot.range),
          rowField: sheet.pivot.rowField || '',
          colField: sheet.pivot.colField || '',
          valueField: sheet.pivot.valueField || '',
          agg: String(sheet.pivot.agg || 'sum').toUpperCase(),
        }
      : null,
  };
}

function workbookSummary(workbook) {
  return {
    id: workbook.id,
    name: workbook.name,
    createdAt: workbook.createdAt,
    updatedAt: workbook.updatedAt || workbook.createdAt,
    lastActiveSheet: workbook.lastActiveSheet || workbook.worksheets[0]?.name || '',
    worksheets: workbook.worksheets.map((sheet) => sheet.name),
  };
}

function touch(workbook) {
  workbook.updatedAt = new Date().toISOString();
  return workbook;
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
  if (!name) return res.status(400).json({ error: 'Workbook name cannot be empty' });
  workbook.name = name;
  touch(workbook);
  res.json({ workbook: workbookSummary(workbook) });
});

app.delete('/api/workbooks/:id', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  store.state.workbooks = store.state.workbooks.filter((item) => item.id !== workbook.id);
  res.json({ ok: true });
});

app.put('/api/workbooks/:id/active-sheet', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = String((req.body || {}).sheet || '').trim();
  if (!store.findSheet(workbook, sheet)) {
    return res.status(400).json({ error: 'Worksheet not found.' });
  }
  workbook.lastActiveSheet = sheet;
  res.json({ lastActiveSheet: sheet });
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
  touch(workbook);
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
  touch(workbook);
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
  touch(workbook);
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
  touch(workbook);
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
  touch(workbook);
  res.json({ sheet: sheetPayload(sheet) });
});

app.put('/api/workbooks/:id/worksheets/:sheet/state', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const payload = req.body || {};
  if (!payload.cells || typeof payload.cells !== 'object' || Array.isArray(payload.cells)) {
    return res.status(400).json({ error: 'cells payload is required.' });
  }

  sheet.cells = JSON.parse(JSON.stringify(payload.cells));
  sheet.validations =
    payload.validations && typeof payload.validations === 'object' && !Array.isArray(payload.validations)
      ? JSON.parse(JSON.stringify(payload.validations))
      : {};
  sheet.filters = Array.isArray(payload.filters) ? JSON.parse(JSON.stringify(payload.filters)) : [];
  sheet.selection =
    payload.selection && typeof payload.selection === 'object' && !Array.isArray(payload.selection)
      ? JSON.parse(JSON.stringify(payload.selection))
      : null;
  if (Object.prototype.hasOwnProperty.call(payload, 'pivot')) {
    sheet.pivot = payload.pivot ? JSON.parse(JSON.stringify(payload.pivot)) : null;
  }
  store.recompute(sheet);
  touch(workbook);
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
  adjustPivotRanges(workbook, sheet.name, 'row', index, count, action);
  touch(workbook);
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
  adjustPivotRanges(workbook, sheet.name, 'col', index, count, action);
  touch(workbook);
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
  touch(workbook);
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
  touch(workbook);
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
  touch(workbook);
  res.json({ validations });
});

app.get('/api/workbooks/:id/worksheets/:sheet/validations', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  res.json({ validations: store.ensureValidations(sheet) });
});

app.put('/api/workbooks/:id/worksheets/:sheet/filters', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const filters = (req.body || {}).filters || [];
  if (!Array.isArray(filters)) {
    return res.status(400).json({ error: 'filters must be an array.' });
  }
  const allowed = ['contains', 'eq', 'gt', 'lt', 'before', 'is_empty', 'is_not_empty'];
  const normalized = filters
    .map((item) => ({
      column: String(item.column || 'A').toUpperCase(),
      op: allowed.includes(String(item.op || '')) ? String(item.op) : 'contains',
      value: item.value === undefined || item.value === null ? '' : String(item.value),
    }))
    .filter((item) => /^[A-Z]+$/.test(item.column));
  sheet.filters = normalized;
  touch(workbook);
  res.json({ filters: sheet.filters });
});

// ---------- selection ----------

app.put('/api/workbooks/:id/worksheets/:sheet/selection', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) return res.status(404).json({ error: 'Worksheet not found.' });
  const anchor = String((req.body || {}).anchor || '');
  const focus = String((req.body || {}).focus || '');
  if (!store.parseRef(anchor) || !store.parseRef(focus)) {
    return res.status(400).json({ error: 'Selection requires two valid cell references.' });
  }
  sheet.selection = { anchor, focus };
  res.json({ sheet: sheetPayload(sheet) });
});

// ---------- pivot ----------

const PIVOT_FIELD_MISSING = 'Pivot field no longer exists; please select the field again';

function pivotRange(startRef, endRef) {
  const start = store.parseRef(startRef);
  const end = store.parseRef(endRef);
  if (!start || !end) return null;
  return {
    startCol: Math.min(start.col, end.col),
    endCol: Math.max(start.col, end.col),
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
  };
}

function pivotRangeRefs(range) {
  return {
    start: store.refOf(range.startCol, range.startRow),
    end: store.refOf(range.endCol, range.endRow),
  };
}

function pivotHeaders(source, range) {
  const headers = [];
  for (let col = range.startCol; col <= range.endCol; col += 1) {
    headers.push(String(store.cellValue(source.cells, store.refOf(col, range.startRow)) ?? ''));
  }
  return headers;
}

function nextPivotName(workbook) {
  let index = 1;
  while (store.findSheet(workbook, `Pivot${index}`)) index += 1;
  return `Pivot${index}`;
}

function emptyBucket() {
  return { sum: 0, numeric: 0, count: 0 };
}

function addBucket(target, bucket) {
  target.sum += bucket.sum;
  target.numeric += bucket.numeric;
  target.count += bucket.count;
  return target;
}

function aggregateValue(bucket, agg) {
  const value = bucket || emptyBucket();
  if (agg === 'count') return value.count;
  if (agg === 'average') return value.numeric ? value.sum / value.numeric : 0;
  return value.sum;
}

function computePivotCells(source, config) {
  const range = config.range;
  const headers = pivotHeaders(source, range);
  const columnOf = (name) => {
    const index = headers.indexOf(name);
    return index < 0 ? -1 : range.startCol + index;
  };
  const rowCol = columnOf(config.rowField);
  const valueCol = columnOf(config.valueField);
  const colCol = config.colField ? columnOf(config.colField) : -1;
  if (rowCol < 0 || valueCol < 0 || (config.colField && colCol < 0)) {
    return { error: PIVOT_FIELD_MISSING };
  }
  const agg = String(config.agg || 'sum').toLowerCase();
  const rows = new Map();
  const rowOrder = [];
  const colOrder = [];
  for (let row = range.startRow + 1; row <= range.endRow; row += 1) {
    const rowKey = String(store.cellValue(source.cells, store.refOf(rowCol, row)) ?? '');
    if (!rowKey) continue;
    const colKey = colCol > 0 ? String(store.cellValue(source.cells, store.refOf(colCol, row)) ?? '') : '';
    const raw = store.cellValue(source.cells, store.refOf(valueCol, row));
    const isEmpty = raw === null || raw === undefined || String(raw) === '';
    if (!rows.has(rowKey)) {
      rows.set(rowKey, new Map());
      rowOrder.push(rowKey);
    }
    if (colCol > 0 && !colOrder.includes(colKey)) colOrder.push(colKey);
    const buckets = rows.get(rowKey);
    if (!buckets.has(colKey)) buckets.set(colKey, emptyBucket());
    const bucket = buckets.get(colKey);
    if (!isEmpty) {
      bucket.count += 1;
      const numeric = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isNaN(numeric)) {
        bucket.sum += numeric;
        bucket.numeric += 1;
      }
    }
  }

  const columnTotals = new Map();
  const grand = emptyBucket();
  for (const rowKey of rowOrder) {
    for (const [colKey, bucket] of rows.get(rowKey)) {
      if (!columnTotals.has(colKey)) columnTotals.set(colKey, emptyBucket());
      addBucket(columnTotals.get(colKey), bucket);
      addBucket(grand, bucket);
    }
  }

  const cells = {};
  const write = (col, row, value) => {
    cells[store.refOf(col, row)] = { value };
  };

  if (colCol < 0) {
    write(1, 1, config.rowField);
    write(2, 1, `${agg.toUpperCase()} of ${config.valueField}`);
    rowOrder.forEach((rowKey, index) => {
      const row = index + 2;
      write(1, row, rowKey);
      write(2, row, aggregateValue(rows.get(rowKey).get(''), agg));
    });
    const totalRow = rowOrder.length + 2;
    write(1, totalRow, 'Grand Total');
    write(2, totalRow, aggregateValue(grand, agg));
  } else {
    write(1, 1, config.rowField);
    colOrder.forEach((colKey, index) => write(index + 2, 1, colKey));
    const totalCol = colOrder.length + 2;
    write(totalCol, 1, 'Grand Total');
    rowOrder.forEach((rowKey, index) => {
      const row = index + 2;
      write(1, row, rowKey);
      const rowTotal = emptyBucket();
      colOrder.forEach((colKey, colIndex) => {
        const bucket = rows.get(rowKey).get(colKey);
        write(colIndex + 2, row, aggregateValue(bucket, agg));
        if (bucket) addBucket(rowTotal, bucket);
      });
      write(totalCol, row, aggregateValue(rowTotal, agg));
    });
    const totalRow = rowOrder.length + 2;
    write(1, totalRow, 'Grand Total');
    colOrder.forEach((colKey, colIndex) => {
      write(colIndex + 2, totalRow, aggregateValue(columnTotals.get(colKey), agg));
    });
    write(totalCol, totalRow, aggregateValue(grand, agg));
  }
  return { cells };
}

function requirePivotSheet(req, res, workbook) {
  const sheet = store.findSheet(workbook, req.params.sheet);
  if (!sheet) {
    res.status(404).json({ error: 'Worksheet not found.' });
    return null;
  }
  if (!sheet.pivot) {
    res.status(400).json({ error: 'Worksheet is not a pivot table.' });
    return null;
  }
  return sheet;
}

function applyPivotConfig(workbook, sheet, config) {
  const source = store.findSheet(workbook, sheet.pivot.source);
  if (!source) return { error: PIVOT_FIELD_MISSING };
  sheet.pivot = { ...sheet.pivot, ...config };
  const result = computePivotCells(source, sheet.pivot);
  if (result.error) return result;
  sheet.cells = result.cells;
  store.recompute(sheet);
  return { sheet };
}

function adjustPivotRanges(workbook, sourceName, axis, index, count, action) {
  for (const sheet of workbook.worksheets) {
    if (!sheet.pivot || sheet.pivot.source !== sourceName) continue;
    const range = sheet.pivot.range;
    const startKey = axis === 'row' ? 'startRow' : 'startCol';
    const endKey = axis === 'row' ? 'endRow' : 'endCol';
    if (action === 'insert') {
      if (index <= range[startKey]) {
        range[startKey] += count;
        range[endKey] += count;
      } else if (index <= range[endKey]) {
        range[endKey] += count;
      }
      continue;
    }
    const span = range[endKey] - range[startKey] + 1;
    const removed = Math.min(count, span);
    if (index < range[startKey]) {
      range[startKey] -= removed;
      range[endKey] -= removed;
    } else if (index <= range[endKey]) {
      range[endKey] -= removed;
    }
    if (range[endKey] < range[startKey]) {
      range[startKey] = index;
      range[endKey] = index;
    }
  }
}

app.post('/api/workbooks/:id/pivot', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const body = req.body || {};
  const source = store.findSheet(workbook, String(body.source || workbook.worksheets[0].name));
  if (!source) return res.status(404).json({ error: 'Source worksheet not found.' });
  const range = pivotRange(String(body.start || 'A1'), String(body.end || body.start || 'A1'));
  if (!range) return res.status(400).json({ error: 'A valid source range is required.' });
  const name = String(body.name || '').trim() || nextPivotName(workbook);
  if (store.findSheet(workbook, name)) {
    return res.status(409).json({ error: `Worksheet ${name} already exists.` });
  }
  const target = {
    name,
    cells: {},
    validations: {},
    selection: null,
    pivot: {
      source: source.name,
      range,
      rowField: '',
      colField: '',
      valueField: '',
      agg: 'sum',
    },
  };
  workbook.worksheets.push(target);
  touch(workbook);
  res.status(201).json({
    sheet: sheetPayload(target),
    worksheets: workbook.worksheets.map((item) => item.name),
  });
});

app.put('/api/workbooks/:id/worksheets/:sheet/pivot', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = requirePivotSheet(req, res, workbook);
  if (!sheet) return;
  const body = req.body || {};
  const result = applyPivotConfig(workbook, sheet, {
    rowField: String(body.rowField || ''),
    colField: String(body.colField || ''),
    valueField: String(body.valueField || ''),
    agg: String(body.agg || 'sum').toLowerCase(),
  });
  if (result.error) return res.status(409).json({ error: result.error });
  touch(workbook);
  res.json({ sheet: sheetPayload(sheet) });
});

app.post('/api/workbooks/:id/worksheets/:sheet/pivot/refresh', (req, res) => {
  const workbook = requireWorkbook(req, res);
  if (!workbook) return;
  const sheet = requirePivotSheet(req, res, workbook);
  if (!sheet) return;
  const result = applyPivotConfig(workbook, sheet, {});
  if (result.error) return res.status(409).json({ error: result.error });
  touch(workbook);
  res.json({ sheet: sheetPayload(sheet) });
});


app.post('/api/csv-import', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const csv = String(body.csv ?? '');
  const result = store.importCsvWorkbook(name, csv);
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json({ workbook: workbookSummary(result) });
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

