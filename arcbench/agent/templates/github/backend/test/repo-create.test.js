// REQ-3-2-1: owner selection and the "Add a README file" initialization option.
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

test('a repository can be created with a README or without one', async () => {
  const alice = await login('alice-dev');

  const withReadme = await json('/api/repos', {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({
      owner: 'alice-dev',
      name: 'readme-demo',
      visibility: 'private',
      description: 'Has a README',
      readme: true,
    }),
  });
  assert.equal(withReadme.response.status, 201);
  const readmeTree = await json('/api/repos/alice-dev/readme-demo/tree');
  assert.deepEqual(readmeTree.payload.files, ['README.md']);

  const withoutReadme = await json('/api/repos', {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({
      owner: 'alice-dev',
      name: 'empty-demo',
      visibility: 'public',
      description: '',
      readme: false,
    }),
  });
  assert.equal(withoutReadme.response.status, 201);
  assert.equal(withoutReadme.payload.repo.visibility, 'public');
  const emptyTree = await json('/api/repos/alice-dev/empty-demo/tree');
  assert.deepEqual(emptyTree.payload.files, []);
});

test('a repository can be created in an organization the user belongs to', async () => {
  const alice = await login('alice-dev');
  const created = await json('/api/repos', {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({
      owner: 'acme-demo',
      name: 'org-demo',
      visibility: 'private',
      readme: true,
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.payload.repo.owner, 'acme-demo');
  assert.equal(created.payload.repo.ownerType, 'organization');

  // An unknown owner is rejected.
  const unknown = await json('/api/repos', {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ owner: 'not-an-org', name: 'nope', visibility: 'public' }),
  });
  assert.equal(unknown.response.status, 404);
});
