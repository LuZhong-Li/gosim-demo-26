#!/usr/bin/env node
/**
 * Convert an official ARC-Bench task bundle (requirements.yaml) into the JSON
 * tree the rest of the tooling diffs against.
 *
 *   node arcbench/notes/requirements_to_json.cjs \
 *     arcbench/requirements/hackathon--github
 *
 * Writes <dir>/requirements.json next to the YAML and prints the shape of the
 * tree (nodes / atomics / scenarios / steps) so a refresh is easy to eyeball.
 *
 * The generated JSON is the machine-readable copy of the task requirements that
 * check_requirement_map.py reads, so the completeness check needs no YAML parser
 * and no network. PyYAML is not installed in this environment, which is why this
 * step runs on node; js-yaml ships inside the vendored app copies.
 */

const fs = require('fs');
const path = require('path');

const JS_YAML_CANDIDATES = [
  'js-yaml',
  path.join(__dirname, '..', 'reference', 'github', 'frontend', 'node_modules',
            '.pnpm', 'js-yaml@4.3.2', 'node_modules', 'js-yaml'),
  path.join(__dirname, '..', 'reference', 'sheet', 'frontend', 'node_modules',
            '.pnpm', 'js-yaml@4.3.2', 'node_modules', 'js-yaml'),
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

function stats(node, acc) {
  acc.nodes += 1;
  acc[node.type === 'ATOMIC' ? 'atomics' : 'folders'] += 1;
  const scenarios = node.scenarios || [];
  acc.scenarios += scenarios.length;
  for (const scenario of scenarios) acc.steps += (scenario.steps || []).length;
  for (const child of node.children || []) stats(child, acc);
  return acc;
}

function main(argv) {
  if (argv.length !== 1) {
    console.error('usage: requirements_to_json.cjs <bundle-dir>');
    return 2;
  }
  const dir = path.resolve(argv[0]);
  const source = path.join(dir, 'requirements.yaml');
  const target = path.join(dir, 'requirements.json');
  const tree = loadYaml().load(fs.readFileSync(source, 'utf8'));
  fs.writeFileSync(target, `${JSON.stringify(tree, null, 2)}\n`, 'utf8');
  const acc = stats(tree, { nodes: 0, atomics: 0, folders: 0, scenarios: 0, steps: 0 });
  console.log(`wrote ${target}`);
  console.log(`  ${tree.id} ${tree.name}`);
  console.log(`  nodes=${acc.nodes} atomics=${acc.atomics} folders=${acc.folders} ` +
              `scenarios=${acc.scenarios} steps=${acc.steps}`);
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { stats };
