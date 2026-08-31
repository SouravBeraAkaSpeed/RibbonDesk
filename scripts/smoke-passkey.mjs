import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

import { PDFDocument, StandardFonts } from 'pdf-lib';
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
  throw new Error(
    'Set CHROME_PATH to a Chromium-based browser before running the passkey smoke test.',
  );
}

const browser = await chromium.launch({ executablePath, headless: true });
const baseURL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const context = await browser.newContext({ baseURL });
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];
const authRequests = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() >= 400)
    failedResponses.push(`${response.status()} ${response.url()}`);
});
page.on('request', (request) => {
  if (request.url().includes('convex') || request.url().includes('/api/auth'))
    authRequests.push(`${request.method()} ${request.url()}`);
});
page.on('requestfailed', (request) =>
  failedResponses.push(
    `FAILED ${request.url()} ${request.failure()?.errorText ?? ''}`,
  ),
);

const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
cdp.on('Network.responseReceived', ({ response }) => {
  if (response.status >= 400)
    failedResponses.push(`${response.status} ${response.url}`);
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
  await page
    .getByRole('button', { name: 'Create account with a passkey' })
    .click();
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Name your workspace') ||
      document.body.innerText.includes('Live workspace'),
    undefined,
    { timeout: 20_000 },
  );

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page
    .getByRole('button', { name: 'Already have an account? Sign in' })
    .click();
  await page.getByRole('button', { name: 'Continue with a passkey' }).click();
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Name your workspace') ||
      document.body.innerText.includes('Live workspace'),
    undefined,
    { timeout: 20_000 },
  );

  if (
    await page.getByRole('heading', { name: 'Name your workspace' }).isVisible()
  ) {
    await page.getByLabel('Organization name').fill('RibbonDesk E2E Workspace');
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await page
      .getByRole('heading', { name: 'Tell me about the business' })
      .waitFor();

    await page.getByLabel('Business name').fill('RibbonDesk Test Café');
    await page.getByLabel('Business type').fill('Café');
    await page.getByRole('button', { name: 'Save business' }).click();
    await page
      .getByRole('heading', { name: 'Configure the first location' })
      .waitFor();

    await page.getByLabel('Street address').fill('123 Test Street');
    await page.getByLabel('City').fill('New York');
    await page.getByLabel('State/region').fill('NY');
    await page.getByLabel('Postal code').fill('10001');
    await page
      .getByLabel('Business activities')
      .fill('coffee service, baked goods');
    await page.getByText('Preparing or serving food').click();
    await page.getByRole('button', { name: 'Detect jurisdiction' }).click();
    await page
      .getByRole('heading', { name: 'Confirm the jurisdiction' })
      .waitFor();

    await page
      .getByRole('button', { name: 'Confirm and open my desk' })
      .click();
  }

  await page.getByText('Live workspace').waitFor({ timeout: 20_000 });
  await page
    .getByRole('heading', { name: /Good (morning|afternoon),/ })
    .waitFor();
  await page
    .getByRole('heading', { name: 'Find the rules. Keep the judgment human.' })
    .waitFor();
  const acceptButtons = page.getByRole('button', {
    name: 'Accept & create task',
  });
  let existingProposalReady = true;
  try {
    await acceptButtons.first().waitFor({ timeout: 5_000 });
  } catch {
    existingProposalReady = false;
  }
  if (!existingProposalReady) {
    const confirmedStatus = await page
      .getByText('Confirmed requirements', { exact: true })
      .last()
      .locator('..')
      .innerText();
    const confirmedCount = Number.parseInt(
      confirmedStatus.match(/\d+/)?.[0] ?? '0',
      10,
    );
    if (confirmedCount === 0) {
      await page
        .getByRole('button', {
          name: /Approve & run research|Run research again/,
        })
        .click();
      await acceptButtons.first().waitFor({ timeout: 20_000 });
      existingProposalReady = true;
    }
  }
  if (existingProposalReady) {
    await acceptButtons.first().click();
    await page
      .getByText(
        'Requirement confirmed and its next action was added to Today.',
      )
      .waitFor({ timeout: 20_000 });
  }

  await page.getByRole('button', { name: 'Create application' }).click();
  await page
    .getByText('Reusable business answers', { exact: true })
    .waitFor({ timeout: 20_000 });
  await page.getByLabel('Legal business name').fill('RibbonDesk Test Café LLC');
  await page.getByLabel('Primary contact').fill('Test Builder');
  await page
    .getByLabel('Business address')
    .fill('123 Test Street, New York, NY 10001');
  await page.getByRole('button', { name: 'Save answers' }).click();
  await page
    .getByText('Reusable business answers saved.')
    .waitFor({ timeout: 20_000 });

  const evidencePdf = await PDFDocument.create();
  const evidencePage = evidencePdf.addPage([420, 240]);
  const evidenceFont = await evidencePdf.embedFont(StandardFonts.Helvetica);
  evidencePage.drawText(
    'Synthetic RibbonDesk permit evidence for automated testing.',
    { x: 32, y: 180, size: 12, font: evidenceFont },
  );
  const evidenceBytes = await evidencePdf.save();
  const evidenceFileName = `synthetic-permit-evidence-${Date.now()}.pdf`;
  await page.getByLabel(/PDF, DOCX, TXT/).setInputFiles({
    name: evidenceFileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from(evidenceBytes),
  });
  await page.getByRole('button', { name: 'Upload & check' }).click();
  const evidenceSection = page.getByTestId('evidence-applications');
  const evidenceCard = evidenceSection
    .locator('article')
    .filter({ hasText: evidenceFileName })
    .first();
  await evidenceCard
    .getByRole('button', { name: 'Confirm type' })
    .waitFor({ timeout: 20_000 });
  await evidenceCard
    .getByLabel(`Expiry date for ${evidenceFileName}`)
    .fill(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000)
        .toISOString()
        .slice(0, 10),
    );
  await evidenceCard.getByRole('button', { name: 'Confirm type' }).click();
  await evidenceCard
    .getByRole('button', { name: 'Attach to app' })
    .waitFor({ timeout: 20_000 });
  await evidenceCard.getByRole('button', { name: 'Attach to app' }).click();
  await page
    .getByText('Document linked to the selected application.')
    .waitFor({ timeout: 20_000 });

  await page
    .getByLabel('Official portal link')
    .fill('https://nyc-business.nyc.gov/');
  const unresolvedButton = page.getByRole('button', {
    name: 'Mark reviewed & resolved',
  });
  if (await unresolvedButton.isVisible()) await unresolvedButton.click();
  const readinessCheckboxes = evidenceSection.getByRole('checkbox');
  if ((await readinessCheckboxes.count()) < 4)
    throw new Error('Application readiness checklist did not render.');
  for (let index = 0; index < 4; index += 1) {
    const checkbox = readinessCheckboxes.nth(index);
    if ((await checkbox.getAttribute('aria-checked')) !== 'true') {
      await checkbox.click();
      const checkboxId = await checkbox.getAttribute('id');
      await page.waitForFunction(
        (id) =>
          Boolean(
            id &&
            document.getElementById(id)?.getAttribute('aria-checked') ===
              'true',
          ),
        checkboxId,
        { timeout: 20_000 },
      );
    }
  }
  const currentPacketBadge = page
    .getByText(/v\d+ · (prepared|failed|generating)/, { exact: true })
    .last();
  const currentPacketVersion = (await currentPacketBadge.count())
    ? Number.parseInt(
        (await currentPacketBadge.innerText()).match(/\d+/)?.[0] ?? '0',
        10,
      )
    : 0;
  await page.getByRole('button', { name: 'Generate packet' }).click();
  await page
    .getByText(`v${currentPacketVersion + 1} · prepared`, { exact: true })
    .waitFor({ timeout: 30_000 });
  const pdfDownload = page.getByRole('link', { name: 'PDF', exact: true });
  const zipDownload = page.getByRole('link', { name: 'ZIP', exact: true });
  try {
    await pdfDownload.waitFor({ timeout: 30_000 });
  } catch {
    const packetPanel = page
      .getByText('PDF summary + ZIP attachments', { exact: true })
      .locator('..')
      .locator('..');
    throw new Error(
      `Packet did not become downloadable: ${await packetPanel.innerText()}`,
    );
  }
  await zipDownload.waitFor({ timeout: 30_000 });
  const pdfResponse = await context.request.get(
    await pdfDownload.getAttribute('href'),
  );
  const zipResponse = await context.request.get(
    await zipDownload.getAttribute('href'),
  );
  const generatedPdf = await pdfResponse.body();
  const generatedZip = await zipResponse.body();
  if (!pdfResponse.ok() || generatedPdf.subarray(0, 5).toString() !== '%PDF-')
    throw new Error('Generated packet PDF is invalid.');
  if (!zipResponse.ok() || generatedZip.subarray(0, 2).toString() !== 'PK')
    throw new Error('Generated attachment ZIP is invalid.');
  if (process.env.SMOKE_PACKET_PDF)
    await writeFile(process.env.SMOKE_PACKET_PDF, generatedPdf);

  const activeContentFileName = `synthetic-active-content-${Date.now()}.pdf`;
  await page.getByLabel(/PDF, DOCX, TXT/).setInputFiles({
    name: activeContentFileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from(
      '%PDF-1.4\n1 0 obj<</JavaScript(unsafe-test-only)>>endobj\n%%EOF',
    ),
  });
  await page.getByRole('button', { name: 'Upload & check' }).click();
  const rejectedCard = evidenceSection
    .locator('article')
    .filter({ hasText: activeContentFileName })
    .first();
  await rejectedCard
    .getByText(
      /active scripts, launch actions, or embedded files are not allowed/i,
    )
    .waitFor({ timeout: 20_000 });

  const inboxSection = page.getByTestId('case-inbox');
  const createInboxButton = inboxSection.getByRole('button', {
    name: 'Create case inbox',
  });
  if (await createInboxButton.isVisible()) {
    await createInboxButton.click();
    await inboxSection
      .getByText('Safe replay mode')
      .waitFor({ timeout: 20_000 });
  }
  await inboxSection
    .getByRole('heading', { name: 'Messages' })
    .waitFor({ timeout: 20_000 });

  const observerContext = await browser.newContext({
    baseURL,
    storageState: await context.storageState(),
  });
  const observerPage = await observerContext.newPage();
  await observerPage.goto('/app', { waitUntil: 'networkidle' });
  const observerInbox = observerPage.getByTestId('case-inbox');
  await observerInbox
    .getByRole('heading', { name: 'Messages' })
    .waitFor({ timeout: 20_000 });
  const observerProposalCount = await observerInbox
    .getByRole('button', { name: 'Approve change' })
    .count();
  if (observerProposalCount === 0) {
    await inboxSection
      .getByRole('button', { name: 'Receive test reply' })
      .click();
    await observerPage.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('button')).some((button) =>
          button.textContent?.includes('Approve change'),
        ),
      undefined,
      { timeout: 20_000 },
    );
  }
  await observerContext.close();

  const approveMessageProposal = inboxSection
    .getByRole('button', { name: 'Approve change' })
    .first();
  await approveMessageProposal.click();
  await inboxSection
    .getByText('Proposal approved. The follow-up now appears in Today.')
    .waitFor({ timeout: 20_000 });

  const outboundSubject = `Controlled agency reply ${Date.now()}`;
  await inboxSection
    .getByLabel('To', { exact: true })
    .fill('agency@example.com');
  await inboxSection
    .getByLabel('Subject', { exact: true })
    .fill(outboundSubject);
  await inboxSection
    .getByLabel('Message', { exact: true })
    .fill('Attached is our controlled test response. Please confirm receipt.');
  const attachmentChoices = inboxSection.getByRole('checkbox');
  if (await attachmentChoices.count()) await attachmentChoices.first().click();
  await inboxSection.getByRole('button', { name: 'Save draft' }).click();
  await inboxSection
    .getByText(
      'Draft saved. Submit it for owner/admin review when it is ready.',
    )
    .waitFor({ timeout: 20_000 });
  const outboundCard = inboxSection
    .getByTestId('outbound-draft')
    .filter({ hasText: outboundSubject })
    .first();
  await outboundCard.getByRole('button', { name: 'Request approval' }).click();
  await outboundCard
    .getByRole('button', { name: 'Approve & send' })
    .waitFor({ timeout: 20_000 });
  await outboundCard.getByRole('button', { name: 'Approve & send' }).click();
  await outboundCard
    .getByText('Delivery confirmed')
    .waitFor({ timeout: 20_000 });

  const operationsSection = page.getByTestId('operations-lifecycle');
  const startOpening = operationsSection.getByRole('button', {
    name: 'Start opening',
  });
  if (await startOpening.isVisible()) {
    await startOpening.click();
    await operationsSection
      .getByRole('button', { name: 'Mark operating' })
      .waitFor({ timeout: 20_000 });
  }
  const markOperating = operationsSection.getByRole('button', {
    name: 'Mark operating',
  });
  if (await markOperating.isVisible()) {
    await markOperating.click();
    await operationsSection
      .getByText(
        'Location is operating. Recurring confirmed requirements are now active.',
      )
      .waitFor({ timeout: 20_000 });
  }

  const inspectionType = `Controlled safety inspection ${Date.now()}`;
  await operationsSection
    .getByLabel('Agency', { exact: true })
    .fill('Synthetic City Safety Office');
  await operationsSection
    .getByLabel('Inspection type', { exact: true })
    .fill(inspectionType);
  await operationsSection
    .getByLabel('Scheduled date')
    .fill(
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1_000)
        .toISOString()
        .slice(0, 10),
    );
  await operationsSection
    .getByRole('button', { name: 'Add inspection' })
    .click();
  const inspectionCard = operationsSection
    .locator('article')
    .filter({ hasText: inspectionType })
    .first();
  await inspectionCard
    .getByLabel(`Outcome for ${inspectionType}`)
    .fill(
      'A controlled finding requires corrective evidence before reinspection.',
    );
  await inspectionCard.getByRole('button', { name: 'Failed' }).click();
  await operationsSection
    .getByText('Failure recorded and a blocking corrective task created.')
    .waitFor({ timeout: 20_000 });

  const renewalDueDate = new Date().toISOString().slice(0, 10);
  await operationsSection
    .getByLabel('Confirmed requirement')
    .selectOption({ index: 1 });
  await operationsSection.getByLabel('Next due date').fill(renewalDueDate);
  await operationsSection
    .getByRole('button', { name: 'Track renewal' })
    .click();
  await operationsSection
    .getByText('Renewal tracked with durable reminder scheduling.')
    .waitFor({ timeout: 20_000 });
  await operationsSection
    .getByText(/due tomorrow|overdue/)
    .first()
    .waitFor({ timeout: 20_000 });
  const urgentPreference = operationsSection.getByRole('checkbox', {
    name: 'Urgent reminder email',
  });
  if ((await urgentPreference.getAttribute('aria-checked')) !== 'true') {
    await urgentPreference.click();
    await operationsSection
      .getByText('Reminder preferences saved.')
      .waitFor({ timeout: 20_000 });
  }
  const renewalDueLabel = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(`${renewalDueDate}T12:00:00`));
  const dueRenewalCard = operationsSection
    .locator('article')
    .filter({ hasText: renewalDueLabel })
    .filter({ has: page.getByRole('button', { name: 'Start' }) })
    .first();
  if (await dueRenewalCard.count()) {
    await dueRenewalCard.getByRole('button', { name: 'Start' }).click();
    await dueRenewalCard
      .getByRole('button', { name: 'Complete & roll forward' })
      .click();
    await operationsSection
      .getByText(
        'Renewal completed; the next cycle and reminders were created.',
      )
      .waitFor({ timeout: 20_000 });
  }

  const assistantSources = page.getByTestId('assistant-sources');
  const createAssistant = assistantSources.getByTestId('assistant-create');
  if (await createAssistant.isVisible()) {
    await createAssistant.click();
    await assistantSources
      .getByTestId('assistant-question')
      .waitFor({ timeout: 20_000 });
  }
  await assistantSources
    .getByRole('button', { name: 'What blocks opening?' })
    .click();
  await assistantSources.getByTestId('assistant-submit').click();
  await assistantSources
    .getByTestId('assistant-transcript')
    .getByText(/Current confirmed blockers|There are no confirmed blockers/)
    .last()
    .waitFor({ timeout: 20_000 });

  await assistantSources.getByTestId('source-simulate').click();
  const acceptSourceChange = assistantSources
    .getByTestId('source-accept')
    .first();
  await acceptSourceChange.waitFor({ timeout: 20_000 });
  await acceptSourceChange.click();
  await assistantSources
    .getByText(
      'Change accepted for review; linked records now need attention and a blocking task was created.',
    )
    .waitFor({ timeout: 20_000 });

  await page.getByTestId('workspace-search').click();
  await page.getByPlaceholder('Search the workspace…').fill('permit');
  await page
    .getByText(/Food Service Establishment Permit/i)
    .first()
    .waitFor({ timeout: 20_000 });
  await page.keyboard.press('Escape');

  const exportDownload = page.waitForEvent('download');
  await page.getByTestId('export-workspace').click();
  const downloadedExport = await exportDownload;
  const exportPath = await downloadedExport.path();
  if (!exportPath)
    throw new Error('Workspace export did not produce a download path.');
  const exportPayload = JSON.parse(await readFile(exportPath, 'utf8'));
  if (
    !exportPayload.metadata?.name ||
    !Array.isArray(exportPayload.records?.requirements)
  )
    throw new Error(
      'Workspace export is missing metadata or requirement records.',
    );
  await page
    .getByText(
      'Workspace export downloaded with all paginated app records and no provider secrets.',
    )
    .waitFor({ timeout: 20_000 });

  const teamSection = page.getByTestId('team-panel');
  const invitedEmail = `collaborator.${Date.now()}@ribbondesk.test`;
  await teamSection.getByLabel('Teammate email').fill(invitedEmail);
  await teamSection
    .getByRole('button', { name: 'Create private invite' })
    .click();
  const inviteLink = await teamSection.getByTestId('invite-link').innerText();
  if (!inviteLink.includes('/app?invite='))
    throw new Error('Private invitation link was not generated.');

  const inviteContext = await browser.newContext({ baseURL });
  const invitePage = await inviteContext.newPage();
  const inviteCdp = await inviteContext.newCDPSession(invitePage);
  await inviteCdp.send('WebAuthn.enable');
  await inviteCdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await invitePage.goto(inviteLink, { waitUntil: 'networkidle' });
  await invitePage.getByLabel('Your name').fill('Invited Contributor');
  await invitePage.getByLabel('Work email').fill(invitedEmail);
  await invitePage
    .getByRole('button', { name: 'Create account with a passkey' })
    .click();
  await invitePage
    .getByRole('heading', { name: 'Join this RibbonDesk workspace' })
    .waitFor({ timeout: 20_000 });
  await invitePage.getByTestId('accept-invite').click();
  await invitePage.getByText('Live workspace').waitFor({ timeout: 20_000 });
  await invitePage
    .getByText('contributor', { exact: true })
    .first()
    .waitFor({ timeout: 20_000 });
  if (await invitePage.getByTestId('source-simulate').count())
    throw new Error(
      'Contributor received an owner/admin source approval control.',
    );
  await teamSection
    .getByText('Invited Contributor', { exact: true })
    .last()
    .waitFor({ timeout: 20_000 });
  await inviteContext.close();
  if (process.env.SMOKE_SCREENSHOT) {
    await page.screenshot({
      path: process.env.SMOKE_SCREENSHOT,
      fullPage: true,
    });
  }

  if (consoleErrors.length) {
    throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
  }
  console.log(
    'Passkey auth, cited research, evidence packets, realtime inbox approval, inspections, renewals, reminders, grounded assistant, source-change review, workspace search, paginated export, and email-bound team invitations passed.',
  );
} catch (error) {
  console.error(`Smoke test stopped at ${page.url()}`);
  console.error((await page.locator('body').innerText()).slice(0, 10_000));
  if (failedResponses.length) console.error(failedResponses.join('\n'));
  if (authRequests.length) console.error(authRequests.join('\n'));
  if (consoleErrors.length) console.error(consoleErrors.join('\n'));
  throw error;
} finally {
  await browser.close();
}
