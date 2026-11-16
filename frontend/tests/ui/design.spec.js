import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const project = { id: 'fixture-project', name: 'Customer notifications — production and account operations', senderEmail: 'sender@example.com', apiKey: 'gkey_test_fixture', dailyQuota: 500, senders: [], brandLogo: null };
const stats = { success: true, capacity: { sentToday: 0, totalDailyQuota: 500, remainingToday: 500, senders: [], allAliases: [] }, metrics: { allTime: { totalSent: 0, totalDelivered: 0, totalFailed: 0 }, performance: { avgExecutionTimeMs: 0 }, tracking: {} } };

async function fixture(page, overrides = {}) {
  const state = { projects: [project], stats, sends: [], ...overrides };
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) {
      if (url.hostname === '127.0.0.1') return route.continue();
      return route.abort();
    }
    let json = { success: true };
    if (url.pathname.endsWith('/auth/me')) json.user = { name: 'Avery with an exceptionally long account name', email: 'avery@example.com' };
    else if (url.pathname.endsWith('/auth/register') || url.pathname.endsWith('/auth/login')) {
      if (state.authDelay) await new Promise(resolve => setTimeout(resolve, state.authDelay));
      json = state.authError ? { success: false, error: state.authError } : { success: true, token: 'fixture-token', user: { name: 'Avery', email: 'avery@example.com' } };
    } else if (url.pathname === '/api/projects') {
      if (request.method() === 'POST') { state.created = request.postDataJSON(); state.projects = [project]; json.project = project; }
      else json = state.projectsError ? { success: false, error: 'Unavailable' } : { success: true, projects: state.projects };
    } else if (url.pathname === '/api/stats') json = state.stats;
    else if (url.pathname === '/api/logs') json = { success: !state.logsError, logs: [], pagination: { page: 1, total: 0, totalPages: 1 } };
    else if (url.pathname === '/api/send') { state.sends.push(request.postDataJSON()); json = { success: false, error: 'Test fixture: sender is unavailable.', status: 'FAILED' }; }
    else if (url.pathname.includes('/members')) json.members = [];
    else if (url.pathname.includes('preview')) json = { success: true, html: '<p>Fixture preview</p>', subject: 'Fixture preview' };
    else if (url.pathname.includes('suppressions')) json = { success: true, suppressions: [], total: 0 };
    else if (url.pathname.includes('ip-whitelist')) json = { success: true, ipWhitelist: [], enabled: false };
    await route.fulfill({ json });
  });
  return state;
}

async function signInFixture(page) {
  await page.addInitScript(() => localStorage.setItem('dakly_auth_token', 'fixture-token'));
  await page.goto('/');
}

async function noOverflow(page) {
  expect(await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))).toEqual(expect.objectContaining({ scroll: await page.evaluate(() => innerWidth) }));
}

async function audit(page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
}

test('landing has one primary action, explicit preview, responsive layout and AA checks', async ({ page }) => {
  await fixture(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your app.Your Gmail.Mail, handled.');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow(page);
    await audit(page);
    await page.screenshot({ path: `../design-review/after/landing-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Receipt', exact: true }).click();
  await expect(page.getByText('Example order #1042')).toBeVisible();
  await expect(page.getByText('Illustrative email. No message is sent from this preview.')).toBeVisible();
  await page.getByRole('button', { name: 'cURL', exact: true }).click();
  await expect(page.getByLabel('cURL code example')).toContainText('/api/send');
  await page.locator('summary').filter({ hasText: 'What do I need to get started?' }).click();
  await expect(page.getByText(/Some Google accounts do not support App Passwords/)).toBeVisible();
});

test('auth dialog supports keyboard, validation, loading and failure without losing input', async ({ page }) => {
  const state = await fixture(page, { authError: 'This email is already registered.', authDelay: 500 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create your account' }).click();
  await audit(page);
  await page.getByLabel('Your name').fill('Avery');
  await page.getByLabel('Email address', { exact: true }).fill('avery@example.com');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Creating account…' })).toBeDisabled();
  await expect(page.getByRole('alert')).toHaveText(state.authError);
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue('avery@example.com');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create your account' })).toBeFocused();
});

test('empty workspace leads through project creation to a validated test send', async ({ page }) => {
  const state = await fixture(page, { projects: [] });
  await signInFixture(page);
  await page.getByRole('button', { name: 'Connect Gmail & create project' }).click();
  await page.getByLabel('Project name').fill('Transactional mail');
  await page.getByLabel('Sender Gmail address').fill('sender@example.com');
  await page.getByLabel('Google App Password', { exact: true }).fill('too short');
  await page.getByRole('button', { name: 'Connect & create project' }).click();
  await expect(page.getByRole('alert')).toContainText('16-character');
  await page.getByLabel('Google App Password', { exact: true }).fill('abcd efgh ijkl mnop');
  await page.getByRole('button', { name: 'Connect & create project' }).click();
  await expect(page.getByRole('heading', { name: 'Send a test email' })).toBeVisible();
  expect(state.created.appPassword).toBe('abcdefghijklmnop');
  await page.getByRole('button', { name: 'Send test email', exact: true }).click();
  expect(state.sends).toHaveLength(0);
  await page.getByRole('textbox', { name: /Recipient Email/ }).fill('recipient@example.com');
  await page.getByRole('button', { name: 'Send test email', exact: true }).click();
  await expect(page.getByText('Test fixture: sender is unavailable.', { exact: false }).first()).toBeVisible();
  expect(state.sends).toHaveLength(1);
  await expect(page.locator('main')).not.toContainText('710ms');
});

test('workspace states and all navigation destinations remain usable', async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInFixture(page);
  await expect(page.getByRole('heading', { name: 'Mail, in view.' })).toBeVisible();
  await expect(page.locator('.metric-ledger').first()).toContainText('—');
  await audit(page);
  await page.screenshot({ path: '../design-review/after/console-1440.png', fullPage: true });
  for (const name of ['Send a test', 'Templates', 'Projects & senders', 'Delivery logs', 'Webhooks', 'Security & team', 'API & SDK']) {
    await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('button', { name, exact: true }).click();
    await expect(page.locator('#workspace')).not.toBeEmpty();
    await noOverflow(page);
    await audit(page);
  }
});

test('mobile console and legal dialogs contain their content', async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await signInFixture(page);
  await expect(page.getByRole('heading', { name: 'Mail, in view.' })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: '../design-review/after/console-390.png', fullPage: true });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('button', { name: 'Send a test', exact: true }).click();
  await noOverflow(page);
  await audit(page);
  await page.getByRole('button', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Privacy policy' })).toBeVisible();
  await audit(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const name of ['Templates', 'Projects & senders', 'Delivery logs', 'Webhooks', 'Security & team', 'API & SDK']) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('button', { name, exact: true }).click();
    await noOverflow(page);
  await page.screenshot({ path: '../design-review/after/console-390.png', fullPage: true });
  }
});

test('dark appearance retains readable contrast and reduced motion', async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => { localStorage.setItem('dakly_auth_token', 'fixture-token'); localStorage.setItem('dakly_theme', 'dark'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mail, in view.' })).toBeVisible();
  await audit(page);
  for (const name of ['Send a test', 'Templates', 'Projects & senders', 'Delivery logs', 'Webhooks', 'Security & team', 'API & SDK']) {
    await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('button', { name, exact: true }).click();
    await audit(page);
  }
});

test('project and stats failures never appear as empty or successful data', async ({ page }) => {
  const state = await fixture(page, { projectsError: true });
  await signInFixture(page);
  await expect(page.getByRole('heading', { name: 'Projects couldn’t load.' })).toBeVisible();
  state.projectsError = false;
  state.stats = { success: false, error: 'Unavailable' };
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sender activity couldn’t load');
  await expect(page.locator('.usage-number')).toContainText('—');
  state.stats = stats;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.usage-number')).toContainText('0');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
