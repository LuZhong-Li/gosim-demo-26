import { expect, test } from '@playwright/test';

test('Sheets clone smoke: edit cells, formula, worksheet, import', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await page.goto('http://127.0.0.1:3003/');
  await page.getByLabel('Workbook name').fill(`Book ${suffix}`);
  await page.getByRole('button', { name: /create workbook/i }).click();
  await expect(page.getByText(`Book ${suffix}`)).toBeVisible();

  await page.getByRole('textbox', { name: 'Cell A1', exact: true }).fill('2');
  await page.getByRole('textbox', { name: 'Cell A1', exact: true }).press('Enter');
  await page.getByRole('textbox', { name: 'Cell A2', exact: true }).fill('3');
  await page.getByRole('textbox', { name: 'Cell A2', exact: true }).press('Enter');
  await page.getByRole('textbox', { name: 'Cell A3', exact: true }).fill('=SUM(A1:A2)');
  await page.getByRole('textbox', { name: 'Cell A3', exact: true }).press('Enter');
  await page.getByRole('textbox', { name: 'Cell B5', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Cell A3', exact: true })).toHaveValue('5');

  await page.getByLabel('New worksheet name').fill('Extra');
  await page.getByRole('button', { name: /add worksheet/i }).click();
  await expect(page.getByRole('button', { name: 'Extra' })).toBeVisible();
  await page.getByRole('button', { name: 'Extra' }).click();

  await page.getByLabel('CSV import').fill('7\n8');
  await page.getByRole('button', { name: /import into extra/i }).click();
  await expect(page.getByRole('textbox', { name: 'Cell A1', exact: true })).toHaveValue('7');
  await expect(page.getByRole('textbox', { name: 'Cell A2', exact: true })).toHaveValue('8');

  await page.getByRole('textbox', { name: 'Cell A1', exact: true }).fill('9');
  await page.getByRole('textbox', { name: 'Cell A1', exact: true }).press('Enter');
  await page.getByRole('button', { name: /^undo$/i }).click();
  await expect(page.getByRole('textbox', { name: 'Cell A1', exact: true })).toHaveValue('7');
});

test('Sheets clone smoke: relative copy, validation, filter, pivot', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await page.goto('http://127.0.0.1:3003/');
  await page.getByLabel('Workbook name').fill(`Adv ${suffix}`);
  await page.getByRole('button', { name: /create workbook/i }).click();

  // relative reference copy: B1=A1*2 copied to B2 becomes =A2*2
  await page.getByRole('textbox', { name: 'Cell A1', exact: true }).fill('1');
  await page.getByRole('textbox', { name: 'Cell A1', exact: true }).press('Enter');
  await page.getByRole('textbox', { name: 'Cell A2', exact: true }).fill('2');
  await page.getByRole('textbox', { name: 'Cell A2', exact: true }).press('Enter');
  await page.getByRole('textbox', { name: 'Cell B1', exact: true }).fill('=A1*2');
  await page.getByRole('textbox', { name: 'Cell B1', exact: true }).press('Enter');
  await page.getByRole('button', { name: /^copy$/i }).click();
  await page.getByRole('textbox', { name: 'Cell B2', exact: true }).click();
  await page.getByRole('button', { name: /^paste$/i }).click();
  await page.getByRole('textbox', { name: 'Cell C6', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Cell B2', exact: true })).toHaveValue('4');

  // validation list on D1
  await page.getByRole('textbox', { name: 'Cell D1', exact: true }).click();
  await page.getByLabel('List validation values').fill('open,closed');
  await page.getByRole('button', { name: /apply list validation/i }).click();
  await expect(page.getByRole('combobox', { name: 'Cell D1', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Cell D1', exact: true }).selectOption('closed');
  await expect(page.getByRole('combobox', { name: 'Cell D1', exact: true })).toHaveValue('closed');

  // pivot source data
  const data: Array<[string, string]> = [
    ['A1', 'Region'],
    ['B1', 'Channel'],
    ['C1', 'Amount'],
    ['A2', 'East'],
    ['B2', 'Online'],
    ['C2', '10'],
    ['A3', 'East'],
    ['B3', 'Store'],
    ['C3', '5'],
    ['A4', 'West'],
    ['B4', 'Online'],
    ['C4', '7'],
  ];
  for (const [ref, value] of data) {
    await page.getByRole('textbox', { name: `Cell ${ref}`, exact: true }).fill(value);
    await page.getByRole('textbox', { name: `Cell ${ref}`, exact: true }).press('Enter');
  }

  // filter view: only East rows remain visible
  await page.getByLabel('Filter column').fill('A');
  await page.getByLabel('Filter value').fill('East');
  await page.getByRole('button', { name: /apply filter/i }).click();
  await expect(page.getByRole('textbox', { name: 'Cell A2', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Cell A4', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /clear filter/i }).click();

  // pivot table: select A1:C4, then create through the Data menu (REQ-5-3-1)
  await page.getByRole('gridcell', { name: 'Cell A1', exact: true }).hover();
  await page.mouse.down();
  await page.getByRole('gridcell', { name: 'Cell C4', exact: true }).hover();
  await page.mouse.up();
  await page.getByRole('button', { name: 'Create pivot table', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create pivot table', exact: true });
  await expect(dialog.getByText('Source range: A1:C4', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();

  const editor = page.getByRole('region', { name: 'Pivot table editor', exact: true });
  await editor.getByRole('combobox', { name: 'Rows', exact: true }).selectOption({ label: 'Region' });
  await editor.getByRole('combobox', { name: 'Columns', exact: true }).selectOption({ label: 'Channel' });
  await editor.getByRole('combobox', { name: 'Values', exact: true }).selectOption({ label: 'Amount' });
  await editor.getByRole('button', { name: 'Apply', exact: true }).click();

  await expect(page.getByRole('textbox', { name: 'Cell B1', exact: true })).toHaveValue('Online');
  await expect(page.getByRole('textbox', { name: 'Cell B2', exact: true })).toHaveValue('10');
  await expect(page.getByRole('textbox', { name: 'Cell C2', exact: true })).toHaveValue('5');
  await expect(page.getByRole('textbox', { name: 'Cell A4', exact: true })).toHaveValue('Grand Total');
});

