import { v } from 'convex/values';

import { query } from './_generated/server';
import { requireLocation } from './lib/permissions';

export const getCommandCenter = query({
  args: { locationId: v.id('locations') },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { membership, location } = await requireLocation(ctx, args.locationId);
    const [requirements, openTasks, pendingProposals, unreadNotifications, recentActivity] = await Promise.all([
      ctx.db.query('requirements').withIndex('by_locationId_and_createdAt', (query) => query.eq('locationId', args.locationId)).take(250),
      ctx.db.query('tasks').withIndex('by_locationId_and_status', (query) => query.eq('locationId', args.locationId).eq('status', 'not_started')).take(50),
      ctx.db.query('proposals').withIndex('by_locationId_and_status', (query) => query.eq('locationId', args.locationId).eq('status', 'pending')).take(25),
      ctx.db.query('notifications').withIndex('by_userTokenIdentifier_and_readAt', (query) => query.eq('userTokenIdentifier', membership.userTokenIdentifier).eq('readAt', undefined)).take(25),
      ctx.db.query('activityEvents').withIndex('by_locationId_and_createdAt', (query) => query.eq('locationId', args.locationId)).order('desc').take(20),
    ]);

    const confirmed = requirements.filter((requirement) => requirement.status !== 'proposed' && requirement.status !== 'conflicted');
    const complete = confirmed.filter((requirement) => ['approved', 'completed', 'not_applicable'].includes(requirement.status));
    const readiness = confirmed.length === 0 ? 0 : Math.round((complete.length / confirmed.length) * 100);
    const blockers = confirmed.filter((requirement) => ['needs_attention', 'conflicted'].includes(requirement.status)).length;

    return {
      location,
      role: membership.role,
      readiness,
      blockers,
      counts: {
        confirmedRequirements: confirmed.length,
        openTasks: openTasks.length,
        pendingProposals: pendingProposals.length,
        unreadNotifications: unreadNotifications.length,
      },
      today: openTasks.sort((left, right) => {
        const priority = { blocking: 0, high: 1, normal: 2, low: 3 } as const;
        return priority[left.priority] - priority[right.priority] || (left.dueAt ?? Number.MAX_SAFE_INTEGER) - (right.dueAt ?? Number.MAX_SAFE_INTEGER);
      }),
      pendingProposals,
      recentActivity,
      truncated: requirements.length === 250 || openTasks.length === 50,
    };
  },
});
