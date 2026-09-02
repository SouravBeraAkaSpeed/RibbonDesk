import { v } from 'convex/values';

import { internalMutation } from './_generated/server';

const DAILY_AI_LIMIT = 25;

export const reserveAi = internalMutation({
  args: { organizationId: v.id('organizations'), count: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const count = Math.max(1, Math.min(10, Math.floor(args.count)));
    const now = Date.now();
    const periodKey = new Date(now).toISOString().slice(0, 10);
    const usage = await ctx.db
      .query('usageMeters')
      .withIndex('by_organizationId_and_periodKey', (index) =>
        index
          .eq('organizationId', args.organizationId)
          .eq('periodKey', periodKey),
      )
      .unique();
    if ((usage?.aiOperations ?? 0) + count > DAILY_AI_LIMIT) return false;
    if (usage) {
      await ctx.db.patch(usage._id, {
        aiOperations: usage.aiOperations + count,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('usageMeters', {
        organizationId: args.organizationId,
        periodKey,
        researchRuns: 0,
        aiOperations: count,
        approvedSends: 0,
        storedBytes: 0,
        updatedAt: now,
      });
    }
    return true;
  },
});
