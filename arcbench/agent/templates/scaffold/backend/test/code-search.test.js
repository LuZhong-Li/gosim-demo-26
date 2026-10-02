// REQ-4-2-3: code search reads the readable content of one branch, can be
// narrowed by path and language, and never leaks an unauthorized repository.
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

test('code search reports the snippet, path, branch and revision', async () => {
  const { payload } = await json(`${REPO}/search?q=search`);
  assert.ok(payload.matches.length > 0);
  const hit = payload.matches.find((match) => match.path === 'src/search.ts');
  assert.ok(hit, `expected src/search.ts in ${JSON.stringify(payload.matches)}`);
  assert.equal(hit.branch, 'main');
  assert.ok(hit.line >= 1);
  assert.ok(hit.sha, 'the revision the content was read from is reported');
  assert.ok(hit.snippet.toLowerCase().includes('search'));
});

test('code search can be narrowed by path', async () => {
  const { payload } = await json(`${REPO}/search?q=search&path=src/`);
  assert.ok(payload.matches.length > 0);
  assert.ok(payload.matches.every((match) => match.path.startsWith('src/')));

  const empty = await json(`${REPO}/search?q=search&path=docs-nowhere/`);
  assert.deepEqual(empty.payload.matches, []);
});

test('code search can be narrowed by language', async () => {
  const typescript = await json(`${REPO}/search?q=search&language=typescript`);
  assert.ok(typescript.payload.matches.length > 0);
  assert.ok(typescript.payload.matches.every((match) => match.path.endsWith('.ts')));

  const markdown = await json(`${REPO}/search?q=note&language=markdown`);
  assert.ok(markdown.payload.matches.every((match) => match.path.endsWith('.md')));
});

test('code search reads the requested branch', async () => {
  const onMain = await json(`${REPO}/search?q=Main-only&branch=main`);
  assert.deepEqual(onMain.payload.matches, []);

  const onFeature = await json(`${REPO}/search?q=Main-only&branch=feature-search`);
  assert.equal(onFeature.payload.branch, 'feature-search');
  assert.equal(onFeature.payload.matches.length, 1);
  assert.equal(onFeature.payload.matches[0].path, 'main-only.md');
});

test('code search rejects an unknown branch and an unreadable repository', async () => {
  const unknown = await json(`${REPO}/search?q=search&branch=no-such-branch`);
  assert.equal(unknown.response.status, 404);

  const privateRepo = await json('/api/repos/acme-demo/acme-private/search?q=README');
  assert.equal(privateRepo.response.status, 403);
  assert.equal(privateRepo.payload.error, 'Access denied');
});
