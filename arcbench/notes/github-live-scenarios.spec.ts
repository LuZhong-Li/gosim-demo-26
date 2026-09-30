// State-aware scenarios transcribed from the live (updated) task page. The
// hidden suite is not published, so these are our best local proxy: each test
// follows one requirement's Scenario 1 literally, including the interactions
// (open the menu, open the dialog) that a plain page load never exercises.
// Run against a live backend: TARGET_URL=http://127.0.0.1:3301
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const PASSWORD = 'Valid-password-123!';
const REPO = '/acme-demo/acme-docs';

async function signIn(page: Page) {
  await page.goto('/auth?mode=signin');
  await page.getByLabel('Username or email').fill('alice-dev');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
}

test('REQ-1-2 sign out: menu link, named dialog, cancel keeps the session', async ({ page }) => {
  await signIn(page);

  await page.getByRole('button', { name: 'Account menu' }).click();
  const signOutLinks = page.getByRole('link', { name: 'Sign out' });
  await expect(signOutLinks).toHaveCount(1);

  await signOutLinks.click();
  const dialog = page.getByRole('dialog', { name: 'Sign out' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Confirm sign out' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('link', { name: 'Sign out' }).click();
  await page.getByRole('dialog', { name: 'Sign out' }).getByRole('button', { name: 'Confirm sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();

  await page.goto(REPO);
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
});

test('REQ-5-4 a closed issue offers Reopen issue', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}?tab=issues&state=closed`);
  await page.getByRole('link', { name: 'Legacy welcome text' }).click();
  await expect(page.getByRole('button', { name: 'Reopen issue' })).toBeVisible();
});

test('REQ-6-6 a closed PR offers Reopen, an open PR offers Close', async ({ page }) => {
  await signIn(page);

  await page.goto(`${REPO}?tab=pulls&status=closed`);
  const closedTitle = page.getByRole('link', { name: 'Retire legacy banner' });
  if (await closedTitle.count()) {
    await closedTitle.first().click();
    await expect(page.getByRole('button', { name: 'Reopen pull request' })).toBeVisible();
  }

  await page.goto(`${REPO}?tab=pulls&pull=1`);
  await expect(page.getByRole('button', { name: 'Close pull request' })).toBeVisible();
});

test('REQ-6-2-2 compare page: comboboxes named base and compare, immediate No changes', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}/compare`);

  const base = page.getByRole('combobox', { name: 'base' });
  const compare = page.getByRole('combobox', { name: 'compare' });
  await expect(base).toBeVisible();
  await expect(compare).toBeVisible();

  await base.selectOption('main');
  await compare.selectOption('main');
  await expect(page.getByText('No changes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create pull request' })).toBeDisabled();
});

test('REQ-2-2-1 teams page exposes the New team link and its form fields', async ({ page }) => {
  await signIn(page);
  await page.goto('/orgs/acme-demo');
  await page.getByRole('link', { name: 'New team' }).first().click();
  await expect(page.getByLabel('Team name')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create team' })).toBeVisible();
});

test('REQ-3-4 repository settings expose General and the visibility action', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}/settings`);
  await expect(page.getByRole('link', { name: 'General' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change visibility' })).toBeVisible();
});

test('REQ-6-4 reviewer picker reveals an option as the administrator types', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}?tab=pulls&pull=1`);
  await page.getByRole('button', { name: 'Reviewers' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill('bob-reviewer');
  await expect(
    page.getByRole('listbox', { name: 'Reviewers' }).getByRole('option', { name: 'bob-reviewer' }),
  ).toBeVisible();
});
