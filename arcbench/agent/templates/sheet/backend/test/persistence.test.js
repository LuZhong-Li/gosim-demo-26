// Workbooks must still be there after a process restart.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

// Kept outside test/ because the node test runner executes every file it finds
// under a test directory.
const PROBE = path.join(__dirname, '..', 'probes', 'restart-probe.js');

function runProbe(storeFile, mode) {
  const output = execFileSync(process.execPath, [PROBE, storeFile, mode], {
    encoding: 'utf8',
    env: { ...process.env },
  });
  const lastLine = output.trim().split('\n').pop();
  return JSON.parse(lastLine);
}

test('workbooks written by one process are readable after a restart', () => {
  const storeFile = path.join(os.tmpdir(), `arcbench-sheet-persist-${Date.now()}.json`);
  try {
    const wrote = runProbe(storeFile, 'write');
    assert.equal(wrote.wrote, true, 'the store file is written');

    const afterRestart = runProbe(storeFile, 'read');
    assert.ok(
      afterRestart.names.includes('Persisted workbook'),
      `expected the persisted workbook after restart, got ${JSON.stringify(afterRestart.names)}`,
    );
    // The seed still tops up the fixtures on the second start.
    assert.ok(afterRestart.names.includes('Q3 Sales'));
    assert.ok(afterRestart.names.includes('Formula examples'));
  } finally {
    if (fs.existsSync(storeFile)) fs.unlinkSync(storeFile);
  }
});
