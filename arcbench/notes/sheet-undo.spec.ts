import { expect, test } from '@playwright/test';

const base = 'http://127.0.0.1:3003/';

function cellBox(page: import('@playwright/test').Page, ref: string) {
  return page.getByRole('textbox', { name: `Cell ${ref}`, exact: true });
}

function unique(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function newWorkbook(page: import('@playwright/test').Page) {
  await page.goto(base);
  await page.getByLabel('Workbook name').fill(unique('Undo'));
  await page.getByRole('button', { name: /create workbook/i }).click();
  await expect(cellBox(page, 'A1')).toBeVisible();
}

test('REQ-3-2-2 undo and redo one modification with Ctrl+Z / Ctrl+Y', async ({ page }) => {
  await newWorkbook(page);
  const a1 = cellBox(page, 'A1');
  await a1.fill('2');
  await a1.press('Enter');
  await expect(a1).toHaveValue('2');

  await page.keyboard.press('Control+z');
  await expect(a1).toHaveValue('');

  await page.keyboard.press('Control+y');
  await expect(a1).toHaveValue('2');

  await page.reload();
  await expect(cellBox(page, 'A1')).toHaveValue('2');
});

test('REQ-3-2-2 a new modification clears the redo branch', async ({ page }) => {
  await newWorkbook(page);
  const a1 = cellBox(page, 'A1');
  await a1.fill('old');
  await a1.press('Enter');
  await expect(a1).toHaveValue('old');

  await page.keyboard.press('Control+z');
  await expect(a1).toHaveValue('');

  await a1.fill('new');
  await a1.press('Enter');
  await expect(a1).toHaveValue('new');

  await page.keyboard.press('Control+y');
  await expect(a1).toHaveValue('new');
});

test('REQ-3-2-2 undo and redo a row insertion', async ({ page }) => {
  await newWorkbook(page);
  const a1 = cellBox(page, 'A1');
  await a1.fill('x');
  await a1.press('Enter');
  await expect(a1).toHaveValue('x');

  await page.getByRole('button', { name: 'Insert row', exact: true }).click();
  await expect(cellBox(page, 'A1')).toHaveValue('');
  await expect(cellBox(page, 'A2')).toHaveValue('x');

  await page.keyboard.press('Control+z');
  await expect(cellBox(page, 'A1')).toHaveValue('x');
  await expect(cellBox(page, 'A2')).toHaveValue('');

  await page.keyboard.press('Control+y');
  await expect(cellBox(page, 'A1')).toHaveValue('');
  await expect(cellBox(page, 'A2')).toHaveValue('x');
});



