// Spawned by persistence.test.js WITHOUT NODE_TEST_CONTEXT so the store file is
// actually used. usage: node restart-probe.js <storeFile> <write|read>
const fs = require('fs');
const path = require('path');

const [storeFile, mode] = process.argv.slice(2);
delete process.env.NODE_TEST_CONTEXT;
process.env.ARC_DB_FILE = storeFile;
if (mode === 'write' && fs.existsSync(storeFile)) fs.unlinkSync(storeFile);

const app = require(path.join(__dirname, '..', 'src', 'app'));
const store = require(path.join(__dirname, '..', 'src', 'gh_store'));
const { seed } = require(path.join(__dirname, '..', 'src', 'seed'));
seed(store);

const REPO = '/api/repos/acme-demo/acme-docs';

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    if (mode === 'write') {
      const login = await (
        await fetch(`${base}/api/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identifier: 'alice-dev', password: 'Valid-password-123!' }),
        })
      ).json();
      const headers = {
        'content-type': 'application/json',
        authorization: `Bearer ${login.token}`,
      };
      await fetch(`${base}${REPO}/issues`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'Persisted across restart' }),
      });
      // Give the debounced writer a chance to flush before the process exits.
      await new Promise((resolve) => setTimeout(resolve, 250));
      console.log(JSON.stringify({ wrote: fs.existsSync(storeFile) }));
    } else {
      const list = await (await fetch(`${base}${REPO}/issues`)).json();
      console.log(JSON.stringify({ titles: list.issues.map((issue) => issue.title) }));
    }
  } finally {
    server.close();
  }
});
