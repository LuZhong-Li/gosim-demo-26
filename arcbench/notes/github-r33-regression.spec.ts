// Browser regression for the third-round fixes (activity timeline, issue
// metadata editors, private repository guard, PR conversation, commit links).
// Run against a live backend: TARGET_URL=http://127.0.0.1:3301
import { expect, test } from '@playwright/test';

const PASSWORD = 'Valid-password-123!';
const REPO = '/acme-demo/acme-docs';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/auth?mode=signin');
  await page.getByLabel('Username or email').fill('alice-dev');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
}

test('a signed-in owner can browse the seeded organization and repository', async ({ page }) => {
  await signIn(page);

  await page.goto('/orgs');
  await expect(page.getByText(/Acme Demo|acme-demo/).first()).toBeVisible();

  await page.goto('/orgs/acme-demo');
  await expect(page.getByText('acme-docs').first()).toBeVisible();

  await page.goto(REPO);
  await expect(page.getByRole('heading', { name: /acme-demo\/acme-docs/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Code' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Issues' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pull requests' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' }).first()).toBeVisible();
});

test('issue metadata editors record their activity in the timeline', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}?tab=issues&issue=1`);

  await expect(page.getByRole('heading', { name: 'Improve onboarding' })).toBeVisible();

  // REQ-5-3-2: the label selector is driven by the repository catalog.
  await page.getByRole('button', { name: 'Labels' }).click();
  const documentation = page.getByRole('checkbox', { name: 'documentation' });
  // The spec stays repeatable against a long-lived server: make sure the label
  // starts applied, then remove it.
  if (!(await documentation.isChecked())) {
    await documentation.check();
    await expect(page.getByText('Added the documentation label').first()).toBeVisible();
  }
  await documentation.uncheck();

  await expect(page.getByText('Removed the documentation label').first()).toBeVisible();
  await expect(documentation).not.toBeChecked();

  // REQ-5-3-1: the assignee selector lists triage-or-higher accounts.
  await page.getByRole('button', { name: 'Assignees' }).click();
  await expect(page.getByRole('checkbox', { name: 'bob-reviewer' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'carol-reader' })).toHaveCount(0);

  // REQ-5-2-3: a comment is appended to the discussion and the timeline.
  await page.getByLabel('Comment').fill('Browser regression comment');
  await page.getByRole('button', { name: 'Comment' }).click();
  await expect(page.getByText('Browser regression comment').first()).toBeVisible();
  await expect(page.getByText('Commented').first()).toBeVisible();

  // The timeline survives a full reload.
  await page.reload();
  await expect(page.getByText('Removed the documentation label').first()).toBeVisible();
});

test('pull request conversation, changed files and commit links work', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}?tab=pulls&pull=1`);

  await expect(page.getByRole('link', { name: 'Conversation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Commits' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Files changed' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Improve onboarding' })).toBeVisible();

  // REQ-6-3-1: an ordinary conversation comment is accepted.
  await page.getByLabel('Comment').fill('Conversation note from the regression');
  await page.getByRole('button', { name: 'Comment' }).click();
  await expect(page.getByText('Conversation note from the regression').first()).toBeVisible();

  // REQ-6-3-2: the aggregate diff renders changed files and the additions text.
  await page.getByRole('link', { name: 'Files changed' }).click();
  await expect(page.getByText(/additions, .* deletions/).first()).toBeVisible();
  await expect(page.getByText(/src\/search\.ts/).first()).toBeVisible();

  // REQ-4-2-1 / 4-2-2: the history lists short hashes that open a diff.
  await page.goto(`${REPO}?tab=code`);
  await page.getByRole('link', { name: 'Commits' }).click();
  // Commit ids are `c` + base36, so the short hash is letter/digit mixed.
  const shortHash = page.getByRole('link', { name: /^[0-9a-z]{7}$/ }).first();
  await expect(shortHash).toBeVisible();
  await shortHash.click();
  // The diff block is labelled per changed file.
  await expect(page.getByLabel(/Commit diff for /).first()).toBeVisible();
  await expect(page.getByText(/Draft onboarding changes/).first()).toBeVisible();
});

test('a private repository is refused for a visitor', async ({ page }) => {
  await page.goto('/acme-demo/acme-private');
  await expect(page.getByText('Access denied')).toBeVisible();
});
