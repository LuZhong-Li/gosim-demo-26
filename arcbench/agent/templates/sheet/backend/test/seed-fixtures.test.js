// REQ-3-1-2 / REQ-3-2-1 / REQ-4-1-1: the seed provisions the official fixtures.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');

const app = require('../src/app');

let server;
let base;

test.before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test('seed provisions the fixture workbooks with their cells and formulas', async () => {
  const list = await (await fetch(`${base}/api/workbooks`)).json();
  const names = list.workbooks.map((workbook) => workbook.name);
  assert.ok(names.includes('Q3 Sales'), 'Q3 Sales fixture workbook is provisioned');
  assert.ok(names.includes('Inventory'), 'Inventory fixture workbook is provisioned');
  assert.ok(names.includes('Formula examples'), 'Formula fixture workbook is provisioned');

  const inventory = list.workbooks.find((workbook) => workbook.name === 'Inventory');
  const inventoryDetail = await (await fetch(`${base}/api/workbooks/${inventory.id}`)).json();
  const inventorySheet = inventoryDetail.workbook.sheets[0];
  assert.equal(inventorySheet.cells.A1.value, 'Item');
  assert.equal(inventorySheet.cells.B1.value, 'Qty');
  assert.equal(inventorySheet.cells.A2.value, 'Pen');
  assert.equal(inventorySheet.cells.B2.value, 4);
  assert.equal(inventorySheet.cells.D1, undefined, 'the paste target range stays empty');
  assert.equal(inventorySheet.cells.E2, undefined, 'the paste target range stays empty');

  const formulas = list.workbooks.find((workbook) => workbook.name === 'Formula examples');
  const formulaDetail = await (await fetch(`${base}/api/workbooks/${formulas.id}`)).json();
  const formulaSheet = formulaDetail.workbook.sheets[0];
  assert.equal(formulaSheet.cells.A1.value, 2);
  assert.equal(formulaSheet.cells.B1.value, 3);
  assert.equal(formulaSheet.cells.C1.formula, '=A1+B1');
  assert.equal(formulaSheet.cells.C1.value, 5);
  assert.equal(formulaSheet.cells.D1.formula, '=C1*2');
  assert.equal(formulaSheet.cells.D1.value, 10);
});
