// REQ-5-2-1 / REQ-6-2-3 / REQ-6-5 / REQ-6-6: title validation, merge method and close permissions.
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

test('whitespace-only titles are rejected with the official message', async () => {
  const alice = await login('alice-dev');

  const pull = await json(`${REPO}/pulls`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ title: '   ', baseBranch: 'main', headBranch: 'release' }),
  });
  assert.equal(pull.response.status, 400);
  assert.equal(pull.payload.error, 'Title is required');

  const issue = await json(`${REPO}/issues`, {
    method: 'POST',
    headers: auth(alice),
    body: JSON.stringify({ title: '   ' }),
  });
  assert.equal(issue.response.status, 400);
  assert.equal(issue.payload.error, 'Title is required');

  const edit = await json(`${REPO}/issues/1`, {
    method: 'PATCH',
    headers: auth(alice),
    body: JSON.stringify({ title: '   ' }),
  });
  assert.equal(edit.response.status, 400);
  assert.equal(edit.payload.error, 'Title is required');
});

test('the seeded list contains an Open PR by the author and a Closed PR by a second account', async () => {
  const list = await json(`${REPO}/pulls`);
  const open = list.payload.pulls.find((pull) => pull.title === 'Improve onboarding');
  const closed = list.payload.pulls.find((pull) => pull.title === 'Retire legacy banner');
  assert.equal(open.state, 'open');
  assert.equal(open.author, 'alice-dev');
  assert.equal(closed.state, 'closed');
  assert.equal(closed.author, 'bob-reviewer');
});

test('close and reopen are limited to the author, maintainers and owners', async () => {
  const [alice, bob, carol] = await Promise.all([
    login('alice-dev'),
    login('bob-reviewer'),
    login('carol-reader'),
  ]);

  const asAuthor = await json(`${REPO}/pulls/1`, { headers: auth(alice) });
  assert.equal(asAuthor.payload.canClose, true);

  const asMaintainer = await json(`${REPO}/pulls/1`, { headers: auth(bob) });
  assert.equal(asMaintainer.payload.canClose, true);

  const asReader = await json(`${REPO}/pulls/1`, { headers: auth(carol) });
  assert.equal(asReader.payload.canClose, false);

  const anonymous = await json(`${REPO}/pulls/1`);
  assert.equal(anonymous.payload.canClose, false);

  const rejected = await json(`${REPO}/pulls/1`, {
    method: 'PATCH',
    headers: auth(carol),
    body: JSON.stringify({ state: 'closed' }),
  });
  assert.equal(rejected.response.status, 403);
});

test('a current request-changes decision blocks the merge', async () => {
  const alice = await login('alice-dev');
  const bob = await login('bob-reviewer');

  const review = await json(`${REPO}/pulls/2/reviews`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({ state: 'CHANGES_REQUESTED', body: 'Please adjust.' }),
  });
  assert.equal(review.response.status, 201);

  const merge = await json(`${REPO}/pulls/2/merge`, { method: 'POST', headers: auth(alice) });
  assert.equal(merge.response.status, 422);
  assert.match(merge.payload.error, /changes/i);

  const stillOpen = await json(`${REPO}/pulls/2`, { headers: auth(alice) });
  assert.equal(stillOpen.payload.pull.state, 'open');
});

test('a newer approval clears the block and merging creates a merge commit', async () => {
  const alice = await login('alice-dev');
  const bob = await login('bob-reviewer');

  const approval = await json(`${REPO}/pulls/2/reviews`, {
    method: 'POST',
    headers: auth(bob),
    body: JSON.stringify({ state: 'APPROVED', body: 'Looks good now.' }),
  });
  assert.equal(approval.response.status, 201);

  const merge = await json(`${REPO}/pulls/2/merge`, { method: 'POST', headers: auth(alice) });
  assert.equal(merge.response.status, 200);
  assert.equal(merge.payload.pull.state, 'merged');
  assert.ok(merge.payload.pull.mergeCommit, 'merge commit is reported');
  assert.equal(merge.payload.pull.mergedBy, 'alice-dev');

  const repo = store.findRepo('acme-demo', 'acme-docs');
  assert.equal(store.branchHead(repo, 'main'), merge.payload.pull.mergeCommit);
  const commit = store.commitBySha(repo, merge.payload.pull.mergeCommit);
  assert.equal(commit.parents.length, 2);
});
