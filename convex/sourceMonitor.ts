import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import { recordActivity, requireLocation } from './lib/permissions';
import { proposalStatusValidator } from './lib/validators';
import schema from './schema';

const changeWithEvidenceValidator = v.object({
  change: schema.doc('sourceChanges'),
  before: schema.doc('sourceSnapshots'),
  after: schema.doc('sourceSnapshots'),
});

function mode(): 'replay' | 'live' {
  return process.env.RIBBONDESK_PROVIDER_MODE === 'live' ? 'live' : 'replay';
}

async function findPendingProposal(
  ctx: Parameters<typeof requireLocation>[0],
  locationId: Id<'locations'>,
  sourceChangeId: Id<'sourceChanges'>,
) {
  const proposals = await ctx.db
    .query('proposals')
    .withIndex('by_locationId_and_type_and_status', (index) =>
      index
        .eq('locationId', locationId)
        .eq('proposalType', 'source_change')
        .eq('status', 'pending'),
    )
    .take(100);
  return proposals.find((proposal) => {
    const payload =
      proposal.payload && typeof proposal.payload === 'object'
        ? (proposal.payload as Record<string, unknown>)
        : {};
    return payload.sourceChangeId === sourceChangeId;
  });
}

export const getSetup = query({
  args: { locationId: v.id('locations') },
  returns: v.object({
    providerMode: v.union(v.literal('replay'), v.literal('live')),
    lastSourceCheckAt: v.optional(v.number()),
    nextSourceCheckAt: v.optional(v.number()),
    lifecycleStage: v.string(),
  }),
  handler: async (ctx, args) => {
    const { location } = await requireLocation(ctx, args.locationId);
    return {
      providerMode: mode(),
      lastSourceCheckAt: location.lastSourceCheckAt,
      nextSourceCheckAt: location.nextSourceCheckAt,
      lifecycleStage: location.lifecycleStage,
    };
  },
});

export const listChanges = query({
  args: {
    locationId: v.id('locations'),
    status: v.optional(proposalStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(changeWithEvidenceValidator),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    const result = args.status
      ? await ctx.db
          .query('sourceChanges')
          .withIndex('by_locationId_and_status', (index) =>
            index.eq('locationId', args.locationId).eq('status', args.status!),
          )
          .order('desc')
          .paginate(args.paginationOpts)
      : await ctx.db
          .query('sourceChanges')
          .withIndex('by_locationId_and_detectedAt', (index) =>
            index.eq('locationId', args.locationId),
          )
          .order('desc')
          .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (change) => {
        const [before, after] = await Promise.all([
          ctx.db.get(change.beforeSnapshotId),
          ctx.db.get(change.afterSnapshotId),
        ]);
        if (
          !before ||
          !after ||
          before.locationId !== args.locationId ||
          after.locationId !== args.locationId
        ) {
          throw new ConvexError({
            code: 'INVALID_EVIDENCE',
            message: 'Source change evidence is incomplete.',
          });
        }
        return { change, before, after };
      }),
    );
    return { ...result, page };
  },
});

export const simulateReplayChange = mutation({
  args: { locationId: v.id('locations') },
  returns: v.id('sourceChanges'),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(
      ctx,
      args.locationId,
      'admin',
    );
    if (mode() !== 'replay') {
      throw new ConvexError({
        code: 'REPLAY_ONLY',
        message: 'Synthetic source changes are available only in replay mode.',
      });
    }
    const existing = await ctx.db
      .query('sourceChanges')
      .withIndex('by_locationId_and_status', (index) =>
        index.eq('locationId', args.locationId).eq('status', 'pending'),
      )
      .first();
    if (existing) return existing._id;
    const before = await ctx.db
      .query('sourceSnapshots')
      .withIndex('by_locationId_and_capturedAt', (index) =>
        index.eq('locationId', args.locationId),
      )
      .order('desc')
      .first();
    if (!before)
      throw new ConvexError({
        code: 'SOURCE_REQUIRED',
        message: 'Run cited research before previewing a source change.',
      });
    const now = Date.now();
    const afterExcerpt = `${before.excerpt ?? before.title} The replay capture adds a clarification that must be reviewed before changing the compliance record.`;
    const afterSnapshotId = await ctx.db.insert('sourceSnapshots', {
      organizationId: location.organizationId,
      locationId: location._id,
      url: before.url,
      hostname: before.hostname,
      title: before.title,
      agency: before.agency,
      official: before.official,
      contentHash: `${before.contentHash}:safe-replay:${now}`,
      excerpt: afterExcerpt.slice(0, 600),
      truncated: false,
      capturedAt: now,
      lastVerifiedAt: now,
    });
    const summary = `${before.title} has a newly captured clarification. Review the evidence before updating any requirement.`;
    const sourceChangeId = await ctx.db.insert('sourceChanges', {
      organizationId: location.organizationId,
      locationId: location._id,
      beforeSnapshotId: before._id,
      afterSnapshotId,
      status: 'pending',
      significance: 'medium',
      summary,
      detectedAt: now,
    });
    await ctx.db.insert('proposals', {
      organizationId: location.organizationId,
      locationId: location._id,
      proposalType: 'source_change',
      status: 'pending',
      title: `${before.title} changed`,
      summary,
      payload: {
        sourceChangeId,
        beforeSnapshotId: before._id,
        afterSnapshotId,
      },
      confidence: 'medium',
      citations: [
        {
          sourceSnapshotId: before._id,
          url: before.url,
          title: `${before.title} — previous capture`,
          excerpt: before.excerpt,
        },
        {
          sourceSnapshotId: afterSnapshotId,
          url: before.url,
          title: `${before.title} — replay capture`,
          excerpt: afterExcerpt.slice(0, 300),
        },
      ],
      requiresOwnerApproval: true,
      createdAt: now,
      updatedAt: now,
    });
    const members = await ctx.db
      .query('memberships')
      .withIndex('by_organizationId', (index) =>
        index.eq('organizationId', location.organizationId),
      )
      .take(100);
    for (const member of members) {
      if (member.status !== 'active') continue;
      await ctx.db.insert('notifications', {
        organizationId: location.organizationId,
        userTokenIdentifier: member.userTokenIdentifier,
        locationId: location._id,
        kind: 'source_change',
        title: 'Official source changed',
        body: 'A safe replay created before/after evidence for human review.',
        urgency: 'urgent',
        dedupeKey: `source-change:${sourceChangeId}:${member.userTokenIdentifier}`,
        createdAt: now,
      });
    }
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: location._id,
      actorSubject: identity.tokenIdentifier,
      action: 'source_change.replay_detected',
      entityType: 'source_change',
      entityId: sourceChangeId,
      after: { status: 'pending', significance: 'medium' },
      evidence: [
        { kind: 'source_snapshot', id: before._id },
        { kind: 'source_snapshot', id: afterSnapshotId },
      ],
    });
    return sourceChangeId;
  },
});

export const acceptChange = mutation({
  args: { sourceChangeId: v.id('sourceChanges') },
  returns: v.id('tasks'),
  handler: async (ctx, args) => {
    const change = await ctx.db.get(args.sourceChangeId);
    if (!change)
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Source change not found.',
      });
    const { identity, location } = await requireLocation(
      ctx,
      change.locationId,
      'admin',
    );
    if (change.status !== 'pending')
      throw new ConvexError({
        code: 'ALREADY_DECIDED',
        message: 'This source change has already been reviewed.',
      });
    const [before, after] = await Promise.all([
      ctx.db.get(change.beforeSnapshotId),
      ctx.db.get(change.afterSnapshotId),
    ]);
    if (
      !before ||
      !after ||
      before.locationId !== location._id ||
      after.locationId !== location._id ||
      before.url !== after.url
    ) {
      throw new ConvexError({
        code: 'INVALID_EVIDENCE',
        message: 'The before/after evidence does not belong to this location.',
      });
    }
    const now = Date.now();
    const requirements = await ctx.db
      .query('requirements')
      .withIndex('by_locationId_and_sourceUrl', (index) =>
        index.eq('locationId', location._id).eq('sourceUrl', after.url),
      )
      .take(100);
    for (const requirement of requirements) {
      if (requirement.status === 'not_applicable') continue;
      const note = `Official source change accepted for review on ${new Date(now).toISOString().slice(0, 10)}. Reconfirm this requirement against the latest capture.`;
      await ctx.db.patch(requirement._id, {
        status: 'needs_attention',
        sourceSnapshotId: after._id,
        notes: requirement.notes ? `${requirement.notes}\n${note}` : note,
        updatedAt: now,
      });
    }
    const taskId = await ctx.db.insert('tasks', {
      organizationId: location.organizationId,
      locationId: location._id,
      title: `Review official source change: ${after.title}`,
      description: `${requirements.length} linked requirement${requirements.length === 1 ? '' : 's'} may need reconfirmation. Compare the preserved evidence before editing compliance state.`,
      status: 'not_started',
      priority: 'blocking',
      createdBy: identity.tokenIdentifier,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(change._id, {
      status: 'accepted',
      decidedAt: now,
      decidedBy: identity.tokenIdentifier,
    });
    const proposal = await findPendingProposal(ctx, location._id, change._id);
    if (proposal)
      await ctx.db.patch(proposal._id, {
        status: 'accepted',
        decidedAt: now,
        decidedBy: identity.tokenIdentifier,
        updatedAt: now,
      });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: location._id,
      actorSubject: identity.tokenIdentifier,
      action: 'source_change.accepted_for_review',
      entityType: 'source_change',
      entityId: change._id,
      before: { status: change.status },
      after: {
        status: 'accepted',
        linkedRequirements: requirements.length,
        taskId,
      },
      evidence: [
        { kind: 'source_snapshot', id: before._id },
        { kind: 'source_snapshot', id: after._id },
      ],
    });
    return taskId;
  },
});

export const rejectChange = mutation({
  args: { sourceChangeId: v.id('sourceChanges') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const change = await ctx.db.get(args.sourceChangeId);
    if (!change)
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Source change not found.',
      });
    const { identity, location } = await requireLocation(
      ctx,
      change.locationId,
      'admin',
    );
    if (change.status !== 'pending')
      throw new ConvexError({
        code: 'ALREADY_DECIDED',
        message: 'This source change has already been reviewed.',
      });
    const now = Date.now();
    await ctx.db.patch(change._id, {
      status: 'rejected',
      decidedAt: now,
      decidedBy: identity.tokenIdentifier,
    });
    const proposal = await findPendingProposal(ctx, location._id, change._id);
    if (proposal)
      await ctx.db.patch(proposal._id, {
        status: 'rejected',
        decidedAt: now,
        decidedBy: identity.tokenIdentifier,
        updatedAt: now,
      });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: location._id,
      actorSubject: identity.tokenIdentifier,
      action: 'source_change.rejected',
      entityType: 'source_change',
      entityId: change._id,
      before: { status: change.status },
      after: { status: 'rejected', requirementsChanged: false },
      evidence: [
        { kind: 'source_snapshot', id: change.beforeSnapshotId },
        { kind: 'source_snapshot', id: change.afterSnapshotId },
      ],
    });
    return null;
  },
});

export const queueDueSourceRefreshes = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query('locations')
      .withIndex('by_nextSourceCheckAt', (index) =>
        index.lte('nextSourceCheckAt', now),
      )
      .take(25);
    let queued = 0;
    for (const location of due) {
      if (
        location.jurisdictionStatus !== 'confirmed' ||
        location.coverageMode === 'unselected' ||
        ['paused', 'closed'].includes(location.lifecycleStage)
      )
        continue;
      const activeRuns: Array<Doc<'researchRuns'>> = [];
      for (const status of ['queued', 'running'] as const) {
        const active = await ctx.db
          .query('researchRuns')
          .withIndex('by_locationId_and_status', (index) =>
            index.eq('locationId', location._id).eq('status', status),
          )
          .first();
        if (active) activeRuns.push(active);
      }
      if (activeRuns.length) {
        await ctx.db.patch(location._id, {
          nextSourceCheckAt: now + 24 * 60 * 60 * 1_000,
          updatedAt: now,
        });
        continue;
      }
      const periodKey = new Date(now).toISOString().slice(0, 10);
      const usage = await ctx.db
        .query('usageMeters')
        .withIndex('by_organizationId_and_periodKey', (index) =>
          index
            .eq('organizationId', location.organizationId)
            .eq('periodKey', periodKey),
        )
        .unique();
      if ((usage?.researchRuns ?? 0) >= 3) {
        await ctx.db.patch(location._id, {
          nextSourceCheckAt: now + 24 * 60 * 60 * 1_000,
          updatedAt: now,
        });
        continue;
      }
      if (usage)
        await ctx.db.patch(usage._id, {
          researchRuns: usage.researchRuns + 1,
          updatedAt: now,
        });
      else
        await ctx.db.insert('usageMeters', {
          organizationId: location.organizationId,
          periodKey,
          researchRuns: 1,
          aiOperations: 0,
          approvedSends: 0,
          storedBytes: 0,
          updatedAt: now,
        });
      const researchRunId = await ctx.db.insert('researchRuns', {
        organizationId: location.organizationId,
        locationId: location._id,
        initiatedBy: 'system:source-monitor',
        mode: 'source_refresh',
        providerMode: mode(),
        status: 'queued',
        processedSources: 0,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(location._id, {
        lastSourceCheckAt: now,
        nextSourceCheckAt:
          now +
          (location.lifecycleStage === 'operating' ? 30 : 7) *
            24 *
            60 *
            60 *
            1_000,
        updatedAt: now,
      });
      await recordActivity(ctx, {
        organizationId: location.organizationId,
        locationId: location._id,
        actorSubject: 'system:source-monitor',
        action: 'source_refresh.queued',
        entityType: 'research_run',
        entityId: researchRunId,
        after: {
          cadenceDays: location.lifecycleStage === 'operating' ? 30 : 7,
          providerMode: mode(),
        },
      });
      await ctx.scheduler.runAfter(0, internal.research.processRun, {
        researchRunId,
      });
      queued += 1;
    }
    return queued;
  },
});
