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

test('REQ-1-1-1 registration inventory and the itemised errors at once', async ({ page }) => {
  await page.goto('/auth?mode=signup');

  // The form contains exactly one of each required control.
  await expect(page.getByRole('textbox', { name: 'Username', exact: true })).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Confirm password', exact: true })).toHaveCount(1);
  const terms = page.getByRole('checkbox', { name: 'Agree to the terms' });
  await expect(terms).toHaveCount(1);
  await expect(terms).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();

  // Several invalid fields together must produce every message at once.
  await page.getByLabel('Username', { exact: true }).fill('-bad-name');
  await page.getByLabel('Email', { exact: true }).fill('not-an-email');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Confirm password', { exact: true }).fill('different');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Username format is invalid')).toBeVisible();
  await expect(page.getByText('Email format is invalid')).toBeVisible();
  await expect(page.getByText('Password requirements are not satisfied')).toBeVisible();
  await expect(page.getByText('Agree to terms is required')).toBeVisible();
  // Non-sensitive input is retained.
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('-bad-name');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('not-an-email');
});

test('REQ-1-1-1 a duplicate username is reported and both values are kept', async ({ page }) => {
  await page.goto('/auth?mode=signup');
  await page.getByLabel('Username', { exact: true }).fill('alice-dev');
  await page.getByLabel('Email', { exact: true }).fill(`unused-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Valid-password-123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('Valid-password-123!');
  await page.getByRole('checkbox', { name: 'Agree to the terms' }).check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Username already exists')).toBeVisible();
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('alice-dev');
});

test('REQ-1-1-3 recovery shows the fixed code and updates the password', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `pw-user-${suffix}`;
  const email = `${username}@example.test`;
  const original = 'Valid-password-123!';
  const replacement = 'Replacement-password-456!';

  // A fresh account so the reset does not disturb the seeded credentials.
  await page.goto('/auth?mode=signup');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(original);
  await page.getByLabel('Confirm password', { exact: true }).fill(original);
  await page.getByRole('checkbox', { name: 'Agree to the terms' }).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  await page.goto('/auth?mode=forgot');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();

  // The fixed code is a distinct visible value, not embedded in a sentence.
  await expect(page.getByText('123456', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('Verification code', { exact: true })).toBeVisible();
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Confirm password', { exact: true })).toBeVisible();

  // A wrong code explains the reason and changes nothing.
  await page.getByLabel('Verification code', { exact: true }).fill('000000');
  await page.getByLabel('New password', { exact: true }).fill(replacement);
  await page.getByLabel('Confirm password', { exact: true }).fill(replacement);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Verification code is invalid')).toBeVisible();

  // The correct code updates the password.
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByLabel('New password', { exact: true }).fill(replacement);
  await page.getByLabel('Confirm password', { exact: true }).fill(replacement);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Password updated')).toBeVisible();

  // The new password works and the old one no longer does.
  await page.goto('/auth?mode=signin');
  await page.getByLabel('Username or email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(original);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill(replacement);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
});

async function registerThrowaway(page: Page) {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const username = `pw-user-${suffix}`;
  const email = `${username}@example.test`;
  const password = 'Valid-password-123!';
  await page.goto('/auth?mode=signup');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: 'Agree to the terms' }).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Username or email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
  return { username, email, password };
}

test('REQ-1-3 change password reports each field reason and applies the new one', async ({ page }) => {
  const account = await registerThrowaway(page);
  const next = 'New-password-456!';

  await page.goto('/settings');
  await expect(page.getByText('Password and authentication').first()).toBeVisible();
  await expect(page.getByLabel('Current password', { exact: true })).toBeVisible();
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Confirm password', { exact: true })).toBeVisible();

  // Empty current password.
  await page.getByLabel('New password', { exact: true }).fill(next);
  await page.getByLabel('Confirm password', { exact: true }).fill(next);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText('Current password is required')).toBeVisible();

  // Wrong current password.
  await page.getByLabel('Current password', { exact: true }).fill('Wrong-password-123!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText('Current password is incorrect')).toBeVisible();

  // Mismatched confirmation.
  await page.getByLabel('Current password', { exact: true }).fill(account.password);
  await page.getByLabel('Confirm password', { exact: true }).fill('does-not-match');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText('Password confirmation does not match')).toBeVisible();

  // The old password still works after the failures, the candidate does not.
  await page.goto('/auth?mode=signin');
  await page.getByLabel('Username or email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(next);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();

  // A compliant change is applied.
  await page.goto('/settings');
  await page.getByLabel('Current password', { exact: true }).fill(account.password);
  await page.getByLabel('New password', { exact: true }).fill(next);
  await page.getByLabel('Confirm password', { exact: true }).fill(next);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText('Password updated')).toBeVisible();

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('link', { name: 'Sign out' }).click();
  await page.getByRole('dialog', { name: 'Sign out' }).getByRole('button', { name: 'Confirm sign out' }).click();

  await page.goto('/auth?mode=signin');
  await page.getByLabel('Username or email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(next);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
});

test('REQ-2-1-2 create organization validates duplicates and formats', async ({ page }) => {
  await signIn(page);
  await page.goto('/orgs');
  await page.getByRole('link', { name: 'New organization' }).click();

  await expect(page.getByLabel('Organization name', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Display name', { exact: true })).toBeVisible();

  // A taken identifier wins even when the display name is also missing.
  await page.getByLabel('Organization name', { exact: true }).fill('acme-demo');
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page.getByText('Organization name already exists')).toBeVisible();

  // A malformed identifier keeps its own message.
  await page.getByLabel('Organization name', { exact: true }).fill('-invalid-organization');
  await page.getByLabel('Display name', { exact: true }).fill('Mobile Guild');
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page.getByText('Organization name format is invalid')).toBeVisible();

  // A unique pair creates the organization.
  const unique = `mobile-guild-${Date.now().toString(36)}`;
  await page.getByLabel('Organization name', { exact: true }).fill(unique);
  await page.getByLabel('Display name', { exact: true }).fill('Mobile Guild');
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(unique) })).toBeVisible();
});

test('REQ-2-2-2 team members and hierarchy controls', async ({ page }) => {
  await signIn(page);
  await page.goto('/orgs/acme-demo/teams/frontend-team');

  await expect(page.getByRole('link', { name: 'Members' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' }).first()).toBeVisible();

  // Add a current organization member, then remove them again.
  await page.getByRole('link', { name: 'Members' }).first().click();
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
  await page.getByLabel('Username', { exact: true }).fill('carol-reader');
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page.getByRole('button', { name: 'Remove carol-reader' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove carol-reader' }).click();
  await expect(page.getByRole('button', { name: 'Remove carol-reader' })).toHaveCount(0);

  // Settings exposes the parent-team combobox and Save.
  await page.getByRole('link', { name: 'Settings' }).first().click();
  await expect(page.getByRole('combobox', { name: 'Parent team' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' }).first()).toBeVisible();
});

test('REQ-3-2-1 create a repository with owner, visibility and README', async ({ page }) => {
  await signIn(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'New repository' }).click();

  await expect(page.getByLabel('Owner', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Repository name', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Description', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Public' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Private' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Add a README file' })).toBeVisible();

  const unique = `ui-demo-${Date.now().toString(36)}`;
  await page.getByLabel('Repository name', { exact: true }).fill(unique);
  await page.getByLabel('Description', { exact: true }).fill('Repository created by Playwright');
  await page.getByRole('radio', { name: 'Private' }).check();
  await page.getByRole('checkbox', { name: 'Add a README file' }).check();
  await page.getByRole('button', { name: 'Create repository' }).click();

  await expect(page.getByRole('heading', { name: new RegExp(unique) })).toBeVisible();
  await expect(page.getByText('Private').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'README.md' })).toBeVisible();
});

test('REQ-2-3 manage access replaces a grant instead of duplicating it', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}/settings/access`);

  await page.getByRole('button', { name: 'Add people or teams' }).click();
  const search = page.getByRole('textbox', { name: 'Search' }).first();
  await search.fill('frontend-team');
  await expect(
    page.getByRole('option', { name: /frontend-team/ }).first(),
  ).toBeVisible();
  // The picker itself offers a Role combobox and an Add button; it hides the
  // row editors while open, so reload before editing an existing grant.
  await expect(page.getByRole('combobox', { name: 'Role' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add' }).first()).toBeVisible();
  await page.reload();

  // A row for the seeded collaborator exposes a Role combobox and Save.
  const roleSelects = page.getByRole('combobox', { name: 'Role' });
  await expect(roleSelects.first()).toBeVisible();
  await roleSelects.first().selectOption('Read');
  await page.getByRole('button', { name: 'Save' }).first().click();

  await page.reload();
  await expect(page.getByText('bob-reviewer').first()).toBeVisible();
  const afterReload = page.getByRole('combobox', { name: 'Role' }).first();
  await expect(afterReload).toHaveValue('Read');
});

test('REQ-3-4 visibility change and the non-admin view', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}/settings`);
  await page.getByRole('link', { name: 'General' }).first().click();
  await expect(page.getByText('Danger Zone').first()).toBeVisible();

  await page.getByRole('button', { name: 'Change visibility' }).click();
  await page.getByRole('radio', { name: 'Private' }).check();
  await page.getByRole('button', { name: 'Confirm visibility' }).click();
  await expect(page.getByText('Private').first()).toBeVisible();

  // Back to public so the rest of the suite sees the seeded shape.
  await page.getByRole('button', { name: 'Change visibility' }).click();
  await page.getByRole('radio', { name: 'Public' }).check();
  await page.getByRole('button', { name: 'Confirm visibility' }).click();
  await expect(page.getByText('Public').first()).toBeVisible();

  // A Maintain collaborator is not a repository Admin, so the action is absent.
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('link', { name: 'Sign out' }).click();
  await page.getByRole('dialog', { name: 'Sign out' }).getByRole('button', { name: 'Confirm sign out' }).click();
  await page.goto('/auth?mode=signin');
  await page.getByLabel('Username or email').fill('bob-reviewer');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto(`${REPO}/settings`);
  await expect(page.getByRole('button', { name: 'Change visibility' })).toHaveCount(0);
});

test('REQ-4-3-3 change the default branch through Settings then Branches', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}/settings/branches`);

  const defaultBranch = page.getByRole('combobox', { name: 'Default branch' });
  await expect(defaultBranch).toBeVisible();
  await defaultBranch.selectOption('release');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.getByRole('button', { name: 'Confirm' }).first().click();

  await page.goto(REPO);
  await expect(page.getByText('Branch release').first()).toBeVisible();

  // Restore main for the rest of the suite.
  await page.goto(`${REPO}/settings/branches`);
  await page.getByRole('combobox', { name: 'Default branch' }).selectOption('main');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.getByRole('button', { name: 'Confirm' }).first().click();

  // A Maintain collaborator gets no default-branch combobox.
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('link', { name: 'Sign out' }).click();
  await page.getByRole('dialog', { name: 'Sign out' }).getByRole('button', { name: 'Confirm sign out' }).click();
  await page.goto('/auth?mode=signin');
  await page.getByLabel('Username or email').fill('bob-reviewer');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto(`${REPO}/settings/branches`);
  await expect(page.getByRole('combobox', { name: 'Default branch' })).toHaveCount(0);
});

test('REQ-5-2-1 and REQ-5-2-2 create and then edit an issue', async ({ page }) => {
  await signIn(page);
  await page.goto(`${REPO}?tab=issues`);

  await page.getByRole('link', { name: 'New issue' }).click();
  await page.getByRole('button', { name: 'Submit new issue' }).click();
  await expect(page.getByText('Title is required')).toBeVisible();

  const title = `Scenario issue ${Date.now().toString(36)}`;
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Description', { exact: true }).fill('Created by the live scenario suite.');
  await page.getByRole('button', { name: 'Submit new issue' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('Open').first()).toBeVisible();

  // Editing the title keeps the change and rejects a blank value.
  await page.getByRole('button', { name: 'Edit issue title' }).click();
  const renamed = `${title} renamed`;
  await page.getByLabel('Issue title', { exact: true }).fill(renamed);
  await page.getByRole('button', { name: 'Save issue title' }).click();
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible();

  await page.getByRole('button', { name: 'Edit issue title' }).click();
  await page.getByLabel('Issue title', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Save issue title' }).click();
  await expect(page.getByText('Title is required')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible();
});
