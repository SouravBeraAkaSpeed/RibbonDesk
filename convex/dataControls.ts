import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation, mutation, query } from './_generated/server';
import { ribbonAgent } from './assistant';
import { recordActivity, requireMembership } from './lib/permissions';

const domainValidator = v.union(
  v.literal('memberships'),
  v.literal('invitations'),
  v.literal('businesses'),
  v.literal('locations'),
  v.literal('researchRuns'),
  v.literal('sourceSnapshots'),
  v.literal('sourceChanges'),
  v.literal('requirements'),
  v.literal('requirementEdges'),
  v.literal('tasks'),
  v.literal('applications'),
  v.literal('applicationAnswers'),
  v.literal('applicationPackets'),
  v.literal('inspections'),
  v.literal('renewalCycles'),
  v.literal('documents'),
  v.literal('documentLinks'),
  v.literal('inboxBindings'),
  v.literal('caseMessages'),
  v.literal('outboundDrafts'),
  v.literal('sendApprovals'),
  v.literal('messageLinks'),
  v.literal('aiRuns'),
  v.literal('assistantThreads'),
  v.literal('proposals'),
  v.literal('notifications'),
  v.literal('notificationPreferences'),
  v.literal('activityEvents'),
  v.literal('usageMeters'),
);

export const exportMetadata = query({
  args: { organizationId: v.id('organizations') },
  returns: v.object({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
    formatVersion: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, 'owner');
    const organization = await ctx.db.get(args.organizationId);
    if (!organization)
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Organization not found.',
      });
    return {
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      formatVersion: 1,
    };
  },
});

export const exportPage = query({
  args: {
    organizationId: v.id('organizations'),
    domain: domainValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(v.any()),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, 'owner');
    const pageFor = async <T extends Parameters<typeof ctx.db.query>[0]>(
      table: T,
    ) =>
      await ctx.db
        .query(table)
        .withIndex('by_organizationId' as never, (index) =>
          index.eq('organizationId' as never, args.organizationId as never),
        )
        .paginate(args.paginationOpts);
    if (args.domain === 'memberships') {
      const page = await ctx.db
        .query('memberships')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .paginate(args.paginationOpts);
      return {
        ...page,
        page: await Promise.all(
          page.page.map(async (membership) => {
            const profile = await ctx.db
              .query('profiles')
              .withIndex('by_tokenIdentifier', (index) =>
                index.eq('tokenIdentifier', membership.userTokenIdentifier),
              )
              .unique();
            return {
              role: membership.role,
              status: membership.status,
              invitedBy: membership.invitedBy,
              createdAt: membership.createdAt,
              updatedAt: membership.updatedAt,
              profile: profile
                ? {
                    displayName: profile.displayName,
                    normalizedEmail: profile.normalizedEmail,
                  }
                : null,
            };
          }),
        ),
      };
    }
    if (args.domain === 'invitations') {
      const page = await ctx.db
        .query('invitations')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .paginate(args.paginationOpts);
      return {
        ...page,
        page: page.page.map(
          ({ tokenHash: _tokenHash, ...invitation }) => invitation,
        ),
      };
    }
    return await pageFor(args.domain);
  },
});

export const queueDeletion = mutation({
  args: { organizationId: v.id('organizations'), confirmationName: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requireMembership(
      ctx,
      args.organizationId,
      'owner',
    );
    const organization = await ctx.db.get(args.organizationId);
    if (!organization || organization.deletionStatus !== 'active')
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Organization is unavailable.',
      });
    if (args.confirmationName.trim() !== organization.name)
      throw new ConvexError({
        code: 'CONFIRMATION_MISMATCH',
        message: 'Type the exact workspace name to confirm deletion.',
      });
    const now = Date.now();
    await recordActivity(ctx, {
      organizationId: organization._id,
      actorSubject: identity.tokenIdentifier,
      action: 'organization.deletion_queued',
      entityType: 'organization',
      entityId: organization._id,
      before: { deletionStatus: organization.deletionStatus },
      after: { deletionStatus: 'queued' },
    });
    await ctx.db.patch(organization._id, {
      deletionStatus: 'queued',
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.dataControls.deleteBatch, {
      organizationId: organization._id,
    });
    return null;
  },
});

export const deleteBatch = internalMutation({
  args: { organizationId: v.id('organizations') },
  returns: v.number(),
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization || organization.deletionStatus === 'active') return 0;
    if (organization.deletionStatus === 'queued')
      await ctx.db.patch(organization._id, {
        deletionStatus: 'deleting',
        updatedAt: Date.now(),
      });
    const limit = 8;
    let deleted = 0;

    const snapshots = await ctx.db
      .query('sourceSnapshots')
      .withIndex('by_organizationId', (index) =>
        index.eq('organizationId', args.organizationId),
      )
      .take(limit);
    for (const item of snapshots) {
      if (item.storageId) await ctx.storage.delete(item.storageId);
      await ctx.db.delete(item._id);
      deleted += 1;
    }
    const documents = await ctx.db
      .query('documents')
      .withIndex('by_organizationId', (index) =>
        index.eq('organizationId', args.organizationId),
      )
      .take(limit);
    for (const item of documents) {
      await ctx.storage.delete(item.storageId);
      await ctx.db.delete(item._id);
      deleted += 1;
    }
    const packets = await ctx.db
      .query('applicationPackets')
      .withIndex('by_organizationId', (index) =>
        index.eq('organizationId', args.organizationId),
      )
      .take(limit);
    for (const item of packets) {
      if (item.pdfStorageId) await ctx.storage.delete(item.pdfStorageId);
      if (item.zipStorageId) await ctx.storage.delete(item.zipStorageId);
      await ctx.db.delete(item._id);
      deleted += 1;
    }
    const threads = await ctx.db
      .query('assistantThreads')
      .withIndex('by_organizationId', (index) =>
        index.eq('organizationId', args.organizationId),
      )
      .take(limit);
    for (const item of threads) {
      await ribbonAgent.deleteThreadAsync(ctx, {
        threadId: item.componentThreadId,
        pageSize: 50,
      });
      await ctx.db.delete(item._id);
      deleted += 1;
    }

    const batches = await Promise.all([
      ctx.db
        .query('invitations')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('businesses')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('locations')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('researchRuns')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('sourceChanges')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('requirements')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('requirementEdges')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('tasks')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('applications')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('applicationAnswers')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('inspections')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('renewalCycles')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('documentLinks')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('inboxBindings')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('caseMessages')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('outboundDrafts')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('sendApprovals')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('messageLinks')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('aiRuns')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('proposals')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('notifications')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('notificationPreferences')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('activityEvents')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('usageMeters')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
      ctx.db
        .query('memberships')
        .withIndex('by_organizationId', (index) =>
          index.eq('organizationId', args.organizationId),
        )
        .take(limit),
    ]);
    for (const batch of batches)
      for (const item of batch) {
        await ctx.db.delete(item._id);
        deleted += 1;
      }
    if (deleted)
      await ctx.scheduler.runAfter(
        100,
        internal.dataControls.deleteBatch,
        args,
      );
    else await ctx.db.delete(organization._id);
    return deleted;
  },
});
