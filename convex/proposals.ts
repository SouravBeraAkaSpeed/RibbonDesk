import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { z } from 'zod';

import { mutation, query } from './_generated/server';
import { recordActivity, requireLocation } from './lib/permissions';
import schema from './schema';

const requirementPayloadSchema = z.object({
  requirementType: z.string().min(2).max(80),
  agency: z.string().min(2).max(160),
  sourceUrl: z.url(),
  sourceTitle: z.string().min(2).max(200),
  feeMinCents: z.number().int().nonnegative().nullable().optional(),
  feeMaxCents: z.number().int().nonnegative().nullable().optional(),
  recurrenceRule: z.string().max(200).nullable().optional(),
  nextAction: z.string().min(3).max(300),
  unansweredQuestions: z.array(z.string().max(300)).max(8).default([]),
});

const editsValidator = v.optional(
  v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    requirementType: v.optional(v.string()),
    agency: v.optional(v.string()),
    nextAction: v.optional(v.string()),
    deadline: v.optional(v.number()),
  }),
);

export const list = query({
  args: {
    locationId: v.id('locations'),
    status: v.optional(v.union(v.literal('pending'), v.literal('accepted'), v.literal('edited'), v.literal('rejected'), v.literal('superseded'))),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(schema.doc('proposals')),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    if (args.status) {
      return await ctx.db
        .query('proposals')
        .withIndex('by_locationId_and_status', (index) => index.eq('locationId', args.locationId).eq('status', args.status!))
        .order('desc')
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query('proposals')
      .withIndex('by_locationId_and_createdAt', (index) => index.eq('locationId', args.locationId))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

export const acceptRequirement = mutation({
  args: {
    proposalId: v.id('proposals'),
    disposition: v.union(v.literal('start'), v.literal('not_applicable')),
    edits: editsValidator,
  },
  returns: v.id('requirements'),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.proposalType !== 'requirement') {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Requirement proposal not found.' });
    }
    const { identity, location } = await requireLocation(ctx, proposal.locationId, 'admin');
    if (proposal.status !== 'pending') {
      throw new ConvexError({ code: 'ALREADY_DECIDED', message: 'This proposal has already been reviewed.' });
    }

    const parsed = requirementPayloadSchema.safeParse(proposal.payload);
    if (!parsed.success) {
      throw new ConvexError({ code: 'INVALID_PROPOSAL', message: 'The proposal payload is incomplete and must be regenerated.' });
    }
    const payload = parsed.data;
    const sourceUrl = new URL(payload.sourceUrl);
    if (sourceUrl.protocol !== 'https:') {
      throw new ConvexError({ code: 'INVALID_SOURCE', message: 'Requirement sources must use HTTPS.' });
    }
    if (!proposal.citations.length) {
      throw new ConvexError({ code: 'CITATION_REQUIRED', message: 'A cited source is required before acceptance.' });
    }

    const sourceCitation = proposal.citations.find((citation) => citation.url === sourceUrl.href) ?? proposal.citations[0];
    const snapshot = sourceCitation.sourceSnapshotId ? await ctx.db.get(sourceCitation.sourceSnapshotId) : null;
    if (!snapshot || snapshot.locationId !== proposal.locationId || snapshot.organizationId !== proposal.organizationId) {
      throw new ConvexError({ code: 'INVALID_CITATION', message: 'The cited evidence does not belong to this location.' });
    }

    const title = args.edits?.title?.trim() || proposal.title.trim();
    const description = args.edits?.description?.trim() || proposal.summary.trim();
    const requirementType = args.edits?.requirementType?.trim() || payload.requirementType.trim();
    const agency = args.edits?.agency?.trim() || payload.agency.trim();
    const nextAction = args.edits?.nextAction?.trim() || payload.nextAction.trim();
    if (!title || !description || !requirementType || !agency || !nextAction) {
      throw new ConvexError({ code: 'INVALID_EDITS', message: 'Accepted requirements need a title, description, type, agency, and next action.' });
    }
    const feeMinCents = payload.feeMinCents ?? undefined;
    const feeMaxCents = payload.feeMaxCents ?? undefined;
    if (feeMinCents !== undefined && feeMaxCents !== undefined && feeMinCents > feeMaxCents) {
      throw new ConvexError({ code: 'INVALID_FEE_RANGE', message: 'The proposed fee range is invalid.' });
    }

    const now = Date.now();
    const status = args.disposition === 'not_applicable' ? 'not_applicable' : 'not_started';
    const matchingRequirements = await ctx.db
      .query('requirements')
      .withIndex('by_locationId_and_sourceUrl', (index) => index.eq('locationId', proposal.locationId).eq('sourceUrl', snapshot.url))
      .take(100);
    const existingRequirement = matchingRequirements.find((requirement) => requirement.title.trim().toLowerCase() === title.toLowerCase());
    if (existingRequirement) {
      const nextStatus = args.disposition === 'not_applicable'
        ? 'not_applicable' as const
        : ['proposed', 'conflicted'].includes(existingRequirement.status)
          ? 'not_started' as const
          : existingRequirement.status;
      await ctx.db.patch(existingRequirement._id, {
        description,
        requirementType,
        status: nextStatus,
        agency,
        sourceSnapshotId: snapshot._id,
        sourceTitle: snapshot.title,
        officialSource: snapshot.official,
        confidence: proposal.confidence,
        capturedAt: snapshot.capturedAt,
        lastVerifiedAt: snapshot.lastVerifiedAt,
        feeMinCents,
        feeMaxCents,
        recurrenceRule: payload.recurrenceRule ?? undefined,
        confirmedBy: identity.tokenIdentifier,
        confirmedAt: now,
        notes: payload.unansweredQuestions.length ? `Review questions: ${payload.unansweredQuestions.join(' | ')}` : existingRequirement.notes,
        updatedAt: now,
      });
      await ctx.db.patch(args.proposalId, { status: 'superseded', decidedBy: identity.tokenIdentifier, decidedAt: now, updatedAt: now });
      const existingTask = (await ctx.db.query('tasks').withIndex('by_requirementId', (index) => index.eq('requirementId', existingRequirement._id)).take(100))
        .find((task) => !['completed', 'cancelled'].includes(task.status));
      if (!existingTask && args.disposition === 'start') {
        await ctx.db.insert('tasks', {
          organizationId: location.organizationId,
          locationId: proposal.locationId,
          requirementId: existingRequirement._id,
          title: nextAction,
          description: `Created after human re-confirmation of “${title}”.`,
          status: 'not_started',
          priority: args.edits?.deadline ? 'high' : 'normal',
          dueAt: args.edits?.deadline,
          createdBy: identity.tokenIdentifier,
          createdAt: now,
          updatedAt: now,
        });
      }
      await recordActivity(ctx, {
        organizationId: location.organizationId,
        locationId: proposal.locationId,
        actorSubject: identity.tokenIdentifier,
        action: 'proposal.reconfirmed_existing_requirement',
        entityType: 'proposal',
        entityId: args.proposalId,
        before: { status: proposal.status, requirementId: existingRequirement._id },
        after: { status: 'superseded', requirementId: existingRequirement._id, disposition: args.disposition },
        evidence: proposal.citations.map((citation) => ({ kind: 'source_snapshot', id: String(citation.sourceSnapshotId ?? citation.url) })),
      });
      return existingRequirement._id;
    }
    const requirementId = await ctx.db.insert('requirements', {
      organizationId: location.organizationId,
      locationId: proposal.locationId,
      title,
      description,
      requirementType,
      status,
      agency,
      sourceSnapshotId: snapshot._id,
      sourceUrl: snapshot.url,
      sourceTitle: snapshot.title,
      officialSource: snapshot.official,
      confidence: proposal.confidence,
      capturedAt: snapshot.capturedAt,
      lastVerifiedAt: snapshot.lastVerifiedAt,
      deadline: args.edits?.deadline,
      feeMinCents,
      feeMaxCents,
      recurrenceRule: payload.recurrenceRule ?? undefined,
      confirmedBy: identity.tokenIdentifier,
      confirmedAt: now,
      notes: payload.unansweredQuestions.length ? `Review questions: ${payload.unansweredQuestions.join(' | ')}` : undefined,
      createdAt: now,
      updatedAt: now,
    });

    let taskId: string | undefined;
    if (args.disposition === 'start') {
      taskId = await ctx.db.insert('tasks', {
        organizationId: location.organizationId,
        locationId: proposal.locationId,
        requirementId,
        title: nextAction,
        description: `Created after human approval of “${title}”.`,
        status: 'not_started',
        priority: args.edits?.deadline ? 'high' : 'normal',
        dueAt: args.edits?.deadline,
        createdBy: identity.tokenIdentifier,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.proposalId, {
      status: args.edits ? 'edited' : 'accepted',
      decidedBy: identity.tokenIdentifier,
      decidedAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: proposal.locationId,
      actorSubject: identity.tokenIdentifier,
      action: args.disposition === 'not_applicable' ? 'proposal.marked_not_applicable' : 'proposal.accepted',
      entityType: 'proposal',
      entityId: args.proposalId,
      before: { status: proposal.status },
      after: { status: args.edits ? 'edited' : 'accepted', requirementId, taskId, disposition: args.disposition },
      evidence: proposal.citations.map((citation) => ({ kind: 'source_snapshot', id: String(citation.sourceSnapshotId ?? citation.url) })),
    });
    return requirementId;
  },
});

export const reject = mutation({
  args: { proposalId: v.id('proposals'), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError({ code: 'NOT_FOUND', message: 'Proposal not found.' });
    const { identity, location } = await requireLocation(ctx, proposal.locationId, 'admin');
    if (proposal.status !== 'pending') {
      throw new ConvexError({ code: 'ALREADY_DECIDED', message: 'This proposal has already been reviewed.' });
    }
    const now = Date.now();
    await ctx.db.patch(args.proposalId, {
      status: 'rejected',
      decidedBy: identity.tokenIdentifier,
      decidedAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: proposal.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'proposal.rejected',
      entityType: 'proposal',
      entityId: args.proposalId,
      before: { status: proposal.status },
      after: { status: 'rejected', reason: args.reason?.trim() || undefined },
      evidence: proposal.citations.map((citation) => ({ kind: 'source_snapshot', id: String(citation.sourceSnapshotId ?? citation.url) })),
    });
    return null;
  },
});
