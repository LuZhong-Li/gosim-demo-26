import { expect, test } from '@playwright/test';

const password = 'Valid-password-123!';
const newPassword = 'New-password-456!';
const base = 'http://127.0.0.1:3002/';

async function register(page: import('@playwright/test').Page, username: string) {
  await page.goto(base);
  await page.getByRole('link', { name: /create an account/i }).click();
  await page.getByLabel(/^username$/i).fill(username);
  await page.getByLabel(/^email$/i).fill(`${username}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: /terms/i }).check();
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByText('Account created. Please sign in.')).toBeVisible();
}

async function signIn(page: import('@playwright/test').Page, username: string, secret = password) {
  await page.goto(base);
  await page.getByRole('link', { name: /sign in/i }).first().click();
  await page.getByLabel('Username or email', { exact: false }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(secret);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page.getByText(username, { exact: true })).toBeVisible();
}

async function createOrgRepo(
  page: import('@playwright/test').Page,
  org: string,
  repo: string,
  visibility: 'Public' | 'Private' = 'Public',
) {
  await page.getByRole('link', { name: 'Your organizations', exact: true }).click();
  await page.getByLabel('Organization name').fill(org);
  await page.getByRole('button', { name: /create organization/i }).click();
  await page.getByRole('link', { name: new RegExp(`^${org} \\(${org}\\)$`, 'i') }).click();
  await page.getByLabel('Repository name').fill(repo);
  await page.getByLabel('Visibility').selectOption({ label: visibility });
  await page.getByRole('button', { name: /create repository/i }).click();
  await page.getByRole('link', { name: new RegExp(`^${org}/${repo}$`, 'i') }).click();
}

function unique(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

test('REQ-1-3 change account password from settings', async ({ page }) => {
  const user = unique('pw');
  await register(page, user);
  await signIn(page, user);

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: /password and authentication/i })).toBeVisible();

  await page.getByLabel('Current password').fill('Wrong-password-123!');
  await page.getByLabel('New password').fill(newPassword);
  await page.getByLabel('Confirm password').fill(newPassword);
  await page.getByRole('button', { name: /update password/i }).click();
  await expect(page.getByText(/current password is incorrect/i)).toBeVisible();

  await page.getByLabel('Current password').fill(password);
  await page.getByLabel('New password').fill(newPassword);
  await page.getByLabel('Confirm password').fill(newPassword);
  await page.getByRole('button', { name: /update password/i }).click();
  await expect(page.getByText('Password updated.')).toBeVisible();

  await page.getByRole('link', { name: /sign out/i }).click();
  await signIn(page, user, newPassword);
});

test('REQ-2-2-4 remove an organization member from People', async ({ page }) => {
  const owner = unique('rmo');
  const member = unique('rmm');
  const org = unique('rmorg');

  await register(page, member);
  await register(page, owner);
  await signIn(page, owner);

  await page.getByRole('link', { name: 'Your organizations', exact: true }).click();
  await page.getByLabel('Organization name').fill(org);
  await page.getByRole('button', { name: /create organization/i }).click();
  await page.getByRole('link', { name: new RegExp(`^${org} \\(${org}\\)$`, 'i') }).click();

  await page.getByLabel('Member username').fill(member);
  await page.getByRole('button', { name: /add member/i }).click();
  await expect(page.getByText('Member added.')).toBeVisible();
  // People rows render as "<username> · <role>"
  await expect(page.getByText(new RegExp(`${member} · `, 'i'))).toBeVisible();

  const memberRow = page.getByRole('listitem').filter({ hasText: member });
  await memberRow.getByRole('button', { name: /remove from organization/i }).click();
  await memberRow.getByRole('button', { name: /^remove$/i }).click();
  await expect(page.getByText('Member removed.')).toBeVisible();
  await expect(page.getByText(new RegExp(`${member} · `, 'i'))).toHaveCount(0);
});

test('REQ-3-2-2/3 fork a repository and show its clone url', async ({ page }) => {
  const user = unique('fk');
  const org = unique('fkorg');

  await register(page, user);
  await signIn(page, user);
  await createOrgRepo(page, org, 'seed');

  const clone = page.getByLabel('Clone URL');
  await expect(clone).toBeVisible();
  await expect(clone).toHaveValue(new RegExp(`${org}/seed\\.git$`));

  await page.getByRole('button', { name: /^fork$/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${user}/seed`);
  await expect(page.getByText(new RegExp(`fork of ${org}/seed`, 'i'))).toHaveCount(0);
});

test('REQ-6-2-4 create a draft pull request and mark it ready', async ({ page }) => {
  const user = unique('dr');
  const org = unique('drorg');

  await register(page, user);
  await signIn(page, user);
  await createOrgRepo(page, org, 'app');

  await page.getByLabel('New branch name').fill('feature');
  await page.getByRole('button', { name: /^create branch$/i }).click();
  await expect(page.getByText('Branch created.')).toBeVisible();

  await page.getByRole('button', { name: /^pull requests$/i }).click();
  await page.getByLabel('Title').fill('Draft work');
  await page.getByLabel('Head branch').fill('feature');
  await page.getByRole('button', { name: /create draft pull request/i }).click();
  await expect(page.getByText('Draft pull request created.')).toBeVisible();
  await expect(page.getByText(/· draft · feature → main/i)).toBeVisible();

  await page.getByRole('button', { name: /#1 draft work/i }).click();
  await expect(page.getByText(/draft · feature → main ·/i)).toBeVisible();
  await page.getByRole('button', { name: /ready for review/i }).click();
  await expect(page.getByText('Draft marked ready for review.')).toBeVisible();
  await expect(page.getByText(/open · feature → main ·/i).first()).toBeVisible();
});
