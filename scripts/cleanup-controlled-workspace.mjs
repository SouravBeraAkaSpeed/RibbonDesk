import { existsSync } from 'node:fs';

import { chromium } from 'playwright-core';

const email = process.env.AUTH_CLEANUP_EMAIL;
const password = process.env.AUTH_CLEANUP_PASSWORD;
const organizationName = process.env.AUTH_CLEANUP_ORGANIZATION;
if (!email || !password || !organizationName) {
  throw new Error('AUTH_CLEANUP_EMAIL, AUTH_CLEANUP_PASSWORD, and AUTH_CLEANUP_ORGANIZATION are required.');
}

const executablePath = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).find((candidate) => existsSync(candidate));
if (!executablePath) throw new Error('A Chromium browser is required for controlled cleanup.');

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ baseURL: process.env.SMOKE_BASE_URL ?? 'http://localhost:3000' });
const page = await context.newPage();

try {
  await page.goto('/app', { waitUntil: 'networkidle' });
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in with email' }).click();

  const signOut = page.getByRole('button', { name: 'Sign out' });
  const emptyWorkspace = page.getByRole('heading', { name: 'Name your workspace' });
  await Promise.race([
    signOut.waitFor({ timeout: 30_000 }),
    emptyWorkspace.waitFor({ timeout: 30_000 }),
  ]);
  if (await signOut.isVisible()) {
    const dataControls = page.getByTestId('data-controls');
    await dataControls.getByLabel('Workspace name').fill(organizationName);
    await dataControls.getByRole('button', { name: 'Queue permanent deletion' }).click();
    await emptyWorkspace.waitFor({ timeout: 30_000 });
  }
  console.log(JSON.stringify({ status: 'passed', controlledCleanup: true, organizationName }, null, 2));
} finally {
  await browser.close();
}
