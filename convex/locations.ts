import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { recordActivity, requireLocation, requireMembership } from './lib/permissions';
import { businessTriggersValidator, lifecycleStageValidator } from './lib/validators';
import schema from './schema';

const allowedTransitions: Record<string, ReadonlyArray<string>> = {
  planning: ['opening', 'paused', 'closed'],
  opening: ['operating', 'paused', 'closed'],
  operating: ['paused', 'closed'],
  paused: ['planning', 'opening', 'operating', 'closed'],
  closed: [],
};

export const create = mutation({
  args: {
    organizationId: v.id('organizations'),
    businessId: v.id('businesses'),
    name: v.string(),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    region: v.string(),
    postalCode: v.string(),
    countryCode: v.string(),
    timezone: v.string(),
    openingTarget: v.optional(v.number()),
    activities: v.array(v.string()),
    triggers: businessTriggersValidator,
  },
  returns: v.id('locations'),
  handler: async (ctx, args) => {
    const { identity } = await requireMembership(ctx, args.organizationId, 'contributor');
    const business = await ctx.db.get(args.businessId);
    if (!business || business.organizationId !== args.organizationId) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Business not found in this organization.' });
    }
    const existingLocations = await ctx.db
      .query('locations')
      .withIndex('by_organizationId', (query) => query.eq('organizationId', args.organizationId))
      .take(3);
    if (existingLocations.length >= 2) {
      throw new ConvexError({ code: 'LOCATION_QUOTA', message: 'The beta allows two active locations per organization.' });
    }
    if (args.activities.length > 30 || args.triggers.other.length > 20) {
      throw new ConvexError({ code: 'PROFILE_TOO_LARGE', message: 'Reduce the number of activities or custom triggers.' });
    }
    const now = Date.now();
    const locationId = await ctx.db.insert('locations', {
      organizationId: args.organizationId,
      businessId: args.businessId,
      name: args.name.trim(),
      addressLine1: args.addressLine1.trim(),
      addressLine2: args.addressLine2?.trim() || undefined,
      city: args.city.trim(),
      region: args.region.trim(),
      postalCode: args.postalCode.trim(),
      countryCode: args.countryCode.trim().toUpperCase(),
      timezone: args.timezone.trim(),
      lifecycleStage: 'planning',
      openingTarget: args.openingTarget,
      jurisdictionStatus: 'unconfirmed',
      coverageMode: 'unselected',
      activities: args.activities.map((activity) => activity.trim()).filter(Boolean),
      triggers: args.triggers,
      createdBy: identity.tokenIdentifier,
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: args.organizationId,
      locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'location.created',
      entityType: 'location',
      entityId: locationId,
      after: { name: args.name.trim(), city: args.city.trim(), region: args.region.trim() },
    });
    return locationId;
  },
});

export const get = query({
  args: { locationId: v.id('locations') },
  returns: v.object({
    location: schema.doc('locations'),
    business: v.union(schema.doc('businesses'), v.null()),
    role: v.union(v.literal('owner'), v.literal('admin'), v.literal('contributor'), v.literal('viewer')),
  }),
  handler: async (ctx, args) => {
    const { membership, location } = await requireLocation(ctx, args.locationId);
    const business = await ctx.db.get(location.businessId);
    return { location, business, role: membership.role };
  },
});

export const listByBusiness = query({
  args: { businessId: v.id('businesses'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc('locations')),
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);
    if (!business) throw new ConvexError({ code: 'NOT_FOUND', message: 'Business not found.' });
    await requireMembership(ctx, business.organizationId);
    return await ctx.db
      .query('locations')
      .withIndex('by_businessId', (query) => query.eq('businessId', args.businessId))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

export const confirmJurisdiction = mutation({
  args: {
    locationId: v.id('locations'),
    jurisdictionLabel: v.string(),
    jurisdictionCountryCode: v.string(),
    coverageMode: v.union(v.literal('verified_pack'), v.literal('dynamic_research')),
    coveragePackKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(ctx, args.locationId, 'contributor');
    if (args.coverageMode === 'verified_pack' && !args.coveragePackKey) {
      throw new ConvexError({ code: 'PACK_REQUIRED', message: 'Choose a verified coverage pack.' });
    }
    const next = {
      jurisdictionStatus: 'confirmed' as const,
      jurisdictionLabel: args.jurisdictionLabel.trim(),
      jurisdictionCountryCode: args.jurisdictionCountryCode.trim().toUpperCase(),
      coverageMode: args.coverageMode,
      coveragePackKey: args.coveragePackKey,
      updatedAt: Date.now(),
    };
    await ctx.db.patch(args.locationId, next);
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: args.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'location.jurisdiction_confirmed',
      entityType: 'location',
      entityId: args.locationId,
      before: { jurisdictionStatus: location.jurisdictionStatus, jurisdictionLabel: location.jurisdictionLabel },
      after: next,
    });
    return null;
  },
});

export const transitionLifecycle = mutation({
  args: { locationId: v.id('locations'), lifecycleStage: lifecycleStageValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(ctx, args.locationId, 'admin');
    if (!allowedTransitions[location.lifecycleStage]?.includes(args.lifecycleStage)) {
      throw new ConvexError({ code: 'INVALID_TRANSITION', message: `Cannot move from ${location.lifecycleStage} to ${args.lifecycleStage}.` });
    }
    await ctx.db.patch(args.locationId, { lifecycleStage: args.lifecycleStage, updatedAt: Date.now() });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: args.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'location.lifecycle_changed',
      entityType: 'location',
      entityId: args.locationId,
      before: { lifecycleStage: location.lifecycleStage },
      after: { lifecycleStage: args.lifecycleStage },
    });
    return null;
  },
});
