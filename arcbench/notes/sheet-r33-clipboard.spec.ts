// Browser regression for the third-round spreadsheet fixes: working clipboard,
// external TSV paste, Undo/Redo toolbar buttons and the header context menus.
// Run against a live backend: TARGET_URL=http://127.0.0.1:3302
//
// A grid cell is a `gridcell` named by its coordinate whose value lives in an
// inner input labelled "Cell <coordinate>", so values are read with toHaveValue.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const cell = (page: Page, ref: string) => page.getByLabel(`Cell ${ref}`, { exact: true });

async function openSeededWorkbook(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Q3 Sales' }).click();
  await expect(cell(page, 'A1')).toHaveValue('Region');
}

test('copies a cell with Ctrl+C and pastes it with Ctrl+V', async ({ page }) => {
  await openSeededWorkbook(page);

  await cell(page, 'A1').click();
  await page.keyboard.press('Control+c');
  await cell(page, 'C3').click();
  await page.keyboard.press('Control+v');

  await expect(cell(page, 'C3')).toHaveValue('Region');
});

test('Undo and Redo toolbar buttons reverse and replay an edit', async ({ page }) => {
  await openSeededWorkbook(page);

  const undo = page.getByRole('button', { name: 'Undo' });
  const redo = page.getByRole('button', { name: 'Redo' });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  // A unique value keeps this spec repeatable against a long-lived server.
  const value = `undo-${Date.now()}`;
  const previous = await cell(page, 'D6').inputValue();
  await cell(page, 'D6').click();
  await page.getByLabel('Formula bar').fill(value);
  await page.getByLabel('Formula bar').press('Enter');
  await expect(cell(page, 'D6')).toHaveValue(value);

  await expect(undo).toBeEnabled();
  await undo.click();
  // Undo restores the whole pre-operation snapshot, whatever it held.
  await expect(cell(page, 'D6')).toHaveValue(previous);

  await redo.click();
  await expect(cell(page, 'D6')).toHaveValue(value);
});

test('external tab separated text lands as a rectangle from the active cell', async ({ page }) => {
  await openSeededWorkbook(page);

  await cell(page, 'B2').click();
  // A real browser paste event carrying a two dimensional payload.
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData('text/plain', 'Alpha\t\t3\nBeta\tTwo\t4');
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
  });

  await expect(cell(page, 'B2')).toHaveValue('Alpha');
  await expect(cell(page, 'C2')).toHaveValue('');
  await expect(cell(page, 'D2')).toHaveValue('3');
  await expect(cell(page, 'B3')).toHaveValue('Beta');
  await expect(cell(page, 'C3')).toHaveValue('Two');
  await expect(cell(page, 'D3')).toHaveValue('4');
});

test('row and column headers open a menuitem context menu', async ({ page }) => {
  await openSeededWorkbook(page);

  await page.getByRole('rowheader', { name: '3', exact: true }).click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Insert 1 row above' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete row' })).toBeVisible();

  await page.keyboard.press('Escape');
  await page.getByRole('columnheader', { name: 'B', exact: true }).click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Insert 1 column left' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete column' })).toBeVisible();
});
