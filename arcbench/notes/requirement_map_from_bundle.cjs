#!/usr/bin/env node
/**
 * Rebuild assets/<task>/requirement-map.json from the canonical task bundle.
 *
 *   node arcbench/notes/requirement_map_from_bundle.cjs github
 *   node arcbench/notes/requirement_map_from_bundle.cjs sheet
 *
 * Source of truth: arcbench/requirements/hackathon--<task>/requirements.yaml
 * (the file the platform serves). Writes BOTH copies the repo keeps in sync:
 * arcbench/assets/<task>/ and arcbench/agent/assets/<task>/, the latter being
 * the one the packaged generator reads (main.py: ASSETS = ROOT / "assets").
 *
 * The old map is read first and its per-node `checklist` is carried over by node
 * id: the checklist comes from the live task page, which is scraped separately.
 *
 * Why this exists: the revision stored in data/requirements/<task>.json is
 * older than the bundle the platform serves - on github, 55 of 65 nodes have a
 * different description in the newer revision. Generating against the stale
 * copy means the model never sees the exact strings the tests look for.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JS_YAML_CANDIDATES = [
  'js-yaml',
  path.join(ROOT, 'reference', 'github', 'frontend', 'node_modules', '.pnpm',
            'js-yaml@4.3.2', 'node_modules', 'js-yaml'),
  path.join(ROOT, 'reference', 'sheet', 'frontend', 'node_modules', '.pnpm',
            'js-yaml@4.3.2', 'node_modules', 'js-yaml'),
];

function loadYaml() {
  for (const candidate of JS_YAML_CANDIDATES) {
    try {
      return require(candidate);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('js-yaml not found; run `npm i js-yaml` next to this script');
}

/** The trailing "Screenshot reference" / "Required system data" paragraph. */
function seedHint(description) {
  const text = description || '';
  for (const marker of ['Required system data', 'Screenshot reference', 'The system must contain']) {
    const index = text.indexOf(marker);
    if (index >= 0) return text.slice(index).trim();
  }
  return '';
}

/** reference/*.png paths quoted inside the description. */
function visualReference(description) {
  const found = new Set();
  for (const match of (description || '').matchAll(/\(([^()]*reference\/[^()]+\.(?:png|jpg|jpeg|webp))\)/gi)) {
    found.add(match[1]);
  }
  return [...found];
}

/**
 * Checklist items that assert nothing: the scrape of the live sheet task page
 * came back as template filler ("The application exposes the observable result
 * for \"the requested workflow...\""), and every github section repeats its own
 * title at the start of the first bullet. Both were being injected into the
 * prompt as "exact assertions", so a control named "the requested workflow"
 * looked like a requirement.
 */
const FILLER_CHECKLIST = /requested workflow/i;
const FILLER_PREFIX = /^The application exposes the observable result for/i;

function usefulChecklist(node, items) {
  const title = (node.name || '').trim().toLowerCase();
  return items
    .map((item) => String(item).trim())
    .filter((item) => item
      && !FILLER_CHECKLIST.test(item)
      && !FILLER_PREFIX.test(item)
      && !(title && item.toLowerCase().startsWith(`${title} ${title}`)));
}

function moduleOf(id) {
  const parts = String(id).split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : String(id);
}

function walked(node, out) {
  out.push(node);
  for (const child of node.children || []) walked(child, out);
  return out;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function main(argv) {
  if (argv.length !== 1 || !['github', 'sheet'].includes(argv[0])) {
    console.error('usage: requirement_map_from_bundle.cjs <github|sheet>');
    return 2;
  }
  const task = argv[0];
  const bundle = path.join(ROOT, 'requirements', `hackathon--${task}`);
  const tree = loadYaml().load(fs.readFileSync(path.join(bundle, 'requirements.yaml'), 'utf8'));

  const previous = readJson(path.join(ROOT, 'agent', 'assets', task, 'requirement-map.json')) || {};
  const checklists = new Map(
    (previous.nodes || []).map((node) => [node.id, node.checklist || []]),
  );

  const nodes = walked(tree, []).map((node) => ({
    id: node.id,
    module: moduleOf(node.id),
    title: node.name || '',
    type: node.type || '',
    dependencies: node.dependencies || [],
    description: node.description || '',
    scenarios: node.scenarios || [],
    seed_hint: seedHint(node.description),
    visual_reference: visualReference(node.description),
    checklist: usefulChecklist(node, checklists.get(node.id) || []),
  }));

  const payload = `${JSON.stringify({
    task: tree.name || task,
    task_id: task,
    generated_at: new Date().toISOString(),
    source: `arcbench/requirements/hackathon--${task}/requirements.yaml`,
    nodes,
  }, null, 2)}\n`;

  for (const dir of [path.join(ROOT, 'assets', task), path.join(ROOT, 'agent', 'assets', task)]) {
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, 'requirement-map.json');
    fs.writeFileSync(target, payload, 'utf8');
    console.log(`wrote ${path.relative(ROOT, target)}`);
  }
  const scenarios = nodes.reduce((sum, node) => sum + node.scenarios.length, 0);
  const carried = nodes.filter((node) => node.checklist.length).length;
  console.log(`  nodes=${nodes.length} atomics=${nodes.filter((n) => n.type === 'ATOMIC').length} ` +
              `scenarios=${scenarios} checklists-carried=${carried}`);
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
