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
if (!executablePath)
  throw new Error(
    'A Chromium browser is required for the authentication smoke test.',
  );

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
    const error = new Error(
      `AgentMail test request failed with HTTP ${response.status}.`,
    );
    error.status = response.status;
    const retryAfter = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN;
    error.retryAfterMs = Number.isFinite(retryAfterSeconds)
      ? Math.ceil(retryAfterSeconds * 1_000)
      : undefined;
    throw error;
  }
  return response.status === 204 ? null : await response.json();
}

async function deleteControlledInbox(inboxId) {
  if (!inboxId) return;
  const deadline = Date.now() + 30_000;
  while (true) {
    try {
      await agentMail(`/inboxes/${encodeURIComponent(inboxId)}`, {
        method: 'DELETE',
      });
      return;
    } catch (error) {
      if (error.status !== 404) throw error;
      const listing = await agentMail('/inboxes?limit=100');
      const stillExists = listing.inboxes?.some((inbox) =>
        [inbox.inbox_id, inbox.inboxId, inbox.email, inbox.id].includes(
          inboxId,
        ),
      );
      if (!stillExists) return;
      if (Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
}

async function waitForSecurityLink(inboxId, subject, timeoutMs = 7 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const listing = await agentMail(
      `/inboxes/${encodeURIComponent(inboxId)}/messages?limit=20`,
    );
    const message = listing.messages?.find(
      (candidate) => candidate.subject === subject,
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
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error(`Timed out waiting for ${subject}.`);
}

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
  if (response.status() >= 400)
    failedResponses.push(`${response.status()} ${response.url()}`);
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
const username = `ribbondesk-auth-e2e-${runId}`;
const organizationName = `Auth Test ${runId}`;
const password = `Ribbon!Desk-${runId}`;
const nextPassword = `Ready!Desk-${runId}`;
let recipientInboxId;
let workspaceCreated = false;

try {
  const created = await agentMail('/inboxes', {
    method: 'POST',
    body: {
      username,
      display_name: 'RibbonDesk Auth Test',
      client_id: username,
    },
  });
  recipientInboxId = created.inbox_id ?? created.email;
  if (!recipientInboxId) {
    const listing = await agentMail('/inboxes?limit=100');
    const inbox = listing.inboxes?.find(
      (candidate) => candidate.client_id === username,
    );
    recipientInboxId = inbox?.inbox_id ?? inbox?.email;
  }
  if (!recipientInboxId)
    throw new Error('AgentMail did not return the controlled recipient inbox.');
  const email = recipientInboxId;
  const routeSubject = `Route readiness ${runId}`;
  const routeDeadline = Date.now() + 5 * 60_000;
  while (true) {
    try {
      await agentMail(
        `/inboxes/${encodeURIComponent(recipientInboxId)}/messages/send`,
        {
          method: 'POST',
          body: {
            to: [email],
            subject: routeSubject,
            text: 'Controlled delivery-route readiness check.',
            labels: ['ribbondesk-auth-e2e'],
          },
        },
      );
      break;
    } catch (error) {
      if (![404, 429].includes(error.status) || Date.now() >= routeDeadline)
        throw error;
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          error.retryAfterMs ?? (error.status === 429 ? 30_000 : 2_000),
        ),
      );
    }
  }
  let routeReady = false;
  while (Date.now() < routeDeadline) {
    const messages = await agentMail(
      `/inboxes/${encodeURIComponent(recipientInboxId)}/messages?limit=20`,
    );
    if (
      messages.messages?.some((message) => message.subject === routeSubject)
    ) {
      routeReady = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  if (!routeReady)
    throw new Error(
      'The controlled AgentMail recipient route did not become ready.',
    );
  // Avoid making the real verification send compete with the route probe in
  // the API key's short rate-limit window.
  await new Promise((resolve) => setTimeout(resolve, 65_000));

  await page.goto('/app', { waitUntil: 'networkidle' });
  await page
    .getByRole('heading', { name: 'Welcome back' })
    .waitFor({ timeout: 30_000 });
  if (await page.getByRole('button', { name: 'Google' }).count()) {
    throw new Error(
      'Google sign-in must not be exposed by the public release.',
    );
  }
  if (await page.getByRole('button', { name: 'Apple' }).count()) {
    throw new Error('Apple sign-in must not be exposed by the public release.');
  }
  await page
    .getByRole('button', { name: 'New to RibbonDesk? Create an account' })
    .click();
  await page.getByLabel('Your name').fill('RibbonDesk Auth Test');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page
    .getByRole('button', { name: 'Create account & verify email' })
    .click();
  await page
    .getByRole('heading', { name: 'Confirm your email' })
    .waitFor({ timeout: 30_000 });

  const verificationUrl = await waitForSecurityLink(
    recipientInboxId,
    'Verify your RibbonDesk email',
  );
  await page.goto(verificationUrl, { waitUntil: 'networkidle' });
  await page.waitForURL((url) => url.origin === new URL(baseURL).origin, {
    timeout: 30_000,
  });
  const workspaceHeading = page.getByRole('heading', {
    name: 'Name your workspace',
  });
  try {
    await workspaceHeading.waitFor({ timeout: 5_000 });
  } catch {
    await page
      .getByRole('heading', { name: 'Welcome back' })
      .waitFor({ timeout: 30_000 });
    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in with email' }).click();
    await workspaceHeading.waitFor({ timeout: 30_000 });
  }

  await page.getByLabel('Organization name').fill(organizationName);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  workspaceCreated = true;
  await page
    .getByRole('heading', { name: 'Tell me about the business' })
    .waitFor({ timeout: 30_000 });
  await page.getByLabel('Business name').fill(`Auth Business ${runId}`);
  await page.getByLabel('Business type').fill('Local service business');
  await page.getByRole('button', { name: 'Save business' }).click();
  await page
    .getByRole('heading', { name: 'Configure the first location' })
    .waitFor({ timeout: 30_000 });
  await page.getByLabel('Street address').fill('100 Main Street');
  await page.getByLabel('City').fill('Austin');
  await page.getByLabel('State/region').fill('TX');
  await page.getByLabel('Postal code').fill('78701');
  await page
    .getByLabel('Business activities')
    .fill('local professional services');
  await page.getByRole('button', { name: 'Detect jurisdiction' }).click();
  await page.getByRole('button', { name: 'Confirm and open my desk' }).click();
  await page
    .getByRole('button', { name: 'Sign out' })
    .waitFor({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Add passkey' }).click();
  await page
    .getByRole('button', { name: 'Passkey added' })
    .waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in with email' }).click();
  await page
    .getByRole('button', { name: 'Sign out' })
    .waitFor({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
  await page
    .getByRole('button', { name: 'Sign out' })
    .waitFor({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Work email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await page
    .getByText(
      'If an account exists for that email, its reset link is queued for delivery.',
    )
    .waitFor({ timeout: 30_000 });
  const resetUrl = await waitForSecurityLink(
    recipientInboxId,
    'Reset your RibbonDesk password',
  );
  await page.goto(resetUrl, { waitUntil: 'networkidle' });
  await page.waitForURL((url) => url.origin === new URL(baseURL).origin, {
    timeout: 30_000,
  });
  await page
    .getByRole('heading', { name: 'Choose a new password' })
    .waitFor({ timeout: 30_000 });
  await page.getByLabel('New password').fill(nextPassword);
  await page.getByLabel('Confirm password').fill(nextPassword);
  await page.getByRole('button', { name: 'Update password' }).click();
  await page
    .getByText('Password updated. Sign in with your new password.')
    .waitFor({ timeout: 30_000 });
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Sign in with email' }).click();
  await page
    .getByRole('button', { name: 'Sign out' })
    .waitFor({ timeout: 30_000 });

  const dataControls = page.getByTestId('data-controls');
  await dataControls.getByLabel('Workspace name').fill(organizationName);
  await dataControls
    .getByRole('button', { name: 'Queue permanent deletion' })
    .click();
  await page
    .getByRole('heading', { name: 'Name your workspace' })
    .waitFor({ timeout: 30_000 });
  workspaceCreated = false;

  if (consoleErrors.length)
    throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
  console.log(
    JSON.stringify(
      {
        status: 'passed',
        emailPasswordRegistration: true,
        agentMailEmailVerification: true,
        emailPasswordSignIn: true,
        authenticatedPasskeyEnrollment: true,
        passkeySignIn: true,
        passwordReset: true,
        publicSocialLoginHidden: true,
        controlledCleanup: true,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(`Authentication smoke stopped at ${page.url()}`);
  console.error((await page.locator('body').innerText()).slice(0, 12_000));
  if (workspaceCreated)
    console.error(
      'A controlled workspace may require cleanup after this failed run.',
    );
  if (consoleErrors.length) console.error(consoleErrors.join('\n'));
  if (failedResponses.length) console.error(failedResponses.join('\n'));
  throw error;
} finally {
  try {
    await deleteControlledInbox(recipientInboxId);
  } catch {
    // A cleanup failure must not hide the primary test result.
  }
  await browser.close();
}
