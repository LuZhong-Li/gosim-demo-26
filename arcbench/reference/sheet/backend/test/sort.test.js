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

test('sort endpoint sorts only the selected range and preserves a header row', async () => {
  const list = await (await fetch(`${base}/api/workbooks`)).json();
  const workbook = list.workbooks.find((item) => item.name === 'Q3 Sales');
  assert.ok(workbook);

  const detail = await (await fetch(`${base}/api/workbooks/${workbook.id}`)).json();
  const sheet = detail.workbook.sheets[0];
  const state = {
    name: sheet.name,
    cells: {
      ...sheet.cells,
      A5: { value: 'West' },
      B5: { value: 50 },
    },
    validations: sheet.validations || {},
    filters: sheet.filters || [],
    selection: sheet.selection || null,
    pivot: sheet.pivot || null,
  };
  await fetch(`${base}/api/workbooks/${workbook.id}/worksheets/${sheet.name}/state`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state),
  });

  const response = await fetch(
    `${base}/api/workbooks/${workbook.id}/worksheets/${sheet.name}/sort`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        column: 'B',
        direction: 'asc',
        start: 'A1',
        end: 'C4',
        hasHeader: true,
      }),
    },
  );
  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(payload.sheet.cells.A1.value, 'Region');
  assert.equal(payload.sheet.cells.A2.value, 'South');
  assert.equal(payload.sheet.cells.A3.value, 'North');
  assert.equal(payload.sheet.cells.A4.value, 'East');
  assert.equal(payload.sheet.cells.A5.value, 'West');
  assert.equal(payload.sheet.cells.B5.value, 50);
});
