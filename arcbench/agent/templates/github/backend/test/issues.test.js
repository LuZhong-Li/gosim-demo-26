// REQ-5-1-1 / REQ-5-2-1 / REQ-5-2-2 / REQ-5-3-3 / REQ-5-4: issue list, edit and status.
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

test('the seeded issues match the official titles, states and labels', async () => {
  const alice = await login('alice-dev');
  const carol = await login('carol-reader');

  const list = await json(`${REPO}/issues`, { headers: auth(alice) });
  const titles = list.payload.issues.map((issue) => issue.title);
  assert.ok(titles.includes('Improve onboarding'));
  assert.ok(titles.includes('Legacy welcome text'));
  assert.ok(titles.includes('Original issue title'));

  const open = list.payload.issues.find((issue) => issue.title === 'Improve onboarding');
  assert.equal(open.state, 'open');
  assert.deepEqual(open.labels, ['bug', 'documentation']);
  assert.equal(open.milestone, 'Q3 launch');
  assert.equal(open.canEdit, true);
  assert.equal(open.canClose, true);

  const closed = list.payload.issues.find((issue) => issue.title === 'Legacy welcome text');
  assert.equal(closed.state, 'closed');

  const asReader = await json(`${REPO}/issues`, { headers: auth(carol) });
  assert.equal(asReader.payload.issues.every((issue) => issue.canEdit === false), true);
  assert.equal(asReader.payload.issues.every((issue) => issue.canClose === false), true);
});

test('editing an issue needs write permission and rejects a blank title', async () => {
  const alice = await login('alice-dev');
  const carol = await login('carol-reader');

  const denied = await json(`${REPO}/issues/1`, {
    method: 'PATCH',
    headers: auth(carol),
    body: JSON.stringify({ title: 'Nope' }),
  });
  assert.equal(denied.response.status, 403);

  const blank = await json(`${REPO}/issues/3`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ title: '   ' }),
  });
  assert.equal(blank.response.status, 400);
  assert.equal(blank.payload.error, 'Title is required');

  const saved = await json(`${REPO}/issues/3`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ title: 'Original issue title v2', body: 'Updated description.' }),
  });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.payload.issue.title, 'Original issue title v2');

  const restored = await json(`${REPO}/issues/3`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ title: 'Original issue title', body: 'Original issue description.' }),
  });
  assert.equal(restored.payload.issue.title, 'Original issue title');
});

test('only triage-or-higher may close or reopen, and the activity is recorded', async () => {
  const alice = await login('alice-dev');
  const carol = await login('carol-reader');

  const denied = await json(`${REPO}/issues/1`, {
    method: 'PATCH',
    headers: auth(carol),
    body: JSON.stringify({ state: 'closed' }),
  });
  assert.equal(denied.response.status, 403);

  const closed = await json(`${REPO}/issues/1`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ state: 'closed' }),
  });
  assert.equal(closed.response.status, 200);
  assert.equal(closed.payload.issue.state, 'closed');
  assert.ok(closed.payload.issue.activities.some((entry) => entry.type === 'Closed issue'));

  const reopened = await json(`${REPO}/issues/1`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ state: 'open' }),
  });
  assert.equal(reopened.payload.issue.state, 'open');
  assert.ok(reopened.payload.issue.activities.some((entry) => entry.type === 'Reopened issue'));
});

test('milestones come from the current repository only', async () => {
  const list = await json(`${REPO}/milestones`);
  assert.deepEqual(list.payload.milestones, ['Q3 launch', 'v1.0']);

  const other = await json('/api/repos/acme-demo/acme-private/milestones');
  assert.deepEqual(other.payload.milestones, []);
});

test('assigning a milestone needs triage-or-higher on issues and pull requests', async () => {
  const carol = await login('carol-reader');
  const bob = await login('bob-reviewer');
  const alice = await login('alice-dev');

  const denied = await json(`${REPO}/issues/1`, {
    method: 'PATCH',
    headers: auth(carol),
    body: JSON.stringify({ milestone: 'v1.0' }),
  });
  assert.equal(denied.response.status, 403);

  const saved = await json(`${REPO}/issues/1`, {
    method: 'PATCH',
    headers: auth(bob),
    body: JSON.stringify({ milestone: 'v1.0' }),
  });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.payload.issue.milestone, 'v1.0');

  const detail = await json(`${REPO}/issues/1`, { headers: auth(alice) });
  assert.equal(detail.payload.issue.milestone, 'v1.0');

  // REQ-5-3-3: a milestone-only pull-request update is accepted with triage rights.
  const prDenied = await json(`${REPO}/pulls/1`, {
    method: 'PATCH',
    headers: auth(carol),
    body: JSON.stringify({ milestone: 'v1.0' }),
  });
  assert.equal(prDenied.response.status, 403);

  const prSaved = await json(`${REPO}/pulls/1`, {
    method: 'PATCH',
    headers: auth(bob),
    body: JSON.stringify({ milestone: 'v1.0' }),
  });
  assert.equal(prSaved.response.status, 200);
  assert.equal(prSaved.payload.pull.milestone, 'v1.0');

  // Restore the seeded associations.
  await json(`${REPO}/issues/1`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ milestone: 'Q3 launch' }),
  });
  await json(`${REPO}/pulls/1`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ milestone: null }),
  });
});

test('a whitespace-only comment uses the official message', async () => {
  const alice = await login('alice-dev');

  const empty = await json(`${REPO}/issues/1/comments`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ body: '   ' }),
  });
  assert.equal(empty.response.status, 400);
  assert.equal(empty.payload.error, 'Comment is required');

  const saved = await json(`${REPO}/issues/1/comments`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ body: 'Looks good' }),
  });
  assert.equal(saved.response.status, 201);
});
