import { expect, test } from '@playwright/test';

const base = 'http://127.0.0.1:3003/';

type Page = import('@playwright/test').Page;

function cellBox(page: Page, ref: string) {
  return page.getByRole('textbox', { name: `Cell ${ref}`, exact: true });
}

function unique(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function typeCells(page: Page, cells: Record<string, string>) {
  for (const [ref, value] of Object.entries(cells)) {
    const input = cellBox(page, ref);
    await input.fill(value);
    await input.press('Enter');
  }
}

test('REQ-4-2-2 invalid formulas show stable error values', async ({ page }) => {
  await page.goto(base);
  await page.getByLabel('Workbook name').fill(unique('Formula'));
  await page.getByRole('button', { name: /create workbook/i }).click();
  await expect(page.getByRole('textbox', { name: 'Cell A1', exact: true })).toBeVisible();

  await typeCells(page, { A1: 'Keep' });
  await typeCells(page, {
    B1: '=1/0',
    B2: '=A0',
    B3: '=UNSUPPORTED(1)',
    B4: '=1+',
    B5: '=B5',
  });

  await expect(cellBox(page, 'B1')).toHaveValue('#DIV/0!');
  await expect(cellBox(page, 'B2')).toHaveValue('#REF!');
  await expect(cellBox(page, 'B3')).toHaveValue('#NAME?');
  await expect(cellBox(page, 'B4')).toHaveValue('#ERROR!');
  await expect(cellBox(page, 'B5')).toHaveValue('#REF!');

  await expect(cellBox(page, 'B1')).toHaveValue('#DIV/0!');
  await cellBox(page, 'B1').click();
  await expect(page.getByLabel('Formula bar')).toHaveValue('=1/0');

  await typeCells(page, { A1: 'Changed' });
  await expect(cellBox(page, 'A1')).toHaveValue('Changed');
  await page.reload();
  await expect(cellBox(page, 'B1')).toHaveValue('#DIV/0!');
  await expect(cellBox(page, 'B3')).toHaveValue('#NAME?');

  await typeCells(page, { B1: '=A1' });
  await expect(cellBox(page, 'B1')).toHaveValue('Changed');
});
