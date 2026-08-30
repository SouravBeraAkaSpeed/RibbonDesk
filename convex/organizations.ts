import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { recordActivity, requireIdentity, requireMembership } from './lib/permissions';
import { roleValidator } from './lib/validators';
import schema from './schema';

function organizationSlug(name: string) {
  const base = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '-')
    .slice(0, 42);
  return base || 'workspace';
}

export const create = mutation({
  args: { name: v.string(), displayName: v.optional(v.string()) },
  returns: v.id('organizations'),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new ConvexError({ code: 'INVALID_NAME', message: 'Organization names must be 2–80 characters.' });
    }

    const now = Date.now();
    const slugBase = organizationSlug(name);
    let slug = slugBase;
    for (let suffix = 2; suffix <= 20; suffix += 1) {
      const existing = await ctx.db.query('organizations').withIndex('by_slug', (query) => query.eq('slug', slug)).unique();
      if (!existing) break;
      slug = `${slugBase}-${suffix}`;
    }
    const collision = await ctx.db.query('organizations').withIndex('by_slug', (query) => query.eq('slug', slug)).unique();
    if (collision) {
      throw new ConvexError({ code: 'SLUG_UNAVAILABLE', message: 'Please choose a more distinctive organization name.' });
    }

    const organizationId = await ctx.db.insert('organizations', {
      name,
      slug,
      createdBy: identity.tokenIdentifier,
      storedBytes: 0,
      deletionStatus: 'active',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('memberships', {
      organizationId,
      userTokenIdentifier: identity.tokenIdentifier,
      role: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_tokenIdentifier', (query) => query.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique();
    if (!profile) {
      await ctx.db.insert('profiles', {
        tokenIdentifier: identity.tokenIdentifier,
        normalizedEmail: identity.email?.trim().toLowerCase(),
        displayName: args.displayName?.trim() || identity.name,
        createdAt: now,
        updatedAt: now,
      });
    }
    await recordActivity(ctx, {
      organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'organization.created',
      entityType: 'organization',
      entityId: organizationId,
      after: { name, slug },
    });
    return organizationId;
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      membership: schema.doc('memberships'),
      organization: v.union(schema.doc('organizations'), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const page = await ctx.db
      .query('memberships')
      .withIndex('by_userTokenIdentifier', (query) => query.eq('userTokenIdentifier', identity.tokenIdentifier))
      .order('desc')
      .paginate(args.paginationOpts);
    const enriched = await Promise.all(
      page.page.map(async (membership) => ({ membership, organization: await ctx.db.get(membership.organizationId) })),
    );
    return {
      ...page,
      page: enriched.map((item) => ({
        ...item,
        organization: item.organization?.deletionStatus === 'active' ? item.organization : null,
      })),
    };
  },
});

export const get = query({
  args: { organizationId: v.id('organizations') },
  returns: v.object({ organization: schema.doc('organizations'), role: roleValidator }),
  handler: async (ctx, args) => {
    const { membership } = await requireMembership(ctx, args.organizationId);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization || organization.deletionStatus !== 'active') {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Organization not found.' });
    }
    return { organization, role: membership.role };
  },
});

export const listMembers = query({
  args: { organizationId: v.id('organizations'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({ membership: schema.doc('memberships'), profile: v.union(schema.doc('profiles'), v.null()) }),
  ),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const page = await ctx.db
      .query('memberships')
      .withIndex('by_organizationId', (query) => query.eq('organizationId', args.organizationId))
      .order('asc')
      .paginate(args.paginationOpts);
    const members = await Promise.all(
      page.page.map(async (membership) => ({
        membership,
        profile: await ctx.db
          .query('profiles')
          .withIndex('by_tokenIdentifier', (query) => query.eq('tokenIdentifier', membership.userTokenIdentifier))
          .unique(),
      })),
    );
    return { ...page, page: members };
  },
});

export const changeRole = mutation({
  args: { organizationId: v.id('organizations'), membershipId: v.id('memberships'), role: roleValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requireMembership(ctx, args.organizationId, 'owner');
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.organizationId !== args.organizationId) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Member not found.' });
    }
    if (membership.role === 'owner' || args.role === 'owner') {
      throw new ConvexError({ code: 'OWNER_TRANSFER_REQUIRED', message: 'Ownership changes require the dedicated transfer flow.' });
    }
    await ctx.db.patch(args.membershipId, { role: args.role, updatedAt: Date.now() });
    await recordActivity(ctx, {
      organizationId: args.organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'membership.role_changed',
      entityType: 'membership',
      entityId: args.membershipId,
      before: { role: membership.role },
      after: { role: args.role },
    });
    return null;
  },
});
