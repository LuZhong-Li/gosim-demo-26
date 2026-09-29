const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');

const app = require('../src/app');

let server;
let base;

test.before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

async function json(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  return { response, payload: await response.json() };
}

test('pivot failures use official messages and preserve the last successful result', async () => {
  const list = await (await fetch(`${base}/api/workbooks`)).json();
  const workbook = list.workbooks.find((item) => item.name === 'Q3 Sales');
  assert.ok(workbook);

  const created = await json(`/api/workbooks/${workbook.id}/pivot`, {
    method: 'POST',
    body: JSON.stringify({ source: 'Sheet1', start: 'A1', end: 'C4' }),
  });
  assert.equal(created.response.status, 201);
  const pivotName = created.payload.sheet.name;

  const valid = await json(`/api/workbooks/${workbook.id}/worksheets/${pivotName}/pivot`, {
    method: 'PUT',
    body: JSON.stringify({
      rowField: 'Region',
      colField: '',
      valueField: 'Sales',
      agg: 'SUM',
    }),
  });
  assert.equal(valid.response.status, 200);
  const lastSuccessfulCells = valid.payload.sheet.cells;

  const nonNumeric = await json(`/api/workbooks/${workbook.id}/worksheets/${pivotName}/pivot`, {
    method: 'PUT',
    body: JSON.stringify({
      rowField: 'Region',
      colField: '',
      valueField: 'Region',
      agg: 'SUM',
    }),
  });
  assert.equal(nonNumeric.response.status, 409);
  assert.equal(nonNumeric.payload.error, 'Value field requires numeric values');

  const missing = await json(`/api/workbooks/${workbook.id}/worksheets/${pivotName}/pivot`, {
    method: 'PUT',
    body: JSON.stringify({
      rowField: 'Missing',
      colField: '',
      valueField: 'Sales',
      agg: 'SUM',
    }),
  });
  assert.equal(missing.response.status, 409);
  assert.equal(missing.payload.error, 'Pivot field is no longer available. Select a new field.');

  const detail = await (await fetch(`${base}/api/workbooks/${workbook.id}`)).json();
  const pivot = detail.workbook.sheets.find((sheet) => sheet.name === pivotName);
  assert.deepEqual(pivot.cells, lastSuccessfulCells);
  assert.equal(pivot.pivot.valueField, 'Sales');
});
