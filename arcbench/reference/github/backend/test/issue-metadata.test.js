// REQ-5-2-2 / REQ-5-2-3 / REQ-5-3-1 / REQ-5-3-2 / REQ-5-3-3: metadata editing,
// validation and the append-only activity timeline.
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

test('the repository exposes its label catalog and assignable members', async () => {
  const list = await json(`${REPO}/labels`);
  assert.deepEqual(list.payload.labels, ['bug', 'documentation', 'enhancement']);

  const members = await json(`${REPO}/members`);
  assert.ok(members.payload.members.includes('alice-dev'));
  assert.ok(members.payload.members.includes('bob-reviewer'));
  // REQ-5-3-1: a read-only collaborator is not an assignable participant.
  assert.equal(members.payload.members.includes('carol-reader'), false);
});

test('labels outside the repository catalog are rejected', async () => {
  const alice = await login('alice-dev');
  const created = await json(`${REPO}/issues`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ title: 'Label validation', labels: ['not-a-label'] }),
  });
  assert.equal(created.response.status, 422);
  assert.match(created.payload.error, /Label not found/);

  // REQ-5-2-1: a rejected creation must not allocate an issue number.
  const list = await json(`${REPO}/issues`, { headers: auth(alice) });
  assert.equal(list.payload.issues.some((issue) => issue.title === 'Label validation'), false);
});

test('assignees without triage-or-higher are rejected', async () => {
  const alice = await login('alice-dev');
  const created = await json(`${REPO}/issues`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ title: 'Assignee validation', assignees: ['carol-reader'] }),
  });
  assert.equal(created.response.status, 422);
  assert.match(created.payload.error, /Users not in organization/);
});

test('every issue mutation appends an activity record', async () => {
  const alice = await login('alice-dev');
  const created = await json(`${REPO}/issues`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ title: 'Timeline coverage', body: 'first' }),
  });
  const number = created.payload.issue.number;

  await json(`${REPO}/issues/${number}`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ title: 'Timeline coverage renamed' }),
  });
  await json(`${REPO}/issues/${number}/comments`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ body: 'A comment' }),
  });
  await json(`${REPO}/issues/${number}`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ assignees: ['bob-reviewer'] }),
  });
  await json(`${REPO}/issues/${number}`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ labels: ['bug'] }),
  });
  await json(`${REPO}/issues/${number}`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ milestone: 'v1.0' }),
  });
  await json(`${REPO}/issues/${number}`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ state: 'closed' }),
  });

  const detail = await json(`${REPO}/issues/${number}`, { headers: auth(alice) });
  const types = detail.payload.issue.activities.map((activity) => activity.type);
  assert.ok(types.includes('Created issue'));
  assert.ok(types.includes('Edited the issue title'));
  assert.ok(types.includes('Commented'));
  assert.ok(types.some((type) => type.startsWith('Assigned bob-reviewer')));
  assert.ok(types.some((type) => type.includes('bug')));
  assert.ok(types.some((type) => type.includes('v1.0')));
  assert.ok(types.includes('Closed issue'));

  // The comment is retained in the discussion as well as the timeline.
  assert.equal(detail.payload.issue.comments.length, 1);
});

test('metadata edits require triage-or-higher', async () => {
  const carol = await login('carol-reader');
  const list = await json(`${REPO}/issues`, { headers: auth(carol) });
  const target = list.payload.issues.find((issue) => issue.title === 'Improve onboarding');

  const labelled = await json(`${REPO}/issues/${target.number}`, {
    method: 'PATCH',
    headers: auth(carol),
    body: JSON.stringify({ labels: ['bug'] }),
  });
  assert.equal(labelled.response.status, 403);

  const assigned = await json(`${REPO}/issues/${target.number}`, {
    method: 'PATCH',
    headers: auth(carol),
    body: JSON.stringify({ assignees: ['bob-reviewer'] }),
  });
  assert.equal(assigned.response.status, 403);
});
