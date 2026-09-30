// REQ-2-2-1 / REQ-2-2-2 / REQ-2-2-3 / REQ-2-2-4: teams, members and hierarchy.
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
const ORG = '/api/orgs/acme-demo';

test('team creation validates the name and requires an owner', async () => {
  const alice = await login('alice-dev');
  const bob = await login('bob-reviewer');

  const denied = await json(`${ORG}/teams`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({ name: 'mobile-team' }),
  });
  assert.equal(denied.response.status, 403);

  for (const bad of ['Mobile Team', '-leading', 'trailing-', 'a'.repeat(51), '']) {
    const invalid = await json(`${ORG}/teams`, {
      method: 'POST',
      headers: auth(alice),
      body: JSON.stringify({ name: bad }),
    });
    assert.equal(invalid.response.status, 400, `expected ${bad} to be invalid`);
    assert.equal(invalid.payload.error, 'Team name format is invalid');
  }

  const created = await json(`${ORG}/teams`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ name: 'mobile-team', description: 'Mobile guild' }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.payload.team.name, 'mobile-team');
  assert.equal(created.payload.team.creator, 'alice-dev');

  const detail = await json(`${ORG}/teams/mobile-team`, { headers: auth(alice) });
  assert.equal(detail.response.status, 200);
  assert.equal(detail.payload.org.name, 'acme-demo');
  assert.equal(detail.payload.team.name, 'mobile-team');
  assert.ok(detail.payload.teams.includes('frontend-team'));
});

test('team members can be added and removed', async () => {
  const alice = await login('alice-dev');

  const unknown = await json(`${ORG}/teams/mobile-team/members`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ username: 'nobody-here' }),
  });
  assert.equal(unknown.response.status, 404);
  assert.equal(unknown.payload.error, 'Account not found');

  const added = await json(`${ORG}/teams/mobile-team/members`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ username: 'bob-reviewer' }),
  });
  assert.equal(added.response.status, 201);
  assert.deepEqual(added.payload.team.members, ['bob-reviewer']);

  const removed = await json(`${ORG}/teams/mobile-team/members/bob-reviewer`, {
    method: 'DELETE',
    headers: auth(alice),
  });
  assert.equal(removed.response.status, 200);
  assert.deepEqual(removed.payload.team.members, []);
});

test('a team hierarchy cycle is rejected with the official message', async () => {
  const alice = await login('alice-dev');

  await json(`${ORG}/teams`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ name: 'platform-team' }),
  });
  await json(`${ORG}/teams/platform-team`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ parentTeam: 'mobile-team' }),
  });

  const cycle = await json(`${ORG}/teams/mobile-team`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ parentTeam: 'platform-team' }),
  });
  assert.equal(cycle.response.status, 400);
  assert.equal(cycle.payload.error, 'Cyclic team hierarchy is not allowed');
});

test('adding an organization member uses the official messages', async () => {
  const alice = await login('alice-dev');

  const duplicate = await json(`${ORG}/members`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ username: 'bob-reviewer', role: 'Member' }),
  });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.payload.error, 'Account is already a member');

  const unknown = await json(`${ORG}/members`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ username: 'ghost-user', role: 'Member' }),
  });
  assert.equal(unknown.response.status, 404);
  assert.equal(unknown.payload.error, 'Account not found');
});

test('a private repository that the user cannot read reports Access denied', async () => {
  const carol = await login('carol-reader');
  const denied = await json('/api/repos/acme-demo/acme-private', { headers: auth(carol) });
  assert.equal(denied.response.status, 200);

  const anonymous = await json('/api/repos/acme-demo/acme-private');
  assert.equal(anonymous.response.status, 403);
  assert.equal(anonymous.payload.error, 'Access denied');
});
