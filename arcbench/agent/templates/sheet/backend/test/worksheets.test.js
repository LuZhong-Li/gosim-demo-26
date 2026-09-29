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

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  return { response, payload: await response.json() };
}

test('worksheet lifecycle uses official error messages and first unused names', async () => {
  const list = await (await fetch(`${base}/api/workbooks`)).json();
  const workbook = list.workbooks.find((item) => item.name === 'Q3 Sales');
  assert.ok(workbook);
  const root = `/api/workbooks/${workbook.id}/worksheets`;

  const created = await request(root, { method: 'POST', body: JSON.stringify({ name: '' }) });
  assert.equal(created.response.status, 201);
  assert.equal(created.payload.sheet.name, 'Sheet3');

  const empty = await request(`${root}/Sheet1`, {
    method: 'PATCH',
    body: JSON.stringify({ name: '   ' }),
  });
  assert.equal(empty.response.status, 400);
  assert.equal(empty.payload.error, 'Worksheet name cannot be empty');

  const duplicate = await request(`${root}/Sheet2`, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Sheet1' }),
  });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.payload.error, 'Worksheet name already exists');

  await request(`${root}/Sheet3`, { method: 'DELETE' });
  await request(`${root}/Sheet2`, { method: 'DELETE' });
  const last = await request(`${root}/Sheet1`, { method: 'DELETE' });
  assert.equal(last.response.status, 400);
  assert.equal(last.payload.error, 'A workbook must contain at least one worksheet');
});
