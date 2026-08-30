import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { recordActivity, requireLocation } from './lib/permissions';
import schema from './schema';

const applicationStatusValidator = v.union(
  v.literal('draft'),
  v.literal('ready'),
  v.literal('submitted'),
  v.literal('needs_attention'),
  v.literal('approved'),
  v.literal('denied'),
  v.literal('withdrawn'),
);

const readinessCheckValidator = v.object({ key: v.string(), label: v.string(), complete: v.boolean() });
const answerValidator = v.object({ key: v.string(), label: v.string(), value: v.string(), reusable: v.boolean() });

function httpsUrl(value: string | undefined) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') throw new Error('not https');
    return url.href;
  } catch {
    throw new ConvexError({ code: 'INVALID_PORTAL', message: 'Official portal links must be valid HTTPS URLs.' });
  }
}

function boundedStrings(values: string[], maxItems: number, maxLength: number) {
  if (values.length > maxItems) throw new ConvexError({ code: 'TOO_MANY_ITEMS', message: `Keep this list to ${maxItems} items or fewer.` });
  return values.map((value) => value.trim()).filter(Boolean).map((value) => value.slice(0, maxLength));
}

export const create = mutation({
  args: { requirementId: v.id('requirements'), officialPortalUrl: v.optional(v.string()) },
  returns: v.id('applications'),
  handler: async (ctx, args) => {
    const requirement = await ctx.db.get(args.requirementId);
    if (!requirement) throw new ConvexError({ code: 'NOT_FOUND', message: 'Requirement not found.' });
    const { identity } = await requireLocation(ctx, requirement.locationId, 'contributor');
    if (!requirement.confirmedAt || ['proposed', 'conflicted', 'not_applicable'].includes(requirement.status)) {
      throw new ConvexError({ code: 'CONFIRMED_REQUIREMENT_REQUIRED', message: 'Confirm an applicable requirement before preparing its application.' });
    }
    const existing = await ctx.db.query('applications').withIndex('by_requirementId', (index) => index.eq('requirementId', args.requirementId)).first();
    if (existing) return existing._id;
    const now = Date.now();
    const applicationId = await ctx.db.insert('applications', {
      organizationId: requirement.organizationId,
      locationId: requirement.locationId,
      requirementId: requirement._id,
      name: `${requirement.title} application`,
      agency: requirement.agency,
      status: 'draft',
      officialPortalUrl: httpsUrl(args.officialPortalUrl),
      requiredAttachments: ['Completed official form', 'Business identity evidence', 'Requirement-specific supporting evidence'],
      unresolvedQuestions: ['Confirm the current filing instructions and every answer against the official source before submission.'],
      readinessChecks: [
        { key: 'official_guidance', label: 'Official guidance reviewed', complete: false },
        { key: 'business_answers', label: 'Reusable business answers completed', complete: false },
        { key: 'attachments', label: 'Required attachments linked', complete: false },
        { key: 'owner_review', label: 'Final human review completed', complete: false },
      ],
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: requirement.organizationId,
      locationId: requirement.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'application.created',
      entityType: 'application',
      entityId: applicationId,
      after: { requirementId: requirement._id, name: `${requirement.title} application`, status: 'draft' },
    });
    return applicationId;
  },
});

export const list = query({
  args: { locationId: v.id('locations'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc('applications')),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    return await ctx.db.query('applications').withIndex('by_locationId_and_createdAt', (index) => index.eq('locationId', args.locationId)).order('desc').paginate(args.paginationOpts);
  },
});

export const getWorkspace = query({
  args: { applicationId: v.id('applications') },
  returns: v.object({
    application: schema.doc('applications'),
    requirement: schema.doc('requirements'),
    answers: v.array(schema.doc('applicationAnswers')),
    attachments: v.array(v.object({ link: schema.doc('documentLinks'), document: schema.doc('documents'), downloadUrl: v.union(v.null(), v.string()) })),
    packets: v.array(schema.doc('applicationPackets')),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await requireLocation(ctx, application.locationId);
    const requirement = await ctx.db.get(application.requirementId);
    if (!requirement) throw new ConvexError({ code: 'NOT_FOUND', message: 'Linked requirement not found.' });
    const [answers, links, packets] = await Promise.all([
      ctx.db.query('applicationAnswers').withIndex('by_applicationId_and_updatedAt', (index) => index.eq('applicationId', args.applicationId)).take(100),
      ctx.db.query('documentLinks').withIndex('by_applicationId', (index) => index.eq('applicationId', args.applicationId)).take(100),
      ctx.db.query('applicationPackets').withIndex('by_applicationId_and_version', (index) => index.eq('applicationId', args.applicationId)).order('desc').take(20),
    ]);
    const attachments = [];
    for (const link of links) {
      const document = await ctx.db.get(link.documentId);
      if (!document || document.locationId !== application.locationId || document.status !== 'ready') continue;
      attachments.push({ link, document, downloadUrl: await ctx.storage.getUrl(document.storageId) });
    }
    return { application, requirement, answers, attachments, packets, truncated: answers.length === 100 || links.length === 100 || packets.length === 20 };
  },
});

export const saveAnswers = mutation({
  args: { applicationId: v.id('applications'), answers: v.array(answerValidator) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    const { identity } = await requireLocation(ctx, application.locationId, 'contributor');
    if (args.answers.length > 25) throw new ConvexError({ code: 'TOO_MANY_ANSWERS', message: 'Save at most 25 answers at once.' });
    const now = Date.now();
    let saved = 0;
    for (const answer of args.answers) {
      const key = answer.key.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 80);
      const label = answer.label.trim().slice(0, 120);
      const value = answer.value.trim().slice(0, 2_000);
      if (!key || !label) continue;
      const existing = await ctx.db.query('applicationAnswers').withIndex('by_applicationId_and_key', (index) => index.eq('applicationId', args.applicationId).eq('key', key)).unique();
      if (existing) {
        await ctx.db.patch(existing._id, { label, value, reusable: answer.reusable, updatedBy: identity.tokenIdentifier, updatedAt: now });
      } else {
        await ctx.db.insert('applicationAnswers', {
          organizationId: application.organizationId,
          locationId: application.locationId,
          applicationId: args.applicationId,
          key,
          label,
          value,
          reusable: answer.reusable,
          updatedBy: identity.tokenIdentifier,
          createdAt: now,
          updatedAt: now,
        });
      }
      saved += 1;
    }
    await recordActivity(ctx, {
      organizationId: application.organizationId,
      locationId: application.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'application.answers_saved',
      entityType: 'application',
      entityId: args.applicationId,
      after: { answerCount: saved },
    });
    return saved;
  },
});

export const updatePreparation = mutation({
  args: {
    applicationId: v.id('applications'),
    officialPortalUrl: v.optional(v.string()),
    requiredAttachments: v.array(v.string()),
    unresolvedQuestions: v.array(v.string()),
    readinessChecks: v.array(readinessCheckValidator),
  },
  returns: applicationStatusValidator,
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    const { identity } = await requireLocation(ctx, application.locationId, 'contributor');
    if (args.readinessChecks.length > 12) throw new ConvexError({ code: 'TOO_MANY_CHECKS', message: 'Keep the readiness checklist to 12 items or fewer.' });
    const readinessChecks = args.readinessChecks.map((check) => ({ key: check.key.trim().slice(0, 80), label: check.label.trim().slice(0, 160), complete: check.complete })).filter((check) => check.key && check.label);
    const requiredAttachments = boundedStrings(args.requiredAttachments, 20, 160);
    const unresolvedQuestions = boundedStrings(args.unresolvedQuestions, 20, 300);
    const status: 'ready' | 'draft' = readinessChecks.length > 0 && readinessChecks.every((check) => check.complete) && unresolvedQuestions.length === 0 ? 'ready' : 'draft';
    const patch = { officialPortalUrl: httpsUrl(args.officialPortalUrl), requiredAttachments, unresolvedQuestions, readinessChecks, status, updatedAt: Date.now() };
    await ctx.db.patch(args.applicationId, patch);
    await recordActivity(ctx, {
      organizationId: application.organizationId,
      locationId: application.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'application.preparation_updated',
      entityType: 'application',
      entityId: args.applicationId,
      before: { status: application.status, officialPortalUrl: application.officialPortalUrl, unresolvedQuestions: application.unresolvedQuestions, readinessChecks: application.readinessChecks },
      after: patch,
    });
    return status;
  },
});

export const setReadinessCheck = mutation({
  args: { applicationId: v.id('applications'), key: v.string(), complete: v.boolean(), officialPortalUrl: v.optional(v.string()) },
  returns: applicationStatusValidator,
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    const { identity } = await requireLocation(ctx, application.locationId, 'contributor');
    const readinessChecks = application.readinessChecks.map((check) => check.key === args.key ? { ...check, complete: args.complete } : check);
    if (!readinessChecks.some((check) => check.key === args.key)) {
      throw new ConvexError({ code: 'CHECK_NOT_FOUND', message: 'Readiness check not found.' });
    }
    const status: 'ready' | 'draft' = readinessChecks.length > 0 && readinessChecks.every((check) => check.complete) && application.unresolvedQuestions.length === 0 ? 'ready' : 'draft';
    await ctx.db.patch(args.applicationId, { readinessChecks, officialPortalUrl: httpsUrl(args.officialPortalUrl), status, updatedAt: Date.now() });
    await recordActivity(ctx, {
      organizationId: application.organizationId,
      locationId: application.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'application.readiness_check_changed',
      entityType: 'application',
      entityId: args.applicationId,
      before: { key: args.key, complete: application.readinessChecks.find((check) => check.key === args.key)?.complete },
      after: { key: args.key, complete: args.complete, status },
    });
    return status;
  },
});

export const recordSubmission = mutation({
  args: { applicationId: v.id('applications'), submittedAt: v.number(), referenceNumber: v.string(), expectedResponseAt: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    const { identity } = await requireLocation(ctx, application.locationId, 'contributor');
    const referenceNumber = args.referenceNumber.trim().slice(0, 160);
    if (!referenceNumber) throw new ConvexError({ code: 'REFERENCE_REQUIRED', message: 'Record the receipt or agency reference number.' });
    const patch = { status: 'submitted' as const, submittedAt: args.submittedAt, referenceNumber, expectedResponseAt: args.expectedResponseAt, updatedAt: Date.now() };
    await ctx.db.patch(args.applicationId, patch);
    await recordActivity(ctx, {
      organizationId: application.organizationId,
      locationId: application.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'application.submission_recorded',
      entityType: 'application',
      entityId: args.applicationId,
      before: { status: application.status },
      after: patch,
    });
    return null;
  },
});

export const recordOutcome = mutation({
  args: { applicationId: v.id('applications'), status: v.union(v.literal('needs_attention'), v.literal('approved'), v.literal('denied'), v.literal('withdrawn')), notes: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    const { identity } = await requireLocation(ctx, application.locationId, 'contributor');
    const patch = { status: args.status, outcomeNotes: args.notes.trim().slice(0, 2_000) || undefined, updatedAt: Date.now() };
    await ctx.db.patch(args.applicationId, patch);
    await recordActivity(ctx, {
      organizationId: application.organizationId,
      locationId: application.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'application.outcome_recorded',
      entityType: 'application',
      entityId: args.applicationId,
      before: { status: application.status, outcomeNotes: application.outcomeNotes },
      after: patch,
    });
    return null;
  },
});

export const generatePacket = mutation({
  args: { applicationId: v.id('applications') },
  returns: v.id('applicationPackets'),
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    const { identity } = await requireLocation(ctx, application.locationId, 'contributor');
    const previous = await ctx.db.query('applicationPackets').withIndex('by_applicationId_and_version', (index) => index.eq('applicationId', args.applicationId)).order('desc').first();
    if (previous?.status === 'generating') return previous._id;
    const now = Date.now();
    const packetId = await ctx.db.insert('applicationPackets', {
      organizationId: application.organizationId,
      locationId: application.locationId,
      applicationId: application._id,
      version: (previous?.version ?? 0) + 1,
      status: 'generating',
      generatedBy: identity.tokenIdentifier,
      createdAt: now,
    });
    await recordActivity(ctx, {
      organizationId: application.organizationId,
      locationId: application.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'application.packet_requested',
      entityType: 'application_packet',
      entityId: packetId,
      after: { applicationId: application._id, version: (previous?.version ?? 0) + 1, label: 'prepared, not filed' },
    });
    await ctx.scheduler.runAfter(0, internal.applications.buildPacket, { packetId });
    return packetId;
  },
});

export const getPacketContext = internalQuery({
  args: { packetId: v.id('applicationPackets') },
  returns: v.union(v.null(), v.object({
    packet: schema.doc('applicationPackets'),
    application: schema.doc('applications'),
    requirement: schema.doc('requirements'),
    location: schema.doc('locations'),
    business: schema.doc('businesses'),
    answers: v.array(schema.doc('applicationAnswers')),
    attachments: v.array(v.object({ fileName: v.string(), contentType: v.string(), sizeBytes: v.number(), url: v.string() })),
  })),
  handler: async (ctx, args) => {
    const packet = await ctx.db.get(args.packetId);
    if (!packet || packet.status !== 'generating') return null;
    const application = await ctx.db.get(packet.applicationId);
    if (!application) return null;
    const [requirement, location, answers, links] = await Promise.all([
      ctx.db.get(application.requirementId),
      ctx.db.get(application.locationId),
      ctx.db.query('applicationAnswers').withIndex('by_applicationId_and_updatedAt', (index) => index.eq('applicationId', application._id)).take(100),
      ctx.db.query('documentLinks').withIndex('by_applicationId', (index) => index.eq('applicationId', application._id)).take(20),
    ]);
    if (!requirement || !location) return null;
    const business = await ctx.db.get(location.businessId);
    if (!business) return null;
    const attachments = [];
    for (const link of links) {
      const document = await ctx.db.get(link.documentId);
      if (!document || document.locationId !== location._id || document.status !== 'ready' || document.sizeBytes > 10 * 1024 * 1024) continue;
      const url = await ctx.storage.getUrl(document.storageId);
      if (url) attachments.push({ fileName: document.fileName, contentType: document.contentType, sizeBytes: document.sizeBytes, url });
    }
    return { packet, application, requirement, location, business, answers, attachments };
  },
});

function wrapText(text: string, maxCharacters = 88) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').flatMap((word) => {
    if (word.length <= maxCharacters) return [word];
    const chunks: string[] = [];
    for (let offset = 0; offset < word.length; offset += maxCharacters) chunks.push(word.slice(offset, offset + maxCharacters));
    return chunks;
  });
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function pdfSafeText(value: string) {
  return Array.from(value.normalize('NFKD'))
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      if (code >= 32 && code <= 126) return character;
      if (code >= 0x300 && code <= 0x36f) return '';
      if (character === '—' || character === '–') return '-';
      if (character === '“' || character === '”') return '"';
      if (character === '‘' || character === '’') return "'";
      if (character === '•') return '-';
      return '?';
    })
    .join('');
}

function zipFileName(value: string, used: Set<string>) {
  const base = value.split(String.fromCharCode(0)).join('').replace(/[^a-zA-Z0-9._ -]/g, '-').slice(0, 120) || 'attachment';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) {
    const dot = base.lastIndexOf('.');
    candidate = dot > 0 ? `${base.slice(0, dot)}-${suffix}${base.slice(dot)}` : `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export const buildPacket = internalAction({
  args: { packetId: v.id('applicationPackets') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.applications.getPacketContext, args);
    if (!data) return null;
    let pdfStorageId: Id<'_storage'> | undefined;
    let zipStorageId: Id<'_storage'> | undefined;
    try {
      const pdf = await PDFDocument.create();
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      let page = pdf.addPage([612, 792]);
      let y = 748;
      const write = (text: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
        const size = options.size ?? 10;
        for (const line of wrapText(pdfSafeText(text), size >= 16 ? 62 : 92)) {
          if (y < 55) {
            page = pdf.addPage([612, 792]);
            y = 748;
          }
          page.drawText(line, { x: 52, y, size, font: options.bold ? bold : regular, color: options.color ?? rgb(0.11, 0.16, 0.24) });
          y -= size + 5;
        }
        y -= options.gap ?? 4;
      };
      write('RibbonDesk application packet', { size: 21, bold: true });
      write('PREPARED, NOT FILED', { size: 11, bold: true, color: rgb(0.82, 0.27, 0.22), gap: 12 });
      write(`Application: ${data.application.name}`, { size: 14, bold: true });
      write(`Business: ${data.business.name}`);
      write(`Location: ${data.location.name} — ${data.location.city}, ${data.location.region}`);
      write(`Agency: ${data.application.agency}`);
      if (data.application.officialPortalUrl) write(`Official portal: ${data.application.officialPortalUrl}`);
      write(`Packet version: ${data.packet.version}`);
      write(`Generated: ${new Date().toISOString()}`, { gap: 12 });
      write('Requirement and source', { size: 13, bold: true });
      write(data.requirement.description);
      write(`${data.requirement.sourceTitle}: ${data.requirement.sourceUrl}`, { gap: 12 });
      write('Reusable business answers', { size: 13, bold: true });
      if (data.answers.length) data.answers.forEach((answer) => write(`${answer.label}: ${answer.value || '[not completed]'}`));
      else write('No reusable answers have been completed.');
      y -= 8;
      write('Readiness checks', { size: 13, bold: true });
      data.application.readinessChecks.forEach((check) => write(`${check.complete ? '[x]' : '[ ]'} ${check.label}`));
      y -= 8;
      write('Required attachment checklist', { size: 13, bold: true });
      data.application.requiredAttachments.forEach((item) => write(`- ${item}`));
      y -= 8;
      write('Included attachment bundle', { size: 13, bold: true });
      if (data.attachments.length) data.attachments.forEach((attachment) => write(`- ${attachment.fileName} (${Math.ceil(attachment.sizeBytes / 1024)} KB)`));
      else write('No files are attached to this packet version.');
      y -= 8;
      write('Unresolved questions', { size: 13, bold: true });
      if (data.application.unresolvedQuestions.length) data.application.unresolvedQuestions.forEach((item) => write(`- ${item}`));
      else write('None recorded.');
      y -= 8;
      write('Submission boundary', { size: 13, bold: true });
      write('RibbonDesk prepared this versioned summary and attachment bundle. It has not submitted, filed, or delivered this application to any agency. Review the current official instructions and every included item before external submission.');

      const pages = pdf.getPages();
      pages.forEach((packetPage, index) => {
        packetPage.drawLine({ start: { x: 52, y: 36 }, end: { x: 560, y: 36 }, thickness: 0.6, color: rgb(0.78, 0.8, 0.83) });
        packetPage.drawText(`RibbonDesk | PREPARED, NOT FILED | Page ${index + 1} of ${pages.length}`, {
          x: 52,
          y: 20,
          size: 8,
          font: bold,
          color: rgb(0.42, 0.46, 0.52),
        });
      });

      const pdfBytes = await pdf.save();
      const zip = new JSZip();
      zip.file('RibbonDesk-application-packet.pdf', pdfBytes);
      const usedNames = new Set<string>(['ribbondesk-application-packet.pdf']);
      let includedBytes = 0;
      for (const attachment of data.attachments) {
        if (includedBytes + attachment.sizeBytes > 25 * 1024 * 1024) break;
        const response = await fetch(attachment.url);
        if (!response.ok) continue;
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength !== attachment.sizeBytes) continue;
        zip.file(`attachments/${zipFileName(attachment.fileName, usedNames)}`, bytes);
        includedBytes += bytes.byteLength;
      }
      const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfBuffer).set(pdfBytes);
      const zipBuffer = new ArrayBuffer(zipBytes.byteLength);
      new Uint8Array(zipBuffer).set(zipBytes);
      pdfStorageId = await ctx.storage.store(new Blob([pdfBuffer], { type: 'application/pdf' }));
      zipStorageId = await ctx.storage.store(new Blob([zipBuffer], { type: 'application/zip' }));
      await ctx.runMutation(internal.applications.finishPacket, { packetId: args.packetId, pdfStorageId, zipStorageId });
    } catch (error) {
      await ctx.runMutation(internal.applications.failPacket, {
        packetId: args.packetId,
        message: error instanceof Error ? error.message.slice(0, 400) : 'Packet generation failed.',
        pdfStorageId,
        zipStorageId,
      });
    }
    return null;
  },
});

export const finishPacket = internalMutation({
  args: { packetId: v.id('applicationPackets'), pdfStorageId: v.id('_storage'), zipStorageId: v.id('_storage') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const packet = await ctx.db.get(args.packetId);
    if (!packet || packet.status !== 'generating') {
      await ctx.storage.delete(args.pdfStorageId);
      await ctx.storage.delete(args.zipStorageId);
      return null;
    }
    const now = Date.now();
    const [organization, pdfMetadata, zipMetadata] = await Promise.all([
      ctx.db.get(packet.organizationId),
      ctx.db.system.get('_storage', args.pdfStorageId),
      ctx.db.system.get('_storage', args.zipStorageId),
    ]);
    const addedBytes = (pdfMetadata?.size ?? 0) + (zipMetadata?.size ?? 0);
    if (!organization || !pdfMetadata || !zipMetadata || (organization.storedBytes ?? 0) + addedBytes > 100 * 1024 * 1024) {
      await ctx.storage.delete(args.pdfStorageId);
      await ctx.storage.delete(args.zipStorageId);
      await ctx.db.patch(args.packetId, { status: 'failed', errorMessage: 'The packet could not be stored within the workspace quota.', generatedAt: now });
      await recordActivity(ctx, {
        organizationId: packet.organizationId,
        locationId: packet.locationId,
        actorSubject: packet.generatedBy,
        action: 'application.packet_failed',
        entityType: 'application_packet',
        entityId: args.packetId,
        after: { version: packet.version, error: 'The packet could not be stored within the workspace quota.' },
      });
      return null;
    }
    await ctx.db.patch(organization._id, { storedBytes: (organization.storedBytes ?? 0) + addedBytes, updatedAt: now });
    await ctx.db.patch(args.packetId, { status: 'prepared', errorMessage: undefined, pdfStorageId: args.pdfStorageId, zipStorageId: args.zipStorageId, generatedAt: now });
    await recordActivity(ctx, {
      organizationId: packet.organizationId,
      locationId: packet.locationId,
      actorSubject: packet.generatedBy,
      action: 'application.packet_prepared',
      entityType: 'application_packet',
      entityId: args.packetId,
      after: { version: packet.version, label: 'prepared, not filed' },
    });
    return null;
  },
});

export const failPacket = internalMutation({
  args: { packetId: v.id('applicationPackets'), message: v.string(), pdfStorageId: v.optional(v.id('_storage')), zipStorageId: v.optional(v.id('_storage')) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const packet = await ctx.db.get(args.packetId);
    if (!packet || packet.status !== 'generating') return null;
    if (args.pdfStorageId) await ctx.storage.delete(args.pdfStorageId);
    if (args.zipStorageId) await ctx.storage.delete(args.zipStorageId);
    await ctx.db.patch(args.packetId, { status: 'failed', errorMessage: args.message, generatedAt: Date.now() });
    await recordActivity(ctx, {
      organizationId: packet.organizationId,
      locationId: packet.locationId,
      actorSubject: packet.generatedBy,
      action: 'application.packet_failed',
      entityType: 'application_packet',
      entityId: args.packetId,
      after: { version: packet.version, error: args.message },
    });
    return null;
  },
});

export const getPacketDownloads = query({
  args: { packetId: v.id('applicationPackets') },
  returns: v.object({ status: v.union(v.literal('generating'), v.literal('prepared'), v.literal('failed')), version: v.number(), pdfUrl: v.union(v.null(), v.string()), zipUrl: v.union(v.null(), v.string()) }),
  handler: async (ctx, args) => {
    const packet = await ctx.db.get(args.packetId);
    if (!packet) throw new ConvexError({ code: 'NOT_FOUND', message: 'Packet not found.' });
    await requireLocation(ctx, packet.locationId);
    const [pdfUrl, zipUrl] = await Promise.all([
      packet.pdfStorageId ? ctx.storage.getUrl(packet.pdfStorageId) : null,
      packet.zipStorageId ? ctx.storage.getUrl(packet.zipStorageId) : null,
    ]);
    return { status: packet.status, version: packet.version, pdfUrl, zipUrl };
  },
});
