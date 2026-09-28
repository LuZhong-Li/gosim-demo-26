import { expect, test } from '@playwright/test';

const base = 'http://127.0.0.1:3003/';

type Page = import('@playwright/test').Page;

function cell(page: Page, ref: string) {
  return page.getByRole('gridcell', { name: `Cell ${ref}`, exact: true });
}

function cellBox(page: Page, ref: string) {
  return page.getByRole('textbox', { name: `Cell ${ref}`, exact: true });
}

function unique(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function newWorkbook(page: Page, name: string) {
  await page.goto(base);
  await page.getByLabel('Workbook name').fill(name);
  await page.getByRole('button', { name: /create workbook/i }).click();
  await expect(page.getByText(name)).toBeVisible();
}

async function typeCells(page: Page, cells: Record<string, string>) {
  for (const [ref, value] of Object.entries(cells)) {
    const input = cellBox(page, ref);
    await input.fill(value);
    await input.press('Enter');
  }
}

async function selectRange(page: Page, startRef: string, endRef: string) {
  await cell(page, startRef).hover();
  await page.mouse.down();
  await cell(page, endRef).hover();
  await page.mouse.up();
}

async function createPivotSheet(page: Page, range: string) {
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Create pivot table', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create pivot table', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`Source range: ${range}`, { exact: true })).toBeVisible();
  await expect(dialog.getByRole('radio', { name: 'New worksheet', exact: true })).toBeChecked();
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pivot1', exact: true })).toBeVisible();
}

test('REQ-5-3-1 summarize sales by region', async ({ page }) => {
  await newWorkbook(page, unique('Pivot'));
  await typeCells(page, {
    A1: 'Region', B1: 'Sales',
    A2: 'East', B2: '1200',
    A3: 'North', B3: '800',
    A4: 'East', B4: '600',
    A5: 'South', B5: '1000',
    A6: 'North', B6: '700',
  });

  await selectRange(page, 'A1', 'B6');
  await createPivotSheet(page, 'A1:B6');

  const editor = page.getByRole('region', { name: 'Pivot table editor', exact: true });
  await expect(editor).toBeVisible();
  await editor.getByRole('combobox', { name: 'Rows', exact: true }).selectOption({ label: 'Region' });
  await editor.getByRole('combobox', { name: 'Values', exact: true }).selectOption({ label: 'Sales' });
  await editor.getByRole('combobox', { name: 'Summarize by', exact: true }).selectOption({ label: 'SUM' });
  await editor.getByRole('button', { name: 'Apply', exact: true }).click();

  await expect(cellBox(page, 'A1')).toHaveValue('Region');
  await expect(cellBox(page, 'B1')).toHaveValue('SUM of Sales');
  await expect(cellBox(page, 'A2')).toHaveValue('East');
  await expect(cellBox(page, 'B2')).toHaveValue('1800');
  await expect(cellBox(page, 'A3')).toHaveValue('North');
  await expect(cellBox(page, 'B3')).toHaveValue('1500');
  await expect(cellBox(page, 'A4')).toHaveValue('South');
  await expect(cellBox(page, 'B4')).toHaveValue('1000');
  await expect(cellBox(page, 'A5')).toHaveValue('Grand Total');
  await expect(cellBox(page, 'B5')).toHaveValue('4300');

  await page.getByRole('button', { name: 'Sheet1', exact: true }).click();
  await expect(cellBox(page, 'B2')).toHaveValue('1200');

  await page.reload();
  await page.getByRole('button', { name: 'Pivot1', exact: true }).click();
  await expect(cellBox(page, 'B2')).toHaveValue('1800');
  await expect(cellBox(page, 'B5')).toHaveValue('4300');
});

test('REQ-5-3-1 refresh a pivot table after source data changes', async ({ page }) => {
  await newWorkbook(page, unique('PivotRefresh'));
  await typeCells(page, {
    A1: 'Region', B1: 'Sales',
    A2: 'East', B2: '1200',
    A3: 'North', B3: '800',
    A4: 'East', B4: '600',
    A5: 'South', B5: '1000',
    A6: 'North', B6: '700',
  });

  await selectRange(page, 'A1', 'B6');
  await createPivotSheet(page, 'A1:B6');
  const editor = page.getByRole('region', { name: 'Pivot table editor', exact: true });
  await editor.getByRole('combobox', { name: 'Rows', exact: true }).selectOption({ label: 'Region' });
  await editor.getByRole('combobox', { name: 'Values', exact: true }).selectOption({ label: 'Sales' });
  await editor.getByRole('combobox', { name: 'Summarize by', exact: true }).selectOption({ label: 'SUM' });
  await editor.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(cellBox(page, 'B2')).toHaveValue('1800');

  await page.getByRole('button', { name: 'Sheet1', exact: true }).click();
  const b2 = cellBox(page, 'B2');
  await b2.fill('1500');
  await b2.press('Enter');

  await page.getByRole('button', { name: 'Pivot1', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh pivot table', exact: true }).click();
  await expect(cellBox(page, 'B2')).toHaveValue('2100');
  await expect(cellBox(page, 'B5')).toHaveValue('4600');
});

test('REQ-5-3-1 deleting a source field keeps the last pivot result', async ({ page }) => {
  await newWorkbook(page, unique('PivotMissing'));
  await typeCells(page, {
    A1: 'Region', B1: 'Sales',
    A2: 'East', B2: '400',
    A3: 'North', B3: '200',
  });

  await selectRange(page, 'A1', 'B3');
  await createPivotSheet(page, 'A1:B3');
  const editor = page.getByRole('region', { name: 'Pivot table editor', exact: true });
  await editor.getByRole('combobox', { name: 'Rows', exact: true }).selectOption({ label: 'Region' });
  await editor.getByRole('combobox', { name: 'Values', exact: true }).selectOption({ label: 'Sales' });
  await editor.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(cellBox(page, 'B2')).toHaveValue('400');

  await page.getByRole('button', { name: 'Sheet1', exact: true }).click();
  await cell(page, 'B1').click();
  await page.getByRole('button', { name: 'Delete column', exact: true }).click();

  await page.getByRole('button', { name: 'Pivot1', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh pivot table', exact: true }).click();
  await expect(page.getByText('Pivot field no longer exists; please select the field again')).toBeVisible();
  await expect(cellBox(page, 'B2')).toHaveValue('400');
});
