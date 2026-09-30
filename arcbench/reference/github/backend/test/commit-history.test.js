// REQ-4-2-1 / REQ-4-2-2: branch history, file-scoped history and a single
// commit's base/compare revisions.
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

async function json(path) {
  const response = await fetch(`${base}${path}`);
  return { response, payload: await response.json() };
}

const REPO = '/api/repos/acme-demo/acme-docs';

test('the branch history lists commits newest first', async () => {
  const { payload } = await json(`${REPO}/commits`);
  assert.ok(payload.commits.length >= 2);
  assert.equal(payload.path, null);
  const times = payload.commits.map((commit) => Date.parse(commit.timestamp));
  for (let index = 1; index < times.length; index += 1) {
    assert.ok(times[index - 1] >= times[index], 'commits are ordered newest first');
  }
});

test('the history can be scoped to one file', async () => {
  const { payload } = await json(`${REPO}/commits?path=src/search.ts`);
  assert.equal(payload.path, 'src/search.ts');
  assert.ok(payload.commits.length > 0);
  assert.ok(payload.commits.every((commit) => (commit.changed || []).includes('src/search.ts')));

  const unrelated = await json(`${REPO}/commits?path=docs/never-touched.md`);
  assert.deepEqual(unrelated.payload.commits, []);
});

test('a single commit diff names its base and compare revision', async () => {
  const list = await json(`${REPO}/commits`);
  const sha = list.payload.commits[0].sha;

  const { payload } = await json(`${REPO}/commits/${sha}`);
  assert.equal(payload.commit.sha, sha);
  assert.ok(payload.files.length > 0);
  assert.ok(payload.parentSha, 'the base revision is reported');
  assert.ok(payload.files.every((file) => Array.isArray(file.lines) && file.lines.length > 0));
});
