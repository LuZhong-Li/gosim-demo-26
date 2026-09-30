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

test('malformed CSV uses the official import failure message', async () => {
  const response = await fetch(`${base}/api/csv-import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Broken', csv: '"unterminated' }),
  });
  const payload = await response.json();
  assert.equal(response.status, 400);
  assert.equal(payload.error, 'Invalid CSV file format. Import failed.');
});
