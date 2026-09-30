// REQ-2 / REQ-3-4 / REQ-6-2 / REQ-6-2-2 / REQ-6-5: repository guards, pull
// request duplication rules and merge-conflict detection.
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

test('a second pull request for the same branches is rejected', async () => {
  const alice = await login('alice-dev');
  const duplicate = await json(`${REPO}/pulls`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ title: 'Duplicate', baseBranch: 'main', headBranch: 'feature-search' }),
  });
  assert.equal(duplicate.response.status, 422);
  assert.match(duplicate.payload.error, /already exists/);
});

test('opening a pull request records an activity on it', async () => {
  const alice = await login('alice-dev');
  const created = await json(`${REPO}/pulls`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ title: 'Release prep', baseBranch: 'main', headBranch: 'release' }),
  });
  assert.equal(created.response.status, 201);
  const types = created.payload.pull.activities.map((activity) => activity.type);
  assert.ok(types.includes('Opened this pull request'));
  assert.ok(created.payload.pull.baseSha, 'the creation-time base commit is stored');
});

test('only writers may compare branches', async () => {
  const carol = await login('carol-reader');
  const denied = await json(`${REPO}/compare?base=main&head=feature-search`, {
    headers: auth(carol),
  });
  assert.equal(denied.response.status, 403);
});

test('a private repository is refused for visitors on every read route', async () => {
  const anonymous = await json('/api/repos/acme-demo/acme-private/tree');
  assert.equal(anonymous.response.status, 403);
  assert.equal(anonymous.payload.error, 'Access denied');

  const alice = await login('alice-dev');
  const allowed = await json('/api/repos/acme-demo/acme-private/tree', { headers: auth(alice) });
  assert.equal(allowed.response.status, 200);
});

test('conflicting edits on both branches block the merge', async () => {
  const alice = await login('alice-dev');

  // The pull request records main's head as its ancestor, so editing the same
  // file on main and on the compare branch makes both sides diverge.
  const baseEdit = await json(`${REPO}/contents`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({
      path: 'src/search.ts',
      content: 'main side change\n',
      message: 'Base side change',
      branch: 'main',
    }),
  });
  assert.equal(baseEdit.response.status, 201);

  const detail = await json(`${REPO}/pulls/1`, { headers: auth(alice) });
  assert.deepEqual(detail.payload.conflicts, ['src/search.ts']);

  const merge = await json(`${REPO}/pulls/1/merge`, { method: 'POST', headers: auth(alice) });
  assert.equal(merge.response.status, 409);
  assert.match(merge.payload.error, /Merge conflict/);

  const stillOpen = await json(`${REPO}/pulls/1`, { headers: auth(alice) });
  assert.equal(stillOpen.payload.pull.state, 'open');
});

test('an ordinary conversation comment is accepted from the author', async () => {
  const alice = await login('alice-dev');
  const created = await json(`${REPO}/pulls/2/comments`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ body: 'Thanks, addressed.' }),
  });
  assert.equal(created.response.status, 201);

  const detail = await json(`${REPO}/pulls/2`, { headers: auth(alice) });
  assert.equal(detail.payload.pull.comments.length, 1);
  assert.equal(detail.payload.pull.comments[0].body, 'Thanks, addressed.');
  assert.ok(detail.payload.pull.activities.some((activity) => activity.type === 'Commented'));
});

test('a line-level review comment still requires a non-author reviewer', async () => {
  const alice = await login('alice-dev');
  const selfReview = await json(`${REPO}/pulls/2/comments`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ path: 'src/search.ts', line: 1, body: 'self review' }),
  });
  assert.equal(selfReview.response.status, 403);
});

test('status transitions and reviews land in the pull request timeline', async () => {
  const alice = await login('alice-dev');
  const bob = await login('bob-reviewer');

  // Self-contained: the seeded repositories already own some pull numbers.
  await json(`${REPO}/branches`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ name: 'timeline-branch' }),
  });
  const created = await json(`${REPO}/pulls`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({
      title: 'Timeline transitions',
      baseBranch: 'main',
      headBranch: 'timeline-branch',
    }),
  });
  assert.equal(created.response.status, 201);
  const number = created.payload.pull.number;

  const closed = await json(`${REPO}/pulls/${number}`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ state: 'closed' }),
  });
  assert.equal(closed.response.status, 200);

  const reopened = await json(`${REPO}/pulls/${number}`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ state: 'open' }),
  });
  assert.equal(reopened.response.status, 200);

  const review = await json(`${REPO}/pulls/${number}/reviews`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({ state: 'APPROVED', body: 'Ship it.' }),
  });
  assert.equal(review.response.status, 201);

  const detail = await json(`${REPO}/pulls/${number}`, { headers: auth(alice) });
  const types = detail.payload.pull.activities.map((activity) => activity.type);
  assert.ok(types.includes('Opened this pull request'));
  assert.ok(types.includes('Closed this pull request'));
  assert.ok(types.includes('Reopened this pull request'));
  assert.ok(types.includes('Approved this pull request'));
});
