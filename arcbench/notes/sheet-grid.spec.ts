import { expect, test } from '@playwright/test';

const base = 'http://127.0.0.1:3003/';

type Page = import('@playwright/test').Page;

function cell(page: Page, ref: string) {
  return page.getByRole('gridcell', { name: `Cell ${ref}`, exact: true });
}

function cellBox(page: Page, ref: string) {
  return page.getByRole('textbox', { name: `Cell ${ref}`, exact: true });
}

async function newWorkbook(page: import('@playwright/test').Page, name: string) {
  await page.goto(base);
  await page.getByLabel('Workbook name').fill(name);
  await page.getByRole('button', { name: /create workbook/i }).click();
  await expect(page.getByText(name)).toBeVisible();
}

async function typeCells(page: import('@playwright/test').Page, cells: Record<string, string>) {
  for (const [ref, value] of Object.entries(cells)) {
    const input = cellBox(page, ref);
    await input.fill(value);
    await input.press('Enter');
  }
}

function unique(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

test('REQ-3-1-3 drag selects exactly one rectangular range and persists it', async ({ page }) => {
  await newWorkbook(page, unique('Grid'));
  await typeCells(page, { A1: 'h1', B1: 'h2', A2: '1', B2: '2', A3: '3', B3: '4', C1: 'x', C2: 'y' });

  await expect(page.getByRole('grid')).toHaveAttribute('aria-multiselectable', 'true');

  const a1 = cell(page, 'A1');
  const a2 = cell(page, 'A2');
  const b3 = cell(page, 'B3');
  const c1 = cell(page, 'C1');

  await a1.hover();
  await page.mouse.down();
  await b3.hover();
  await page.mouse.up();

  for (const cell of [a1, a2, b3]) {
    await expect(cell).toHaveAttribute('aria-selected', 'true');
  }
  await expect(c1).toHaveAttribute('aria-selected', 'false');

  await page.reload();
  await expect(cell(page, 'A1')).toHaveAttribute('aria-selected', 'true');
  await expect(cell(page, 'B3')).toHaveAttribute('aria-selected', 'true');
  await expect(cell(page, 'C1')).toHaveAttribute('aria-selected', 'false');

  await cell(page, 'C1').click();
  await expect(cell(page, 'C1')).toHaveAttribute('aria-selected', 'true');
  await expect(cell(page, 'A1')).toHaveAttribute('aria-selected', 'false');

  await page.reload();
  await expect(cell(page, 'C1')).toHaveAttribute('aria-selected', 'true');
  await expect(cell(page, 'A1')).toHaveAttribute('aria-selected', 'false');
});

test('REQ-3-1-3 a second worksheet keeps its own selection', async ({ page }) => {
  await newWorkbook(page, unique('GridSheets'));
  await typeCells(page, { A1: 'a', B1: 'b', A2: 'c' });

  const a1 = cell(page, 'A1');
  const b2 = cell(page, 'B2');
  await a1.hover();
  await page.mouse.down();
  await b2.hover();
  await page.mouse.up();
  await expect(a1).toHaveAttribute('aria-selected', 'true');
  await expect(b2).toHaveAttribute('aria-selected', 'true');

  await page.getByLabel('New worksheet name').fill('Other');
  await page.getByRole('button', { name: /add worksheet/i }).click();
  await page.getByRole('button', { name: 'Other', exact: true }).click();
  await cell(page, 'D4').click();
  await expect(cell(page, 'D4')).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', { name: 'Sheet1', exact: true }).click();
  await expect(cell(page, 'A1')).toHaveAttribute('aria-selected', 'true');
  await expect(cell(page, 'B2')).toHaveAttribute('aria-selected', 'true');
  await expect(cell(page, 'D4')).toHaveAttribute('aria-selected', 'false');
});

test('REQ-3-1-1 double-click editor cancels with Escape', async ({ page }) => {
  await newWorkbook(page, unique('Inline'));
  await typeCells(page, { A1: 'Saved value' });

  await cell(page, 'A1').dblclick();
  const editor = page.getByLabel('Edit A1', { exact: true });
  await expect(editor).toBeVisible();
  await editor.fill('Unsaved value');
  await editor.press('Escape');

  await expect(page.getByLabel('Edit A1', { exact: true })).toHaveCount(0);
  await expect(cellBox(page, 'A1')).toHaveValue('Saved value');
  await page.reload();
  await expect(cellBox(page, 'A1')).toHaveValue('Saved value');
});
