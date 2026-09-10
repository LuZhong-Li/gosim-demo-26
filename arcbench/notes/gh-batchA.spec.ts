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

  // REQ-1-2: cancelling keeps the session, confirming ends only this session
  await page.getByRole('button', { name: /^sign out$/i }).click();
  await page.getByRole('button', { name: /^cancel$/i }).click();
  await expect(page.getByText(user, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^sign out$/i }).click();
  await page.getByRole('button', { name: /confirm sign out/i }).click();
  await signIn(page, user, newPassword);
});

test('REQ-5-2-3/5-3-1 issue reactions toggle and multiple assignees', async ({ page }) => {
  const user = unique('rx');
  const org = unique('rxorg');
  await register(page, user);
  await signIn(page, user);
  await createOrgRepo(page, org, 'notes');

  await page.getByRole('button', { name: /^issues \(\d+\)$/i }).click();
  await page.getByLabel('Title').fill('Reaction target');
  await page.getByLabel('Assignees (comma separated)').fill('alice, bob');
  await page.getByRole('button', { name: /create issue/i }).click();
  await expect(page.getByText('Issue created.')).toBeVisible();

  await page.getByRole('button', { name: /#1 reaction target/i }).click();
  await expect(page.getByText(/assignees: alice, bob/i)).toBeVisible();
  await page.getByLabel('Comment body').fill('First comment');
  await page.getByRole('button', { name: /^comment$/i }).click();
  await expect(page.getByText('First comment')).toBeVisible();

  const issueReaction = page.getByRole('button', { name: /^👍 0$/ });
  await issueReaction.first().click();
  await expect(page.getByRole('button', { name: /^👍 1$/ })).toBeVisible();
  await expect(page.getByText('Reaction updated.')).toBeVisible();

  // toggling the same reaction again removes it
  await page.getByRole('button', { name: /^👍 1$/ }).first().click();
  await expect(page.getByRole('button', { name: /^👍 0$/ }).first()).toBeVisible();
});

test('REQ-2-2-2 change a team parent and reject hierarchy cycles', async ({ page }) => {
  const user = unique('tm');
  const org = unique('tmorg');
  await register(page, user);
  await signIn(page, user);

  await page.getByRole('link', { name: 'Your organizations', exact: true }).click();
  await page.getByLabel('Organization name').fill(org);
  await page.getByRole('button', { name: /create organization/i }).click();
  await page.getByRole('link', { name: new RegExp(`^${org} \\(${org}\\)$`, 'i') }).click();

  for (const team of ['alpha', 'beta']) {
    await page.getByLabel('Team name').fill(team);
    await page.getByRole('button', { name: /^create team$/i }).click();
  }

  const betaRow = page.locator('li[data-team="beta"]');
  await betaRow.getByLabel('Parent team for beta').fill('alpha');
  await betaRow.getByRole('button', { name: /save parent/i }).click();
  await expect(page.getByText('Team hierarchy updated.')).toBeVisible();
  await expect(page.getByText(/parent: alpha/i)).toBeVisible();

  const alphaRow = page.locator('li[data-team="alpha"]');
  await alphaRow.getByLabel('Parent team for alpha').fill('beta');
  await alphaRow.getByRole('button', { name: /save parent/i }).click();
  await expect(page.getByText(/cycle in the team hierarchy/i)).toBeVisible();
});

test('REQ-3-2-1 create a repository in the personal namespace', async ({ page }) => {
  const user = unique('psn');
  await register(page, user);
  await signIn(page, user);

  await page.getByLabel('Personal repository name').fill('personal-app');
  await page.getByLabel('Personal repository visibility').selectOption({ label: 'Public' });
  await page.getByRole('button', { name: /^create repository$/i }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${user}/personal-app`);
  await expect(page.getByLabel('Clone URL')).toHaveValue(
    new RegExp(`${user}/personal-app\\.git$`),
  );
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

test('REQ-6-3-2 files changed and aggregate diff', async ({ page }) => {
  const user = unique('df');
  const org = unique('dforg');
  await register(page, user);
  await signIn(page, user);
  await createOrgRepo(page, org, 'docs');

  await page.getByLabel('File path').fill('docs/guide.md');
  await page.getByLabel('Commit message').fill('Add guide');
  await page.getByLabel('Content').fill('line one');
  await page.getByRole('button', { name: /^commit file$/i }).click();
  await expect(page.getByText('File created.')).toBeVisible();

  await page.getByLabel('New branch name').fill('feature');
  await page.getByRole('button', { name: /^create branch$/i }).click();
  const branchField = page.locator('#file-branch');
  if ((await branchField.evaluate((el) => el.tagName)) === 'SELECT') {
    await branchField.selectOption('feature');
  } else {
    await branchField.fill('feature');
  }

  await page.getByLabel('File path').fill('docs/guide.md');
  await page.getByLabel('Commit message').fill('Extend guide');
  await page.getByLabel('Content').fill('line one\nline two');
  await page.getByRole('button', { name: /^commit file$/i }).click();
  await expect(page.getByText('File created.')).toBeVisible();

  await page.getByRole('button', { name: /^pull requests$/i }).click();
  await page.getByLabel('Title').fill('Guide update');
  await page.getByLabel('Head branch').fill('feature');
  await page.getByRole('button', { name: /^create pull request$/i }).click();
  await expect(page.getByText('Pull request created.')).toBeVisible();

  await page.getByRole('button', { name: /#1 guide update/i }).click();
  await page.getByRole('button', { name: /files changed/i }).click();
  await expect(page.getByText(/Files changed \(1\)/i)).toBeVisible();
  await expect(page.getByText(/\+1 \/ -0/)).toBeVisible();
  await expect(page.getByLabel('Diff for docs/guide.md')).toContainText('+line two');
});

test('REQ-6-3-3 inline review comment on a changed file', async ({ page }) => {
  const author = unique('ica');
  const reviewer = unique('icr');
  const org = unique('icorg');

  await register(page, reviewer);
  await register(page, author);
  await signIn(page, author);
  await createOrgRepo(page, org, 'app');

  await page.getByLabel('File path').fill('src/main.js');
  await page.getByLabel('Commit message').fill('Add main');
  await page.getByLabel('Content').fill('const a = 1;');
  await page.getByRole('button', { name: /^commit file$/i }).click();
  await expect(page.getByText('File created.')).toBeVisible();

  await page.getByLabel('New branch name').fill('feature');
  await page.getByRole('button', { name: /^create branch$/i }).click();
  const branchField = page.locator('#file-branch');
  if ((await branchField.evaluate((el) => el.tagName)) === 'SELECT') {
    await branchField.selectOption('feature');
  } else {
    await branchField.fill('feature');
  }
  await page.getByLabel('File path').fill('src/main.js');
  await page.getByLabel('Commit message').fill('Extend main');
  await page.getByLabel('Content').fill('const a = 1;\nconst b = 2;');
  await page.getByRole('button', { name: /^commit file$/i }).click();
  await expect(page.getByText('File created.')).toBeVisible();

  await page.getByRole('button', { name: /^pull requests$/i }).click();
  await page.getByLabel('Title').fill('Add feature');
  await page.getByLabel('Head branch').fill('feature');
  await page.getByRole('button', { name: /^create pull request$/i }).click();
  await expect(page.getByText('Pull request created.')).toBeVisible();

  // give the reviewer write access through organization membership
  await page.goto(`${base}orgs/${org}`);
  await page.getByLabel('Member username').fill(reviewer);
  await page.getByRole('button', { name: /add member/i }).click();
  await expect(page.getByText('Member added.')).toBeVisible();

  await page.getByRole('button', { name: /^sign out$/i }).click();
  await page.getByRole('button', { name: /confirm sign out/i }).click();
  await signIn(page, reviewer);

  await page.goto(`${base}${org}/app`);
  await page.getByRole('button', { name: /^pull requests$/i }).click();
  await page.getByRole('button', { name: /#1 add feature/i }).click();
  await page.getByRole('button', { name: /files changed/i }).click();
  await expect(page.getByLabel('Diff for src/main.js')).toContainText('+const b = 2;');

  await page.getByLabel('Inline comment for src/main.js').fill('Looks fine');
  await page.getByRole('button', { name: /add single comment/i }).click();
  await expect(page.getByText('Review comments')).toBeVisible();
  await expect(page.getByText('Looks fine')).toBeVisible();
  await expect(page.getByText(/on src\/main\.js/)).toBeVisible();
});

test('REQ-6-4 request and remove a pull request reviewer', async ({ page }) => {
  const author = unique('rva');
  const reviewer = unique('rvr');
  const org = unique('rvorg');

  await register(page, reviewer);
  await register(page, author);
  await signIn(page, author);
  await createOrgRepo(page, org, 'app');

  await page.getByLabel('New branch name').fill('feature');
  await page.getByRole('button', { name: /^create branch$/i }).click();
  await page.getByRole('button', { name: /^pull requests$/i }).click();
  await page.getByLabel('Title').fill('Needs review');
  await page.getByLabel('Head branch').fill('feature');
  await page.getByRole('button', { name: /^create pull request$/i }).click();
  await expect(page.getByText('Pull request created.')).toBeVisible();

  // the author cannot review their own pull request
  await page.getByRole('button', { name: /#1 needs review/i }).click();
  await page.getByLabel('Reviewer username').fill(author);
  await page.getByRole('button', { name: /request reviewer/i }).click();
  await expect(page.getByText(/cannot be a reviewer/i)).toBeVisible();

  // grant the candidate write access through organization membership
  await page.goto(`${base}orgs/${org}`);
  await page.getByLabel('Member username').fill(reviewer);
  await page.getByRole('button', { name: /add member/i }).click();
  await expect(page.getByText('Member added.')).toBeVisible();

  await page.goto(`${base}${org}/app`);
  await page.getByRole('button', { name: /^pull requests$/i }).click();
  await page.getByRole('button', { name: /#1 needs review/i }).click();
  await page.getByLabel('Reviewer username').fill(reviewer);
  await page.getByRole('button', { name: /request reviewer/i }).click();
  await expect(page.getByRole('button', { name: /remove reviewer/i })).toBeVisible();

  await page.getByRole('button', { name: /remove reviewer/i }).click();
  await expect(page.getByText(/No reviewers requested/i)).toBeVisible();
});

test('REQ-4-2-2 inspect a commit diff', async ({ page }) => {
  const user = unique('cd');
  const org = unique('cdorg');
  await register(page, user);
  await signIn(page, user);
  await createOrgRepo(page, org, 'hist');

  await page.getByLabel('File path').fill('docs/notes.md');
  await page.getByLabel('Commit message').fill('Add notes');
  await page.getByLabel('Content').fill('first');
  await page.getByRole('button', { name: /^commit file$/i }).click();
  await expect(page.getByText('File created.')).toBeVisible();

  await page.getByLabel('File path').fill('docs/notes.md');
  await page.getByLabel('Commit message').fill('Extend notes');
  await page.getByLabel('Content').fill('first\nsecond');
  await page.getByRole('button', { name: /^commit file$/i }).click();
  await expect(page.getByText('File created.')).toBeVisible();

  await page.getByRole('button', { name: /load commit history/i }).click();
  await page.getByRole('button', { name: /view latest commit diff/i }).click();
  await expect(page.getByLabel('Commit diff for docs/notes.md')).toContainText('+second');
});

test('REQ-2-3 grant repository access to a member and a team', async ({ page }) => {
  const owner = unique('gao');
  const member = unique('gam');
  const org = unique('gaorg');

  await register(page, member);
  await register(page, owner);
  await signIn(page, owner);
  await createOrgRepo(page, org, 'secret', 'Private');

  await page.goto(`${base}orgs/${org}`);
  await page.getByLabel('Member username', { exact: true }).fill(member);
  await page.getByRole('button', { name: /add member/i }).click();
  await expect(page.getByText('Member added.')).toBeVisible();

  await page.getByLabel('Team name').first().fill('core');
  await page.getByRole('button', { name: /^create team$/i }).click();

  // direct grant to a person
  await page.locator('#grant-repo').fill('secret');
  await page.locator('#grant-user').fill(member);
  await page.locator('#grant-permission').selectOption('Write');
  await page.getByRole('button', { name: /grant access/i }).click();
  await expect(page.getByText('Access granted.')).toBeVisible();
  await expect(page.getByText(new RegExp(`secret · ${member} · Write`))).toBeVisible();

  // team grant replaces nothing and is listed separately
  await page.locator('#grant-repo').fill('secret');
  await page.locator('#grant-user').fill('');
  await page.locator('#grant-team').fill('core');
  await page.locator('#grant-permission').selectOption('Read');
  await page.getByRole('button', { name: /grant access/i }).click();
  await expect(page.getByText(/secret · core · Read/)).toBeVisible();
});
