import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { recordActivity, requireMembership } from './lib/permissions';
import { lifecycleStageValidator } from './lib/validators';
import schema from './schema';

export const create = mutation({
  args: {
    organizationId: v.id('organizations'),
    name: v.string(),
    businessType: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id('businesses'),
  handler: async (ctx, args) => {
    const { identity } = await requireMembership(
      ctx,
      args.organizationId,
      'contributor',
    );
    const name = args.name.trim();
    const businessType = args.businessType.trim();
    if (
      name.length < 2 ||
      name.length > 100 ||
      businessType.length < 2 ||
      businessType.length > 100
    ) {
      throw new ConvexError({
        code: 'INVALID_BUSINESS',
        message: 'Enter a valid business name and type.',
      });
    }
    const now = Date.now();
    const businessId = await ctx.db.insert('businesses', {
      organizationId: args.organizationId,
      name,
      businessType,
      description: args.description?.trim() || undefined,
      lifecycleStage: 'planning',
      createdBy: identity.tokenIdentifier,
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: args.organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'business.created',
      entityType: 'business',
      entityId: businessId,
      after: { name, businessType, lifecycleStage: 'planning' },
    });
    return businessId;
  },
});

export const listByOrganization = query({
  args: {
    organizationId: v.id('organizations'),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(schema.doc('businesses')),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    return await ctx.db
      .query('businesses')
      .withIndex('by_organizationId', (query) =>
        query.eq('organizationId', args.organizationId),
      )
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

export const updateDetails = mutation({
  args: {
    businessId: v.id('businesses'),
    name: v.string(),
    businessType: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);
    if (!business)
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Business not found.',
      });
    const { identity } = await requireMembership(
      ctx,
      business.organizationId,
      'contributor',
    );
    const name = args.name.trim();
    const businessType = args.businessType.trim();
    const description = args.description?.trim() || undefined;
    if (
      name.length < 2 ||
      name.length > 100 ||
      businessType.length < 2 ||
      businessType.length > 100
    ) {
      throw new ConvexError({
        code: 'INVALID_BUSINESS',
        message: 'Enter a valid business name and type.',
      });
    }
    if (
      name === business.name &&
      businessType === business.businessType &&
      description === business.description
    )
      return null;
    await ctx.db.patch(args.businessId, {
      name,
      businessType,
      description,
      updatedAt: Date.now(),
    });
    await recordActivity(ctx, {
      organizationId: business.organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'business.updated',
      entityType: 'business',
      entityId: args.businessId,
      before: {
        name: business.name,
        businessType: business.businessType,
        description: business.description,
      },
      after: { name, businessType, description },
    });
    return null;
  },
});

export const updateStage = mutation({
  args: {
    businessId: v.id('businesses'),
    lifecycleStage: lifecycleStageValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);
    if (!business)
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Business not found.',
      });
    const { identity } = await requireMembership(
      ctx,
      business.organizationId,
      'contributor',
    );
    await ctx.db.patch(args.businessId, {
      lifecycleStage: args.lifecycleStage,
      updatedAt: Date.now(),
    });
    await recordActivity(ctx, {
      organizationId: business.organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'business.lifecycle_changed',
      entityType: 'business',
      entityId: args.businessId,
      before: { lifecycleStage: business.lifecycleStage },
      after: { lifecycleStage: args.lifecycleStage },
    });
    return null;
  },
});
