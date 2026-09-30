// Spawned by persistence.test.js WITHOUT NODE_TEST_CONTEXT so the store file is
// actually used. usage: node restart-probe.js <storeFile> <write|read>
const fs = require('fs');
const path = require('path');

const [storeFile, mode] = process.argv.slice(2);
delete process.env.NODE_TEST_CONTEXT;
process.env.ARC_DB_FILE = storeFile;
if (mode === 'write' && fs.existsSync(storeFile)) fs.unlinkSync(storeFile);

const app = require(path.join(__dirname, '..', 'src', 'app'));

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'content-type': 'application/json' };
  try {
    if (mode === 'write') {
      await fetch(`${base}/api/workbooks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Persisted workbook' }),
      });
      // Give the debounced writer a chance to flush before the process exits.
      await new Promise((resolve) => setTimeout(resolve, 250));
      console.log(JSON.stringify({ wrote: fs.existsSync(storeFile) }));
    } else {
      const list = await (await fetch(`${base}/api/workbooks`)).json();
      console.log(JSON.stringify({ names: list.workbooks.map((item) => item.name) }));
    }
  } finally {
    server.close();
  }
});
