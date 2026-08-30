import { ConvexError } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

export type Role = 'owner' | 'admin' | 'contributor' | 'viewer';

const roleRank: Record<Role, number> = {
  viewer: 0,
  contributor: 1,
  admin: 2,
  owner: 3,
};

export async function requireIdentity(ctx: Pick<QueryCtx | MutationCtx, 'auth'>) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'Sign in to continue.' });
  }
  return identity;
}

export async function requireMembership(
  ctx: Pick<QueryCtx | MutationCtx, 'auth' | 'db'>,
  organizationId: Id<'organizations'>,
  minimumRole: Role = 'viewer',
): Promise<{ identity: Awaited<ReturnType<typeof requireIdentity>>; membership: Doc<'memberships'> }> {
  const identity = await requireIdentity(ctx);
  const membership = await ctx.db
    .query('memberships')
    .withIndex('by_organizationId_and_userTokenIdentifier', (query) =>
      query.eq('organizationId', organizationId).eq('userTokenIdentifier', identity.tokenIdentifier),
    )
    .unique();

  if (!membership || membership.status !== 'active') {
    throw new ConvexError({ code: 'FORBIDDEN', message: 'You do not have access to this organization.' });
  }
  if (roleRank[membership.role] < roleRank[minimumRole]) {
    throw new ConvexError({ code: 'FORBIDDEN', message: 'Your role cannot perform this action.' });
  }
  return { identity, membership };
}

export async function requireLocation(
  ctx: Pick<QueryCtx | MutationCtx, 'auth' | 'db'>,
  locationId: Id<'locations'>,
  minimumRole: Role = 'viewer',
) {
  const location = await ctx.db.get(locationId);
  if (!location) {
    throw new ConvexError({ code: 'NOT_FOUND', message: 'Location not found.' });
  }
  const access = await requireMembership(ctx, location.organizationId, minimumRole);
  return { ...access, location };
}

export async function recordActivity(
  ctx: MutationCtx,
  input: {
    organizationId: Id<'organizations'>;
    locationId?: Id<'locations'>;
    actorSubject: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    evidence?: Array<{ kind: string; id: string }>;
  },
) {
  await ctx.db.insert('activityEvents', {
    ...input,
    createdAt: Date.now(),
  });
}
