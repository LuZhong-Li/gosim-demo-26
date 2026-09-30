// Diagnostic probe (no assertions): after signing in, walk the requirement-
// critical pages and report every (role, accessible-name) pair that appears more
// than once. A duplicate accessible name makes getByRole(...) fail with a strict
// mode violation, which is a silent way for otherwise-correct pages to lose
// tests. Run against a live backend: TARGET_URL=http://127.0.0.1:3301
import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

const PASSWORD = 'Valid-password-123!';

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
  '/acme-demo/acme-docs?tab=pulls&pull=1&view=files',
  '/acme-demo/acme-docs/settings',
  '/acme-demo/acme-docs/settings/branches',
  '/acme-demo/acme-docs/compare?base=main&head=release',
  '/acme-demo/acme-docs/search?q=search',
  '/settings',
];

async function signIn(page: Page) {
  await page.goto('/auth?mode=signin');
  await page.getByLabel('Username or email').fill('alice-dev');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(500);
}

test('report duplicate accessible names on the critical pages', async ({ page }) => {
  await signIn(page);
  const report: string[] = [];

  for (const url of PAGES) {
    await page.goto(url);
    await page.waitForTimeout(700);
    const duplicates = await page.evaluate(() => {
      const implicitRole = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'a') return el.hasAttribute('href') ? 'link' : 'generic';
        if (tag === 'button') return 'button';
        if (tag === 'select') return 'combobox';
        if (tag === 'textarea') return 'textbox';
        if (tag === 'input') {
          const type = (el.getAttribute('type') || 'text').toLowerCase();
          if (type === 'checkbox') return 'checkbox';
          if (type === 'radio') return 'radio';
          if (type === 'search') return 'searchbox';
          if (type === 'submit' || type === 'button') return 'button';
          if (type === 'password') return 'textbox';
          return 'textbox';
        }
        if (/^h[1-6]$/.test(tag)) return 'heading';
        return 'generic';
      };
      const name = (el: Element): string => {
        const aria = el.getAttribute('aria-label');
        if (aria) return aria.trim();
        const labelled = el.getAttribute('aria-labelledby');
        if (labelled) {
          return labelled
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent || '')
            .join(' ')
            .trim();
        }
        if (el instanceof HTMLInputElement) {
          if (el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label?.textContent) return label.textContent.trim();
          }
          const wrapping = el.closest('label');
          if (wrapping?.textContent) return wrapping.textContent.trim();
          return (el.placeholder || '').trim();
        }
        return (el.textContent || '').replace(/\s+/g, ' ').trim();
      };

      const seen = new Map<string, number>();
      for (const el of Array.from(document.querySelectorAll('a,button,input,select,textarea,h1,h2,h3,h4'))) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const role = el.getAttribute('role') || implicitRole(el);
        const label = name(el).slice(0, 40);
        if (!label) continue;
        const key = `${role}|${label}`;
        seen.set(key, (seen.get(key) || 0) + 1);
      }
      return Array.from(seen.entries())
        .filter(([, count]) => count > 1)
        .map(([key, count]) => `${count}x ${key}`);
    });
    if (duplicates.length) {
      report.push(`## ${url}`);
      report.push(...duplicates.map((entry) => `- ${entry}`));
    }
  }

  console.log('DUPNAME-REPORT-START');
  console.log(report.join('\n'));
  console.log('DUPNAME-REPORT-END');
});
