import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { chromium } from 'playwright-core';

const executablePath = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).find((candidate) => existsSync(candidate));
if (!executablePath) throw new Error('A Chromium browser is required for the live AgentMail smoke test.');

const envFile = await readFile(new URL('../.env', import.meta.url), 'utf8');
const apiKeyLine = envFile.split(/\r?\n/).filter((line) => line.startsWith('AGENTMAIL_API_KEY=')).at(-1);
const apiKey = apiKeyLine?.slice(apiKeyLine.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
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
    const error = new Error(`AgentMail test request failed with HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : await response.json();
}

async function deleteControlledInbox(inboxId) {
  const deadline = Date.now() + 30_000;
  while (true) {
    try {
      await agentMail(`/inboxes/${encodeURIComponent(inboxId)}`, { method: 'DELETE' });
      return;
    } catch (error) {
      if (error.status !== 404) throw error;
      const listing = await agentMail('/inboxes?limit=100');
      const stillExists = listing.inboxes?.some((inbox) =>
        [inbox.inbox_id, inbox.inboxId, inbox.email, inbox.id].includes(inboxId),
      );
      if (!stillExists) return;
      if (Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
}

const browser = await chromium.launch({ executablePath, headless: true });
const baseURL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const context = await browser.newContext({ baseURL });
const page = await context.newPage();
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
const organizationName = `Mail Test ${runId}`;
let targetInboxId;
let senderInboxId;
let cleanupSender = true;

try {
  await page.goto('/app', { waitUntil: 'networkidle' });
  await page.getByLabel('Your name').fill('RibbonDesk Mail Test');
  await page.getByLabel('Work email').fill(`live.mail.${runId}@ribbondesk.test`);
  await page.getByRole('button', { name: 'Create account with a passkey' }).click();
  await page.getByRole('heading', { name: 'Name your workspace' }).waitFor({ timeout: 30_000 });
  await page.getByLabel('Organization name').fill(organizationName);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.getByRole('heading', { name: 'Tell me about the business' }).waitFor({ timeout: 30_000 });
  await page.getByLabel('Business name').fill(`RibbonDesk Mail Business ${runId}`);
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

  const inbox = page.getByTestId('case-inbox');
  await inbox.getByRole('button', { name: /Create (live )?(this location’s dedicated )?case inbox/i }).click();
  await inbox.getByText('active', { exact: true }).waitFor({ timeout: 60_000 });
  const targetEmail = (await inbox.getByText(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).first().innerText()).trim();
  if (!targetEmail.includes('@')) throw new Error('RibbonDesk did not expose the provisioned AgentMail address.');

  const available = await agentMail('/inboxes?limit=100');
  targetInboxId = available.inboxes?.find((candidate) => candidate.email === targetEmail)?.inbox_id;
  if (!targetInboxId) throw new Error('The provisioned RibbonDesk inbox was not returned by AgentMail.');
  senderInboxId = process.env.AGENTMAIL_TEST_SENDER_INBOX?.trim();
  if (senderInboxId) {
    cleanupSender = false;
  } else {
    const createdSender = await agentMail('/inboxes', {
      method: 'POST',
      body: {
        username: `ribbondesk-e2e-sender-${runId}`,
        display_name: 'RibbonDesk Controlled Agency Sender',
        client_id: `ribbondesk-e2e-sender-${runId}`,
      },
    });
    const afterCreate = await agentMail('/inboxes?limit=100');
    const sender = afterCreate.inboxes?.find((candidate) => candidate.client_id === `ribbondesk-e2e-sender-${runId}`);
    senderInboxId = sender?.inbox_id ?? sender?.email ?? createdSender?.inbox_id ?? createdSender?.email;
  }
  if (!senderInboxId) throw new Error('AgentMail did not return the controlled sender inbox ID.');
  const subject = `Controlled permit correction ${runId}`;
  const sendDeadline = Date.now() + 30_000;
  while (true) {
    try {
      await agentMail(`/inboxes/${encodeURIComponent(senderInboxId)}/messages/send`, {
        method: 'POST',
        body: {
          to: [targetEmail],
          subject,
          text: 'Your application review is paused. Please send corrected insurance evidence by 2026-09-07 and reply after uploading it. This is a controlled RibbonDesk end-to-end test.',
          labels: ['ribbondesk-e2e'],
        },
      });
      break;
    } catch (error) {
      if (error.status !== 404 || Date.now() >= sendDeadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  await inbox.getByText(subject, { exact: true }).waitFor({ timeout: 120_000 });
  const approveChange = inbox.getByRole('button', { name: 'Approve change' }).first();
  await approveChange.waitFor({ timeout: 120_000 });
  await approveChange.click();
  await inbox.getByText('Proposal approved. The follow-up now appears in Today.').waitFor({ timeout: 30_000 });

  const inboundCard = inbox.locator('article').filter({ hasText: subject }).first();
  await inboundCard.getByRole('button', { name: 'Draft reply' }).click();
  await inbox.getByRole('button', { name: 'Save draft' }).click();
  await inbox.getByText('Draft saved. Submit it for owner/admin review when it is ready.').waitFor({ timeout: 30_000 });

  const replySubject = `Re: ${subject}`;
  const draft = inbox.getByTestId('outbound-draft').filter({ hasText: replySubject }).first();
  await draft.getByRole('button', { name: 'Request approval' }).click();
  await draft.getByRole('button', { name: 'Approve & send' }).waitFor({ timeout: 30_000 });
  await draft.getByRole('button', { name: 'Approve & send' }).click();
  await draft.getByText(/sent|Delivery confirmed/i).waitFor({ timeout: 60_000 });

  let receivedReply = false;
  let observedSubjects = [];
  const replyDeadline = Date.now() + 120_000;
  while (!receivedReply && Date.now() < replyDeadline) {
    const senderMessages = await agentMail(`/inboxes/${encodeURIComponent(senderInboxId)}/messages?limit=20`);
    observedSubjects = senderMessages.messages?.map((message) => message.subject).filter(Boolean) ?? [];
    receivedReply = senderMessages.messages?.some((message) => message.subject === replySubject) ?? false;
    if (!receivedReply) await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!receivedReply) throw new Error(`The approved RibbonDesk reply was not received in the controlled sender inbox. Observed ${observedSubjects.length} message subject(s).`);

  const dataControls = page.getByTestId('data-controls');
  await dataControls.getByLabel('Workspace name').fill(organizationName);
  await dataControls.getByRole('button', { name: 'Queue permanent deletion' }).click();
  let providerInboxDeleted = false;
  const deletionDeadline = Date.now() + 60_000;
  while (!providerInboxDeleted && Date.now() < deletionDeadline) {
    const inboxes = await agentMail('/inboxes?limit=100');
    providerInboxDeleted = !inboxes.inboxes?.some((candidate) => candidate.inbox_id === targetInboxId || candidate.email === targetInboxId);
    if (!providerInboxDeleted) await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!providerInboxDeleted) throw new Error('Workspace deletion did not remove its controlled AgentMail inbox.');

  console.log(JSON.stringify({
    status: 'passed',
    liveInboxProvisioning: true,
    signedInboundWebhook: true,
    aiProposalWithHumanApproval: true,
    approvedOutboundDelivery: true,
    providerInboxDeletion: true,
  }, null, 2));
} catch (error) {
  console.error(`AgentMail smoke stopped at ${page.url()}`);
  console.error((await page.locator('body').innerText()).slice(0, 12_000));
  throw error;
} finally {
  const cleanupInboxIds = [targetInboxId, ...(cleanupSender ? [senderInboxId] : [])].filter(Boolean);
  for (const inboxId of new Set(cleanupInboxIds)) {
    try {
      await deleteControlledInbox(inboxId);
    } catch {
      // A cleanup failure must not hide the primary test result.
    }
  }
  await browser.close();
}
