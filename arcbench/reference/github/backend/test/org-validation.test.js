// REQ-2-1-2 / REQ-2-2-1: create-organization validation precedence.
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

async function login(username) {
  const result = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: username, password: 'Valid-password-123!' }),
  });
  return result.payload.token;
}

const auth = (token) => ({ authorization: `Bearer ${token}` });

test('a taken organization name is reported even when the display name is missing', async () => {
  const alice = await login('alice-dev');
  const taken = await json('/api/orgs', {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ name: 'acme-demo' }),
  });
  assert.equal(taken.response.status, 409);
  assert.equal(taken.payload.error, 'Organization name already exists');
});

test('a malformed organization name and an empty display name keep their own messages', async () => {
  const alice = await login('alice-dev');
  const malformed = await json('/api/orgs', {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ name: '-invalid-organization', displayName: 'Mobile Guild' }),
  });
  assert.equal(malformed.response.status, 400);
  assert.equal(malformed.payload.error, 'Organization name format is invalid');

  const missingDisplay = await json('/api/orgs', {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ name: 'mobile-guild', displayName: '   ' }),
  });
  assert.equal(missingDisplay.response.status, 400);
  assert.equal(missingDisplay.payload.error, 'Display name is required');
});

test('a unique identifier and display name create the organization', async () => {
  const alice = await login('alice-dev');
  const created = await json('/api/orgs', {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ name: 'mobile-guild', displayName: 'Mobile Guild' }),
  });
  assert.equal(created.response.status, 201);

  const orgs = await json('/api/orgs', { headers: auth(alice) });
  assert.ok(orgs.payload.orgs.some((org) => org.name === 'mobile-guild'));
});
