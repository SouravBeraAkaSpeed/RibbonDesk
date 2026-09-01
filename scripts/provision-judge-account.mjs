import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { chromium } from 'playwright-core';

const executablePath = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]
  .filter(Boolean)
  .find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error(
    'A Chromium browser is required to provision the judge account.',
  );
}

const judgePassword = process.env.JUDGE_ACCOUNT_PASSWORD;
if (!judgePassword || judgePassword.length < 14) {
  throw new Error(
    'Set JUDGE_ACCOUNT_PASSWORD to a private value of at least 14 characters.',
  );
}

const envFile = await readFile(new URL('../.env', import.meta.url), 'utf8');
const apiKeyLine = envFile
  .split(/\r?\n/)
  .filter((line) => line.startsWith('AGENTMAIL_API_KEY='))
  .at(-1);
const apiKey = apiKeyLine
  ?.slice(apiKeyLine.indexOf('=') + 1)
  .trim()
  .replace(/^['"]|['"]$/g, '');
if (!apiKey) throw new Error('AGENTMAIL_API_KEY is missing from .env.');

async function agentMail(path, options = {}) {
  const response = await fetch(`https://api.agentmail.to/v0${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(
      `AgentMail request failed with HTTP ${response.status}: ${detail.slice(0, 500)}`,
    );
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : await response.json();
}

async function waitForVerificationLink(inboxId, timeoutMs = 10 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const listing = await agentMail(
      `/inboxes/${encodeURIComponent(inboxId)}/messages?limit=20`,
    );
    const message = listing.messages?.find(
      (candidate) => candidate.subject === 'Verify your RibbonDesk email',
    );
    if (message?.thread_id) {
      const thread = await agentMail(
        `/inboxes/${encodeURIComponent(inboxId)}/threads/${encodeURIComponent(message.thread_id)}`,
      );
      const body =
        thread.messages
          ?.map((item) => `${item.text ?? ''}\n${item.extracted_text ?? ''}`)
          .join('\n') ?? '';
      const link = body
        .match(/https:\/\/[^\s<>]+/)?.[0]
        ?.replace(/[),.;]+$/, '');
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(
    'Timed out waiting for the judge-account verification email.',
  );
}

async function createJudgeInbox() {
  if (process.env.JUDGE_ACCOUNT_EMAIL) return process.env.JUDGE_ACCOUNT_EMAIL;

  const username = `ribbondesk-judges-${Date.now()}`;
  const created = await agentMail('/inboxes', {
    method: 'POST',
    body: {
      username,
      display_name: 'RibbonDesk Hackathon Judges',
      client_id: username,
    },
  });
  const inboxId = created.inbox_id ?? created.email;
  if (!inboxId)
    throw new Error('AgentMail did not return the judge inbox address.');
  return inboxId;
}

const baseURL =
  process.env.JUDGE_BASE_URL ??
  'https://ribbondesk.souravberaakagralius.chatgpt.site';
const email = await createJudgeInbox();
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ baseURL });
const page = await context.newPage();
const failedResponses = [];
page.on('response', (response) => {
  if (response.status() >= 400) {
    failedResponses.push(`${response.status()} ${response.url()}`);
  }
});

try {
  await page.goto('/app', { waitUntil: 'networkidle' });
  await page
    .getByRole('heading', { name: 'Welcome back' })
    .waitFor({ timeout: 30_000 });

  if (await page.getByRole('button', { name: 'Google' }).count()) {
    throw new Error('Refusing to provision while Google is publicly visible.');
  }

  await page
    .getByRole('button', { name: 'New to RibbonDesk? Create an account' })
    .click();
  await page.getByLabel('Your name').fill('RibbonDesk Hackathon Judge');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(judgePassword);
  await page.getByLabel('Confirm password').fill(judgePassword);
  await page
    .getByRole('button', { name: 'Create account & verify email' })
    .click();
  await page
    .getByRole('heading', { name: 'Confirm your email' })
    .waitFor({ timeout: 30_000 });

  const verificationUrl = await waitForVerificationLink(email);
  await page.goto(verificationUrl, { waitUntil: 'networkidle' });
  await page.waitForURL((url) => url.origin === new URL(baseURL).origin, {
    timeout: 30_000,
  });

  const workspaceHeading = page.getByRole('heading', {
    name: 'Name your workspace',
  });
  try {
    await workspaceHeading.waitFor({ timeout: 8_000 });
  } catch {
    await page
      .getByRole('heading', { name: 'Welcome back' })
      .waitFor({ timeout: 30_000 });
    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(judgePassword);
    await page.getByRole('button', { name: 'Sign in with email' }).click();
    await workspaceHeading.waitFor({ timeout: 30_000 });
  }

  await page.getByLabel('Organization name').fill('RibbonDesk Judge Workspace');
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page
    .getByRole('heading', { name: 'Tell me about the business' })
    .waitFor({ timeout: 30_000 });
  await page.getByLabel('Business name').fill('Harborlight Cafe & Market');
  await page
    .getByLabel('Business type')
    .fill('Cafe, bakery, and neighborhood market');
  await page.getByRole('button', { name: 'Save business' }).click();
  await page
    .getByRole('heading', { name: 'Configure the first location' })
    .waitFor({ timeout: 30_000 });
  await page.getByLabel('Street address').fill('115 Broadway');
  await page.getByLabel('City').fill('New York');
  await page.getByLabel('State/region').fill('NY');
  await page.getByLabel('Postal code').fill('10006');
  await page
    .getByLabel('Business activities')
    .fill(
      'prepare and sell coffee, baked goods, packaged food, indoor seating, employees, storefront signage, and local delivery',
    );
  await page.getByRole('button', { name: 'Detect jurisdiction' }).click();
  await page.getByRole('button', { name: 'Confirm and open my desk' }).click();
  await page
    .getByRole('button', { name: 'Sign out' })
    .waitFor({ timeout: 30_000 });

  if (failedResponses.some((entry) => entry.startsWith('500 '))) {
    throw new Error(`Server failures observed:\n${failedResponses.join('\n')}`);
  }

  console.log(
    JSON.stringify(
      {
        status: 'provisioned',
        email,
        role: 'owner',
        workspace: 'RibbonDesk Judge Workspace',
        passwordPrinted: false,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(`Judge provisioning stopped at ${page.url()}`);
  console.error((await page.locator('body').innerText()).slice(0, 8_000));
  if (failedResponses.length) console.error(failedResponses.join('\n'));
  throw error;
} finally {
  await context.close();
  await browser.close();
}
