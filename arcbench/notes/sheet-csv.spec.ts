import { expect, test } from '@playwright/test';

const base = 'http://127.0.0.1:3003/';

function cellBox(page: import('@playwright/test').Page, ref: string) {
  return page.getByRole('textbox', { name: `Cell ${ref}`, exact: true });
}

test('REQ-1-3-1 import a valid CSV file into a new workbook', async ({ page }) => {
  await page.goto(base);
  await page.getByRole('button', { name: 'Import CSV', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import CSV', exact: true });
  await expect(dialog).toBeVisible();

  const csv = [
    '名称,数量,备注',
    '"你好,世界",12,"含""引号""文本"',
    '空,,"多行\n字段"',
    ',3,x',
  ].join('\n');
  await dialog.getByLabel('CSV file').setInputFiles({
    name: '团队数据.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });
  await dialog.getByRole('button', { name: 'Confirm import', exact: true }).click();

  await expect(page.getByRole('heading', { name: '团队数据', exact: true })).toBeVisible();
  await expect(cellBox(page, 'A1')).toHaveValue('名称');
  await expect(cellBox(page, 'B1')).toHaveValue('数量');
  await expect(cellBox(page, 'C1')).toHaveValue('备注');
  await expect(cellBox(page, 'A2')).toHaveValue('你好,世界');
  await expect(cellBox(page, 'B2')).toHaveValue('12');
  await expect(cellBox(page, 'C2')).toHaveValue('含"引号"文本');
  await expect(cellBox(page, 'A3')).toHaveValue('空');
  await expect(cellBox(page, 'B3')).toHaveValue('');
  await expect(cellBox(page, 'C3')).toHaveValue('多行\n字段');
  await expect(cellBox(page, 'A4')).toHaveValue('');
  await expect(cellBox(page, 'B4')).toHaveValue('3');

  await page.reload();
  await expect(cellBox(page, 'A2')).toHaveValue('你好,世界');
  await expect(cellBox(page, 'C3')).toHaveValue('多行\n字段');
});

test('REQ-1-3-1 reject an unparseable CSV file', async ({ page }) => {
  await page.goto(base);
  await page.getByRole('button', { name: 'Import CSV', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import CSV', exact: true });
  await dialog.getByLabel('CSV file').setInputFiles({
    name: 'bad.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('"unclosed', 'utf8'),
  });
  await dialog.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.getByText('Invalid CSV file format; import failed', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'bad', exact: true })).toHaveCount(0);
});
