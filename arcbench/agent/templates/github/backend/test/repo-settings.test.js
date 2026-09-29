// REQ-3-4 / REQ-4-3-3 / REQ-6-1: repository settings, default branch, branch protection, checks.
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

test('repository settings report admin capability and the persisted rule', async () => {
  const alice = await login('alice-dev');
  const carol = await login('carol-reader');

  const asOwner = await json(REPO, { headers: auth(alice) });
  assert.equal(asOwner.payload.repo.canAdmin, true);
  assert.equal(asOwner.payload.repo.protection.branch, 'main');

  const asReader = await json(REPO, { headers: auth(carol) });
  assert.equal(asReader.payload.repo.canAdmin, false);

  const anonymous = await json(REPO);
  assert.equal(anonymous.payload.repo.canAdmin, false);
});

test('only an admin may change visibility or the default branch', async () => {
  const bob = await login('bob-reviewer');
  const denied = await json(REPO, {
    method: 'PATCH',
    headers: auth(bob),
    body: JSON.stringify({ visibility: 'private' }),
  });
  assert.equal(denied.response.status, 403);

  const alice = await login('alice-dev');
  const updated = await json(REPO, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ defaultBranch: 'release' }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.payload.repo.defaultBranch, 'release');

  // REQ-4-3-3: opening the repository without a branch now uses the new default.
  const tree = await json(`${REPO}/tree`);
  assert.equal(tree.payload.branch, 'release');

  const restored = await json(REPO, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ defaultBranch: 'main' }),
  });
  assert.equal(restored.payload.repo.defaultBranch, 'main');

  const unknown = await json(REPO, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ defaultBranch: 'does-not-exist' }),
  });
  assert.equal(unknown.response.status, 400);
});

test('branch protection rules are admin-only and bound to one exact branch', async () => {
  const bob = await login('bob-reviewer');
  const denied = await json(`${REPO}/branches/release/protection`, {
    method: 'PUT',
    headers: auth(bob),
    body: JSON.stringify({ requiredApprovals: 1, requiredChecks: ['test'] }),
  });
  assert.equal(denied.response.status, 403);

  const alice = await login('alice-dev');
  const created = await json(`${REPO}/branches/release/protection`, {
    method: 'PUT',
    headers: auth(alice),
    body: JSON.stringify({ requiredApprovals: 1, requiredChecks: ['test'] }),
  });
  assert.equal(created.response.status, 200);
  assert.equal(created.payload.protection.branch, 'release');
  assert.equal(created.payload.protection.updatedBy, 'alice-dev');

  const reloaded = await json(REPO, { headers: auth(alice) });
  assert.equal(reloaded.payload.repo.protection.branch, 'release');

  await json(`${REPO}/branches/main/protection`, {
    method: 'PUT',
    headers: auth(alice),
    body: JSON.stringify({ branch: 'main', requiredApprovals: 1, requiredChecks: ['test'] }),
  });
});

test('check status is admin-only, defaults to pending, and records the setter', async () => {
  const alice = await login('alice-dev');
  const bob = await login('bob-reviewer');

  const before = await json(`${REPO}/pulls/1`, { headers: auth(alice) });
  assert.equal(before.payload.pull.checks.find((check) => check.name === 'test').state, 'pending');
  assert.equal(before.payload.canAdmin, true);

  const denied = await json(`${REPO}/pulls/1/checks`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({ name: 'test', state: 'success' }),
  });
  assert.equal(denied.response.status, 403);

  const saved = await json(`${REPO}/pulls/1/checks`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ name: 'test', state: 'success' }),
  });
  assert.equal(saved.response.status, 200);

  const after = await json(`${REPO}/pulls/1`, { headers: auth(alice) });
  const check = after.payload.pull.checks.find((item) => item.name === 'test');
  assert.equal(check.state, 'success');
  assert.equal(check.setBy, 'alice-dev');

  await json(`${REPO}/pulls/1/checks`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ name: 'test', state: 'pending' }),
  });
});

test('a protected branch rejects direct file writes from a non-admin writer', async () => {
  const bob = await login('bob-reviewer');
  const blocked = await json(`${REPO}/contents`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({
      path: 'docs/protected.md',
      content: 'nope',
      message: 'Attempt a direct write',
      branch: 'main',
    }),
  });
  assert.equal(blocked.response.status, 403);
  assert.match(blocked.payload.error, /protected/i);

  const allowed = await json(`${REPO}/contents`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({
      path: 'docs/unprotected.md',
      content: 'ok',
      message: 'Add unprotected doc',
      branch: 'feature-search',
    }),
  });
  assert.equal(allowed.response.status, 201);

  // REQ-4-4: the official messages for an invalid path and an empty commit message.
  const invalidPath = await json(`${REPO}/contents`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({ path: '../secret.md', content: 'x', branch: 'feature-search' }),
  });
  assert.equal(invalidPath.response.status, 400);
  assert.equal(invalidPath.payload.error, 'Invalid file path');

  const emptyMessage = await json(`${REPO}/contents`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({ path: 'docs/other.md', content: 'x', message: '   ', branch: 'feature-search' }),
  });
  assert.equal(emptyMessage.response.status, 400);
  assert.equal(emptyMessage.payload.error, 'Commit message is required');
});
