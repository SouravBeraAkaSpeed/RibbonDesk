import { existsSync } from 'node:fs';

import { chromium } from 'playwright-core';

const executablePath = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).find((candidate) => existsSync(candidate));
if (!executablePath) throw new Error('A Chromium browser is required for the passkey smoke test.');

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ baseURL: process.env.SMOKE_BASE_URL ?? 'http://localhost:3000' });
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
});
const cdp = await context.newCDPSession(page);
await cdp.send('WebAuthn.enable');
await cdp.send('WebAuthn.addVirtualAuthenticator', {
  options: {
    protocol: 'ctap2',
    transport: 'internal',
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
  },
});

const runId = Date.now();
const organizationName = `Passkey Test ${runId}`;

try {
  await page.goto('/app', { waitUntil: 'networkidle' });
  await page.getByLabel('Your name').fill('RibbonDesk Passkey Test');
  await page.getByLabel('Work email').fill(`passkey.${runId}@ribbondesk.test`);
  await page.getByRole('button', { name: 'Create account with a passkey' }).click();
  await page.getByRole('heading', { name: 'Name your workspace' }).waitFor({ timeout: 30_000 });

  await page.getByLabel('Organization name').fill(organizationName);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.getByRole('heading', { name: 'Tell me about the business' }).waitFor({ timeout: 30_000 });
  await page.getByLabel('Business name').fill(`Passkey Business ${runId}`);
  await page.getByLabel('Business type').fill('Local service business');
  await page.getByRole('button', { name: 'Save business' }).click();
  await page.getByRole('heading', { name: 'Configure the first location' }).waitFor({ timeout: 30_000 });
  await page.getByLabel('Street address').fill('100 Main Street');
  await page.getByLabel('City').fill('Austin');
  await page.getByLabel('State/region').fill('TX');
  await page.getByLabel('Postal code').fill('78701');
  await page.getByLabel('Business activities').fill('local professional services');
  await page.getByRole('button', { name: 'Detect jurisdiction' }).click();
  await page.getByRole('heading', { name: 'Confirm the jurisdiction' }).waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Confirm and open my desk' }).click();
  await page.getByText('Live workspace').waitFor({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Already have an account? Sign in' }).click();
  await page.getByRole('button', { name: 'Continue with a passkey' }).click();
  await page.getByText('Live workspace').waitFor({ timeout: 30_000 });

  const dataControls = page.getByTestId('data-controls');
  await dataControls.getByLabel('Workspace name').fill(organizationName);
  await dataControls.getByRole('button', { name: 'Queue permanent deletion' }).click();
  await page.getByRole('heading', { name: 'Name your workspace' }).waitFor({ timeout: 30_000 });

  if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);

  console.log(JSON.stringify({
    status: 'passed',
    passkeyRegistration: true,
    passkeySignIn: true,
    authenticatedOnboarding: true,
    persistedWorkspace: true,
    controlledCleanup: true,
  }, null, 2));
} catch (error) {
  console.error(`Passkey smoke stopped at ${page.url()}`);
  console.error((await page.locator('body').innerText()).slice(0, 12_000));
  if (consoleErrors.length) console.error(consoleErrors.join('\n'));
  if (failedResponses.length) console.error(failedResponses.join('\n'));
  throw error;
} finally {
  await browser.close();
}
