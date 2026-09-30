// Generic persistence helper: everything the application writes is mirrored to
// one JSON file so state survives a restart. Task-specific collections live in
// the generated routes, not here.

const fs = require('fs');
const os = require('os');
const path = require('path');

const PERSIST = process.env.NODE_TEST_CONTEXT === undefined && process.env.ARC_STORE !== 'memory';
const STORE_FILE =
  process.env.ARC_DB_FILE || path.join(os.tmpdir(), 'arcbench-scaffold-store.json');

const state = {};

function save() {
  if (!PERSIST) return;
  try {
    const tmp = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, STORE_FILE);
  } catch {
    // Best effort: keep serving from memory.
  }
}

function hydrate() {
  if (!PERSIST) return;
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    for (const [key, value] of Object.entries(raw)) state[key] = value;
  } catch {
    // A missing or corrupt file simply starts empty.
  }
}

hydrate();

module.exports = { state, save, hydrate };
