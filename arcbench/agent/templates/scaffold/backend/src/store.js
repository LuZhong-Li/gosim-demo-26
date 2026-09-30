// Generic persistence helper: everything the application writes is mirrored to
// one JSON file so state survives a restart. Task-specific collections live in
// the generated routes, not here.

const fs = require('fs');
const os = require('os');
const path = require('path');

const PERSIST = process.env.NODE_TEST_CONTEXT === undefined && process.env.ARC_STORE !== 'memory';
const STORE_FILE =
  process.env.ARC_DB_FILE || path.join(os.tmpdir(), 'arcbench-scaffold-store.json');

// The real backing object, kept separate from the Proxy so `collection()` can
// inspect and seed it directly (reading through the Proxy would auto-create an
// empty object before `collection()` could set the requested initial value).
const backing = {};
// Keys that were only auto-created by a stray read, not explicitly seeded.
// `collection()` uses this so an explicit ``collection('users', [])`` can replace
// an earlier accidental ``{}`` instead of being defeated by it.
const autoInitialised = new Set();

// The public store. It is wrapped in a Proxy so a read of a collection that has
// not been seeded yet auto-initialises to an empty object instead of throwing
// ``TypeError: Cannot read properties of undefined/null``. That single guard is
// what keeps a half-generated backend from crashing at module load (r38 GitHub
// died on ``null.initialized`` exactly this way).
const state = new Proxy(backing, {
  get(target, prop) {
    // ``then`` (Promise) and ``toJSON`` (JSON.stringify) must never be
    // auto-created, or the store is mistaken for a thenable and the snapshot
    // gains a spurious ``"toJSON":{}`` key.
    if (prop === 'then' || prop === 'toJSON') return undefined;
    if (typeof prop === 'symbol') return target[prop];
    if (target[prop] === undefined || target[prop] === null) {
      target[prop] = {};
      autoInitialised.add(prop);
    }
    return target[prop];
  },
  set(target, prop, value) {
    target[prop] = value;
    autoInitialised.delete(prop);
    return true;
  },
});

// Auto-initialising accessor. Prefer this over reading ``state.x`` directly:
// ``collection('users', [])`` gives you a list, ``collection('settings')`` a
// record, and neither ever returns null.
function collection(name, initial) {
  if (autoInitialised.has(name) || backing[name] === undefined || backing[name] === null) {
    backing[name] = initial === undefined ? {} : initial;
    autoInitialised.delete(name);
  }
  return backing[name];
}

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
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) state[key] = value;
  } catch {
    // A missing or corrupt file simply starts empty.
  }
}

hydrate();

module.exports = { state, collection, save, hydrate };
