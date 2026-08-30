import { existsSync } from 'node:fs';

import { chromium } from 'playwright-core';

const candidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const executablePath = candidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error('Set CHROME_PATH to a Chromium-based browser before running the passkey smoke test.');
}

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ baseURL: process.env.SMOKE_BASE_URL ?? 'http://localhost:3000' });
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];
const authRequests = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
});
page.on('request', (request) => {
  if (request.url().includes('convex') || request.url().includes('/api/auth')) authRequests.push(`${request.method()} ${request.url()}`);
});
page.on('requestfailed', (request) => failedResponses.push(`FAILED ${request.url()} ${request.failure()?.errorText ?? ''}`));

const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
cdp.on('Network.responseReceived', ({ response }) => {
  if (response.status >= 400) failedResponses.push(`${response.status} ${response.url}`);
});
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

try {
  await page.goto('/app', { waitUntil: 'networkidle' });
  await page.getByLabel('Your name').fill('RibbonDesk E2E Builder');
  await page.getByLabel('Work email').fill('e2e.passkey@ribbondesk.test');
  await page.getByRole('button', { name: 'Create account with a passkey' }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes('Name your workspace') || document.body.innerText.includes('Live workspace'),
    undefined,
    { timeout: 20_000 },
  );

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Already have an account? Sign in' }).click();
  await page.getByRole('button', { name: 'Continue with a passkey' }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes('Name your workspace') || document.body.innerText.includes('Live workspace'),
    undefined,
    { timeout: 20_000 },
  );

  if (await page.getByRole('heading', { name: 'Name your workspace' }).isVisible()) {
    await page.getByLabel('Organization name').fill('RibbonDesk E2E Workspace');
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await page.getByRole('heading', { name: 'Tell me about the business' }).waitFor();

    await page.getByLabel('Business name').fill('RibbonDesk Test Café');
    await page.getByLabel('Business type').fill('Café');
    await page.getByRole('button', { name: 'Save business' }).click();
    await page.getByRole('heading', { name: 'Configure the first location' }).waitFor();

    await page.getByLabel('Street address').fill('123 Test Street');
    await page.getByLabel('City').fill('New York');
    await page.getByLabel('State/region').fill('NY');
    await page.getByLabel('Postal code').fill('10001');
    await page.getByLabel('Business activities').fill('coffee service, baked goods');
    await page.getByText('Preparing or serving food').click();
    await page.getByRole('button', { name: 'Detect jurisdiction' }).click();
    await page.getByRole('heading', { name: 'Confirm the jurisdiction' }).waitFor();

    await page.getByRole('button', { name: 'Confirm and open my desk' }).click();
  }

  await page.getByText('Live workspace').waitFor({ timeout: 20_000 });
  await page.getByRole('heading', { name: /Good (morning|afternoon),/ }).waitFor();
  await page.getByRole('heading', { name: 'Find the rules. Keep the judgment human.' }).waitFor();
  await page.getByText(/\d+ proposals? waiting/).waitFor({ timeout: 20_000 });

  const acceptButtons = page.getByRole('button', { name: 'Accept & create task' });
  if ((await acceptButtons.count()) === 0) {
    await page.getByRole('button', { name: /Approve & run research|Run research again/ }).click();
    await acceptButtons.first().waitFor({ timeout: 20_000 });
  }
  const proposalTitle = await acceptButtons.first().locator('xpath=ancestor::article').getByRole('heading').innerText();
  await acceptButtons.first().click();
  await page.getByText('Requirement confirmed and its next action was added to Today.').waitFor({ timeout: 20_000 });
  await page.getByText(proposalTitle).last().waitFor({ timeout: 20_000 });
  if (process.env.SMOKE_SCREENSHOT) {
    await page.screenshot({ path: process.env.SMOKE_SCREENSHOT, fullPage: true });
  }

  if (consoleErrors.length) {
    throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
  }
  console.log('Passkey auth, onboarding, cited replay research, human approval, and realtime task creation passed.');
} catch (error) {
  console.error(`Smoke test stopped at ${page.url()}`);
  console.error((await page.locator('body').innerText()).slice(0, 2_000));
  if (failedResponses.length) console.error(failedResponses.join('\n'));
  if (authRequests.length) console.error(authRequests.join('\n'));
  if (consoleErrors.length) console.error(consoleErrors.join('\n'));
  throw error;
} finally {
  await browser.close();
}
