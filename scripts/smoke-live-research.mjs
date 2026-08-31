import { existsSync } from 'node:fs';

import { chromium } from 'playwright-core';

const executablePath = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).find((candidate) => existsSync(candidate));

if (!executablePath) throw new Error('A Chromium browser is required for the live research smoke test.');

const browser = await chromium.launch({ executablePath, headless: true });
const baseURL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const context = await browser.newContext({ baseURL });
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
const email = `live.research.${runId}@ribbondesk.test`;
const businessName = `RibbonDesk Live Café ${runId}`;

try {
  await page.goto('/app', { waitUntil: 'networkidle' });
  await page.getByLabel('Your name').fill('RibbonDesk Live Test');
  await page.getByLabel('Work email').fill(email);
  await page.getByRole('button', { name: 'Create account with a passkey' }).click();
  await page.getByRole('heading', { name: 'Name your workspace' }).waitFor({ timeout: 30_000 });

  await page.getByLabel('Organization name').fill(`Live Test ${runId}`);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.getByRole('heading', { name: 'Tell me about the business' }).waitFor({ timeout: 30_000 });
  await page.getByLabel('Business name').fill(businessName);
  await page.getByLabel('Business type').fill('Café and bakery');
  await page.getByRole('button', { name: 'Save business' }).click();
  await page.getByRole('heading', { name: 'Configure the first location' }).waitFor({ timeout: 30_000 });

  await page.getByLabel('Street address').fill('123 Test Street');
  await page.getByLabel('City').fill('New York');
  await page.getByLabel('State/region').fill('NY');
  await page.getByLabel('Postal code').fill('10001');
  await page.getByLabel('Business activities').fill('coffee service, baked goods, customer seating');
  await page.getByText('Preparing or serving food', { exact: true }).click();
  await page.getByText('Customer seating', { exact: true }).click();
  await page.getByRole('button', { name: 'Detect jurisdiction' }).click();
  await page.getByRole('heading', { name: 'Confirm the jurisdiction' }).waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Confirm and open my desk' }).click();

  const researchHeading = page.getByRole('heading', { name: 'Find the rules. Keep the judgment human.' });
  await researchHeading.waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Approve & run research' }).click();
  await page.getByText('Live providers', { exact: true }).waitFor({ timeout: 30_000 });

  const accept = page.getByRole('button', { name: 'Accept & create task' }).first();
  await accept.waitFor({ timeout: 240_000 });
  const proposal = accept.locator('xpath=ancestor::article');
  const proposalTitle = (await proposal.locator('h4').innerText()).trim();
  if (!proposalTitle) throw new Error('The live research proposal has no title.');

  const readSource = proposal.getByRole('button', { name: 'Read captured source' }).first();
  await readSource.click();
  await page.getByText('Official capture', { exact: true }).waitFor({ timeout: 30_000 });
  const dialogText = await page.getByRole('dialog').innerText();
  if (dialogText.length < 500) throw new Error('The in-app official-source capture is unexpectedly empty.');
  await page.keyboard.press('Escape');

  const observer = await context.newPage();
  await observer.goto('/app', { waitUntil: 'networkidle' });
  await observer.getByText('Live workspace', { exact: true }).waitFor({ timeout: 30_000 });

  await accept.click();
  await page.getByText('Requirement confirmed and its next action was added to Today.').waitFor({ timeout: 30_000 });
  await observer.getByText(proposalTitle, { exact: true }).first().waitFor({ timeout: 30_000 });
  await observer.close();

  const assistant = page.getByTestId('assistant-sources');
  const createAssistant = assistant.getByTestId('assistant-create');
  if (await createAssistant.isVisible()) {
    await createAssistant.click();
    await assistant.getByTestId('assistant-question').waitFor({ timeout: 30_000 });
  }
  await assistant.getByRole('button', { name: 'What blocks opening?' }).click();
  await assistant.getByTestId('assistant-submit').click();
  await assistant.getByText('Ribbon Assistant answered from the current workspace record.').waitFor({ timeout: 120_000 });
  const transcript = await assistant.getByTestId('assistant-transcript').innerText();
  if (!transcript.toLowerCase().includes('ribbon assistant') || transcript.length < 120) {
    throw new Error('The grounded assistant did not return a usable answer.');
  }

  if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
  console.log(JSON.stringify({
    status: 'passed',
    liveResearch: true,
    capturedSourceReader: true,
    humanApproval: true,
    realtimeSecondTab: true,
    groundedAssistant: true,
    proposalTitle,
  }, null, 2));
} catch (error) {
  console.error(`Live smoke stopped at ${page.url()}`);
  console.error((await page.locator('body').innerText()).slice(0, 12_000));
  if (failedResponses.length) console.error(failedResponses.join('\n'));
  throw error;
} finally {
  await browser.close();
}
