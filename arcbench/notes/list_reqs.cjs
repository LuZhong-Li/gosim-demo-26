#!/usr/bin/env node
// 用法: node arcbench/notes/list_reqs.cjs github|sheet|ticketbooking
// 输出：需求树的所有 REQ 标题（标题行 + 层级）
const fs = require('fs');
const path = require('path');

const task = process.argv[2] || 'github';
const file = path.join(__dirname, '..', 'data', 'requirements', `${task}.json`);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const md = data.requirements_markdown || '';

const heads = [...md.matchAll(/^(#{2,5}) (REQ-[\d.\-]+[^\n]*)$/gm)];
console.log(`# ${data.id} (${data.display_id}) tests=${data.total_tests} modules=${data.module_count}`);
console.log(`# headings=${heads.length}`);
for (const m of heads) {
  const level = m[1].length - 1;
  console.log(`${'  '.repeat(level)}${m[2]}`);
}

// 场景统计
const scenarios = [...md.matchAll(/^  - \*\*(GIVEN|WHEN|THEN):\*\*/gm)].length;
console.log(`# raw scenario steps matched: ${scenarios}`);
