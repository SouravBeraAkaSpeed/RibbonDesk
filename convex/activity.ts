import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { v } from 'convex/values';

import { query } from './_generated/server';
import { requireLocation, requireMembership } from './lib/permissions';
import schema from './schema';

export const listByOrganization = query({
  args: { organizationId: v.id('organizations'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc('activityEvents')),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    return await ctx.db
      .query('activityEvents')
      .withIndex('by_organizationId_and_createdAt', (query) => query.eq('organizationId', args.organizationId))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

export const listByLocation = query({
  args: { locationId: v.id('locations'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc('activityEvents')),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    return await ctx.db
      .query('activityEvents')
      .withIndex('by_locationId_and_createdAt', (query) => query.eq('locationId', args.locationId))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});
