// REQ-4-1 / REQ-4-3-1 / REQ-4-3-2: per-branch file lists and branch creation.
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
const REPO = '/api/repos/acme-demo/acme-docs';

test('each branch exposes its own file list', async () => {
  const main = await json(`${REPO}/tree`);
  assert.equal(main.payload.branch, 'main');
  assert.ok(main.payload.files.includes('README.md'));
  assert.equal(main.payload.files.includes('main-only.md'), false);

  const feature = await json(`${REPO}/tree?branch=feature-search`);
  assert.equal(feature.payload.branch, 'feature-search');
  assert.ok(feature.payload.files.includes('main-only.md'));
  assert.ok(feature.payload.files.includes('src/search.ts'));
});

test('a branch-only file is readable on that branch and absent from the default branch', async () => {
  const onFeature = await json(`${REPO}/contents?path=main-only.md&branch=feature-search`);
  assert.equal(onFeature.response.status, 200);
  assert.equal(onFeature.payload.content, 'Main-only note.\n');

  const onMain = await json(`${REPO}/contents?path=main-only.md&branch=main`);
  assert.equal(onMain.response.status, 404);
});

test('branch creation validates the name and requires write permission', async () => {
  const carol = await login('carol-reader');
  const bob = await login('bob-reviewer');

  const denied = await json(`${REPO}/branches`, {
    method: 'POST',
    headers: auth(carol),
    body: JSON.stringify({ name: 'reader-branch' }),
  });
  assert.equal(denied.response.status, 403);

  const invalid = await json(`${REPO}/branches`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({ name: 'invalid..branch' }),
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.payload.error, 'Invalid branch');

  const created = await json(`${REPO}/branches`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({ name: 'pw-branch-smoke' }),
  });
  assert.equal(created.response.status, 201);

  const tree = await json(`${REPO}/tree?branch=pw-branch-smoke`);
  assert.equal(tree.payload.branch, 'pw-branch-smoke');
  assert.ok(tree.payload.branches.includes('pw-branch-smoke'));
});
