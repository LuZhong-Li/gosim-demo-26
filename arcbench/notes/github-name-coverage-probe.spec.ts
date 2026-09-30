// Diagnostic probe (no assertions): collect the accessible names of every
// control whose role the official helper actually tries (button, link,
// menuitem, tab, checkbox, heading, option) across the requirement-critical
// pages, then report which quoted UI names from the live task page never appear.
// Run against a live backend: TARGET_URL=http://127.0.0.1:3301
import fs from 'node:fs';
import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

const PASSWORD = 'Valid-password-123!';
const LIVE_PAGE =
  'D:/gosim-demo-26/arcbench/notes/requirements-live/github-task-page.txt';

const PAGES = [
  '/',
  '/auth?mode=signin',
  '/auth?mode=signup',
  '/orgs',
  '/orgs/acme-demo',
  '/orgs/acme-demo/teams/frontend-team',
  '/acme-demo/acme-docs?tab=code',
  '/acme-demo/acme-docs?tab=issues',
  '/acme-demo/acme-docs?tab=issues&issue=1',
  '/acme-demo/acme-docs?tab=pulls',
  '/acme-demo/acme-docs?tab=pulls&pull=1',
  '/acme-demo/acme-docs?tab=pulls&pull=1&view=commits',
  '/acme-demo/acme-docs?tab=pulls&pull=1&view=files',
  '/acme-demo/acme-docs/settings',
  '/acme-demo/acme-docs/settings/branches',
  '/acme-demo/acme-docs/settings/access',
  '/acme-demo/acme-docs/compare?base=main&head=release',
  '/acme-demo/acme-docs/search?q=search',
  '/settings',
];

// Inputs the tests type, prose fragments, or ids that are never UI names.
const NOT_A_NAME = [
  /@/,
  /^\d+$/,
  /^[-.]/,
  /^(not-an-email|does-not-match|000000|123456)$/,
  /^(pw-user|Repository created by Playwright)/,
  /(count|suffix)/,
  /^(account|session|diff|fork|clone page entry|code search|commit history|reviewer request|current branch)$/,
  /^(organization-account-role|subject-target-reaction type|PR-reviewer request)$/,
  /^(merge code changes from the compare branch into the base branch)$/,
  /(is success)$/,
  /^(Member|Owner|Read|Triage|Write|Maintain|Admin)$/,
];

function quotedNames(): string[] {
  const text = fs.readFileSync(LIVE_PAGE, 'utf8');
  const names = new Set<string>();
  for (const match of text.matchAll(/[“"]([^”"\n]{3,60})[”"]/g)) {
    const value = match[1].replace(/\s+/g, ' ').trim();
    if (value.includes('<')) continue; // dynamic template
    if (NOT_A_NAME.some((pattern) => pattern.test(value))) continue;
    names.add(value);
  }
  return Array.from(names).sort();
}

async function signIn(page: Page) {
  await page.goto('/auth?mode=signin');
  await page.getByLabel('Username or email').fill('alice-dev');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(500);
}

test('report live UI names that never appear as an accessible name', async ({ page }) => {
  await signIn(page);
  const seen = new Set<string>();

  for (const url of PAGES) {
    await page.goto(url);
    await page.waitForTimeout(600);
    const names = await page.evaluate(() => {
      const roleOf = (el: Element): string | null => {
        const explicit = el.getAttribute('role');
        if (explicit) return explicit;
        const tag = el.tagName.toLowerCase();
        if (tag === 'a') return el.hasAttribute('href') ? 'link' : null;
        if (tag === 'button') return 'button';
        if (/^h[1-6]$/.test(tag)) return 'heading';
        if (tag === 'input') {
          const type = (el.getAttribute('type') || 'text').toLowerCase();
          if (type === 'checkbox') return 'checkbox';
          if (type === 'submit' || type === 'button') return 'button';
        }
        return null;
      };
      const allowed = new Set(['button', 'link', 'menuitem', 'tab', 'checkbox', 'heading', 'option']);
      const accessibleName = (el: Element): string => {
        const aria = el.getAttribute('aria-label');
        if (aria) return aria;
        const labelled = el.getAttribute('aria-labelledby');
        if (labelled) {
          return labelled
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent || '')
            .join(' ');
        }
        if (el instanceof HTMLInputElement) {
          if (el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label?.textContent) return label.textContent;
          }
          const wrapping = el.closest('label');
          if (wrapping?.textContent) return wrapping.textContent;
          return el.value || el.placeholder || '';
        }
        return el.textContent || '';
      };
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('a,button,input,h1,h2,h3,h4,h5,h6,[role]'))) {
        const role = roleOf(el);
        if (!role || !allowed.has(role)) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const name = accessibleName(el).replace(/\s+/g, ' ').trim();
        if (name) out.push(name);
      }
      return out;
    });
    for (const name of names) seen.add(name.toLowerCase());
  }

  const missing = quotedNames().filter((name) => {
    const needle = name.toLowerCase();
    for (const found of seen) {
      if (found === needle || found.includes(needle)) return false;
    }
    return true;
  });

  console.log('NAMECOV-START');
  console.log(`checked=${quotedNames().length} missing=${missing.length}`);
  console.log(missing.join('\n'));
  console.log('NAMECOV-END');
});
