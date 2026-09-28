import { expect, test, Page, Locator } from '@playwright/test';

const base = 'http://127.0.0.1:3002/';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function pattern(value: string | RegExp): RegExp {
  return value instanceof RegExp ? value : new RegExp(escapeRegExp(value).replace(/\s+/g, '\\s+'), 'i');
}
async function firstVisible(scope: Page | Locator, value: string | RegExp): Promise<Locator> {
  const p = pattern(value);
  const t = scope as any;
  const candidates = [
    t.getByRole('button', { name: p }),
    t.getByRole('link', { name: p }),
    t.getByRole('menuitem', { name: p }),
    t.getByRole('tab', { name: p }),
    t.getByRole('heading', { name: p }),
    t.getByRole('option', { name: p }),
    t.getByLabel(p),
    t.getByPlaceholder(p),
    t.getByText(p),
  ];
  for (const c of candidates) {
    try { if (await c.first().isVisible({ timeout: 300 })) return c.first(); } catch { /* next */ }
  }
  for (const c of candidates) {
    try { if (await c.first().count()) return c.first(); } catch { /* next */ }
  }
  return candidates[0].first();
}
async function click(scope: Page | Locator, value: string | RegExp) {
  await (await firstVisible(scope, value)).click();
}

test('official-style seed flows', async ({ page }) => {
  await page.goto(base);
  await expect(page.getByText(/acme\/public-repo/i).first()).toBeVisible();

  await click(page, /sign in/i);
  await page.getByLabel(/username or email/i).fill('alice');
  await page.getByLabel('Password', { exact: true }).fill('Valid-password-123!');
  await click(page, /^sign in$/i);
  await expect(page.getByText('alice', { exact: true }).first()).toBeVisible();

  await click(page, /your organizations/i);
  await expect(page.getByText(/Acme Org \(acme\)/i).first()).toBeVisible();
  await click(page, /acme/i);
  await expect(page.getByText(/public-repo/i).first()).toBeVisible();
  await expect(page.getByText(/private-repo/i).first()).toBeVisible();

  await click(page, /public-repo/i);
  await expect(page.getByText(/src\/app\.js/i).first()).toBeVisible();
  await page.goBack();

  await click(page, /private-repo/i);
  await click(page, /issues/i);
  await expect(page.getByText(/Login button does not respond/i).first()).toBeVisible();
  await expect(page.getByText(/Closed seed issue/i).first()).toBeVisible();

  await click(page, /pull requests/i);
  await expect(page.getByText(/Add login flow/i).first()).toBeVisible();
});


