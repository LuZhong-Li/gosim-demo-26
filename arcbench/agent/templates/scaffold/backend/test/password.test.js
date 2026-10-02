const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');

const app = require('../src/app');
const store = require('../src/gh_store');
const { seed } = require('../src/seed');

let server;
let base;

test.before(async () => {
  seed(store);
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

test('empty current password uses the official required message', async () => {
  const login = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'alice-dev', password: 'Valid-password-123!' }),
  });
  const token = login.payload.token;

  const result = await json('/api/auth/password', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      currentPassword: '',
      newPassword: 'Required-password-789!',
      confirmPassword: 'Required-password-789!',
    }),
  });

  assert.equal(result.response.status, 400);
  assert.equal(result.payload.error, 'Current password is required');
});
