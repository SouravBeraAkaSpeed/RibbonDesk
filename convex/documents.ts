import JSZip from 'jszip';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { recordActivity, requireLocation } from './lib/permissions';
import schema from './schema';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ORGANIZATION_BYTES = 100 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function safeFileName(value: string) {
  return value
    .split(String.fromCharCode(0))
    .join('')
    .replace(/[\\/]+/g, '-')
    .trim()
    .slice(0, 180);
}

export const generateUploadUrl = mutation({
  args: { locationId: v.id('locations') },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { location } = await requireLocation(ctx, args.locationId, 'contributor');
    const organization = await ctx.db.get(location.organizationId);
    if (!organization || organization.deletionStatus !== 'active') {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Organization not found.' });
    }
    if ((organization.storedBytes ?? 0) >= MAX_ORGANIZATION_BYTES) {
      throw new ConvexError({ code: 'STORAGE_QUOTA', message: 'This workspace has reached its 100 MB document quota.' });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveUpload = mutation({
  args: {
    locationId: v.id('locations'),
    storageId: v.id('_storage'),
    fileName: v.string(),
  },
  returns: v.object({ documentId: v.id('documents'), status: v.union(v.literal('processing'), v.literal('rejected')), reason: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(ctx, args.locationId, 'contributor');
    const existing = await ctx.db.query('documents').withIndex('by_storageId', (index) => index.eq('storageId', args.storageId)).unique();
    if (existing) {
      if (existing.locationId !== args.locationId || existing.organizationId !== location.organizationId) {
        throw new ConvexError({ code: 'INVALID_UPLOAD', message: 'This upload reference is not available in the selected location.' });
      }
      const existingStatus: 'processing' | 'rejected' = existing.status === 'rejected' ? 'rejected' : 'processing';
      return { documentId: existing._id, status: existingStatus, reason: existing.status === 'rejected' ? 'This upload was rejected during validation.' : undefined };
    }

    const metadata = await ctx.db.system.get('_storage', args.storageId);
    if (!metadata) throw new ConvexError({ code: 'UPLOAD_NOT_FOUND', message: 'The uploaded file could not be found.' });
    const organization = await ctx.db.get(location.organizationId);
    if (!organization) throw new ConvexError({ code: 'NOT_FOUND', message: 'Organization not found.' });
    const fileName = safeFileName(args.fileName) || 'untitled-file';
    const contentType = metadata.contentType?.toLowerCase() ?? 'application/octet-stream';
    const typeAllowed = ALLOWED_CONTENT_TYPES.has(contentType);
    const withinFileLimit = metadata.size > 0 && metadata.size <= MAX_FILE_BYTES;
    const withinOrganizationLimit = (organization.storedBytes ?? 0) + metadata.size <= MAX_ORGANIZATION_BYTES;
    const accepted = typeAllowed && withinFileLimit && withinOrganizationLimit;
    const resultStatus: 'processing' | 'rejected' = accepted ? 'processing' : 'rejected';
    const reason = !typeAllowed
      ? 'This file type is not allowed. Upload PDF, DOCX, TXT, PNG, or JPEG evidence.'
      : !withinFileLimit
        ? 'Files must be no larger than 10 MB.'
        : !withinOrganizationLimit
          ? 'This workspace would exceed its 100 MB document quota.'
          : undefined;
    const now = Date.now();
    const documentId = await ctx.db.insert('documents', {
      organizationId: location.organizationId,
      locationId: args.locationId,
      storageId: args.storageId,
      fileName,
      contentType,
      sizeBytes: metadata.size,
      status: resultStatus,
      rejectionReason: accepted ? undefined : reason,
      uploadedBy: identity.tokenIdentifier,
      createdAt: now,
      updatedAt: now,
    });
    if (accepted) {
      await ctx.db.patch(location.organizationId, { storedBytes: (organization.storedBytes ?? 0) + metadata.size, updatedAt: now });
      await ctx.scheduler.runAfter(0, internal.documents.processUpload, { documentId });
    } else {
      await ctx.storage.delete(args.storageId);
    }
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: args.locationId,
      actorSubject: identity.tokenIdentifier,
      action: accepted ? 'document.uploaded' : 'document.rejected',
      entityType: 'document',
      entityId: documentId,
      after: { fileName, contentType, sizeBytes: metadata.size, status: resultStatus, reason },
    });
    return { documentId, status: resultStatus, reason };
  },
});

export const getProcessingContext = internalQuery({
  args: { documentId: v.id('documents') },
  returns: v.union(v.null(), v.object({ document: schema.doc('documents'), url: v.string() })),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document || document.status !== 'processing') return null;
    const url = await ctx.storage.getUrl(document.storageId);
    return url ? { document, url } : null;
  },
});

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

async function inspectFile(contentType: string, bytes: Uint8Array) {
  if (contentType === 'application/pdf') {
    if (!hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'The file content does not match a PDF.';
    const text = new TextDecoder().decode(bytes).toLowerCase();
    if (text.includes('/javascript') || text.includes('/launch') || text.includes('/embeddedfile')) {
      return 'PDFs containing active scripts, launch actions, or embedded files are not allowed.';
    }
    return null;
  }
  if (contentType === 'image/png') return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ? null : 'The file content does not match a PNG image.';
  if (contentType === 'image/jpeg') return hasPrefix(bytes, [0xff, 0xd8, 0xff]) ? null : 'The file content does not match a JPEG image.';
  if (contentType === 'text/plain') {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return text.includes(String.fromCharCode(0)) ? 'Text evidence cannot contain binary control data.' : null;
    } catch {
      return 'Text evidence must be valid UTF-8.';
    }
  }
  if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    if (!hasPrefix(bytes, [0x50, 0x4b])) return 'The file content does not match a DOCX document.';
    try {
      const archive = await JSZip.loadAsync(bytes);
      const names = Object.keys(archive.files).map((name) => name.toLowerCase());
      if (!names.includes('[content_types].xml') || !names.includes('word/document.xml')) return 'The uploaded archive is not a valid DOCX document.';
      if (names.some((name) => name.includes('vbaproject') || name.includes('/activex/') || /\.(exe|dll|js|vbs|bat|cmd|ps1)$/.test(name))) {
        return 'DOCX files containing macros, active controls, scripts, or executables are not allowed.';
      }
      if (names.length > 500) return 'This DOCX contains too many embedded parts to review safely.';
      return null;
    } catch {
      return 'The DOCX archive could not be validated.';
    }
  }
  return 'This file type is not supported.';
}

export const processUpload = internalAction({
  args: { documentId: v.id('documents') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.documents.getProcessingContext, args);
    if (!context) return null;
    try {
      const response = await fetch(context.url);
      if (!response.ok) throw new Error('The uploaded file could not be read for safety checks.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength !== context.document.sizeBytes) throw new Error('The uploaded file size changed during processing.');
      const reason = await inspectFile(context.document.contentType, bytes);
      await ctx.runMutation(internal.documents.completeProcessing, { documentId: args.documentId, accepted: reason === null, reason: reason ?? undefined });
    } catch (error) {
      await ctx.runMutation(internal.documents.completeProcessing, {
        documentId: args.documentId,
        accepted: false,
        reason: error instanceof Error ? error.message.slice(0, 300) : 'File safety checks failed.',
      });
    }
    return null;
  },
});

export const completeProcessing = internalMutation({
  args: { documentId: v.id('documents'), accepted: v.boolean(), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document || document.status !== 'processing') return null;
    const now = Date.now();
    if (args.accepted) {
      await ctx.db.patch(args.documentId, { status: 'needs_review', rejectionReason: undefined, updatedAt: now });
    } else {
      const organization = await ctx.db.get(document.organizationId);
      await ctx.storage.delete(document.storageId);
      await ctx.db.patch(args.documentId, { status: 'rejected', rejectionReason: args.reason ?? 'File safety checks failed.', updatedAt: now });
      if (organization) await ctx.db.patch(organization._id, { storedBytes: Math.max(0, (organization.storedBytes ?? 0) - document.sizeBytes), updatedAt: now });
    }
    await recordActivity(ctx, {
      organizationId: document.organizationId,
      locationId: document.locationId,
      actorSubject: document.uploadedBy,
      action: args.accepted ? 'document.safety_checks_passed' : 'document.safety_checks_failed',
      entityType: 'document',
      entityId: args.documentId,
      before: { status: document.status },
      after: { status: args.accepted ? 'needs_review' : 'rejected', reason: args.reason },
    });
    return null;
  },
});

export const confirm = mutation({
  args: { documentId: v.id('documents'), classification: v.string(), expiresAt: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new ConvexError({ code: 'NOT_FOUND', message: 'Document not found.' });
    const { identity } = await requireLocation(ctx, document.locationId, 'contributor');
    if (document.status !== 'needs_review') throw new ConvexError({ code: 'REVIEW_NOT_READY', message: 'Wait for file safety checks before confirming this document.' });
    const classification = args.classification.trim();
    if (classification.length < 2 || classification.length > 80) {
      throw new ConvexError({ code: 'INVALID_CLASSIFICATION', message: 'Add a short document type, such as permit receipt or insurance certificate.' });
    }
    const patch = { classification, expiresAt: args.expiresAt, status: 'ready' as const, updatedAt: Date.now() };
    await ctx.db.patch(args.documentId, patch);
    await recordActivity(ctx, {
      organizationId: document.organizationId,
      locationId: document.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'document.confirmed',
      entityType: 'document',
      entityId: args.documentId,
      before: { classification: document.classification, expiresAt: document.expiresAt, status: document.status },
      after: patch,
    });
    return null;
  },
});

export const link = mutation({
  args: {
    documentId: v.id('documents'),
    requirementId: v.optional(v.id('requirements')),
    applicationId: v.optional(v.id('applications')),
    linkType: v.union(v.literal('evidence'), v.literal('attachment'), v.literal('receipt'), v.literal('outcome')),
  },
  returns: v.id('documentLinks'),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new ConvexError({ code: 'NOT_FOUND', message: 'Document not found.' });
    const { identity } = await requireLocation(ctx, document.locationId, 'contributor');
    if (document.status !== 'ready') throw new ConvexError({ code: 'REVIEW_REQUIRED', message: 'Confirm the document type before linking it.' });
    if ((!args.requirementId && !args.applicationId) || (args.requirementId && args.applicationId)) {
      throw new ConvexError({ code: 'TARGET_REQUIRED', message: 'Choose exactly one requirement or application for this document.' });
    }
    if (args.requirementId) {
      const requirement = await ctx.db.get(args.requirementId);
      if (!requirement || requirement.locationId !== document.locationId) throw new ConvexError({ code: 'INVALID_TARGET', message: 'Requirement not found in this location.' });
    }
    if (args.applicationId) {
      const application = await ctx.db.get(args.applicationId);
      if (!application || application.locationId !== document.locationId) throw new ConvexError({ code: 'INVALID_TARGET', message: 'Application not found in this location.' });
    }
    const existing = await ctx.db.query('documentLinks').withIndex('by_documentId', (index) => index.eq('documentId', args.documentId)).take(100);
    const duplicate = existing.find((item) => item.requirementId === args.requirementId && item.applicationId === args.applicationId && item.linkType === args.linkType);
    if (duplicate) return duplicate._id;
    const linkId = await ctx.db.insert('documentLinks', {
      organizationId: document.organizationId,
      documentId: args.documentId,
      requirementId: args.requirementId,
      applicationId: args.applicationId,
      linkType: args.linkType,
      createdBy: identity.tokenIdentifier,
      createdAt: Date.now(),
    });
    await recordActivity(ctx, {
      organizationId: document.organizationId,
      locationId: document.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'document.linked',
      entityType: 'document_link',
      entityId: linkId,
      after: { documentId: args.documentId, requirementId: args.requirementId, applicationId: args.applicationId, linkType: args.linkType },
    });
    return linkId;
  },
});

export const list = query({
  args: { locationId: v.id('locations'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc('documents')),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    return await ctx.db.query('documents').withIndex('by_locationId_and_createdAt', (index) => index.eq('locationId', args.locationId)).order('desc').paginate(args.paginationOpts);
  },
});

export const getDownloadUrl = query({
  args: { documentId: v.id('documents') },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new ConvexError({ code: 'NOT_FOUND', message: 'Document not found.' });
    await requireLocation(ctx, document.locationId);
    if (!['needs_review', 'ready'].includes(document.status)) return null;
    return await ctx.storage.getUrl(document.storageId);
  },
});
