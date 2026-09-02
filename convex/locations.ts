import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { mutation, query } from './_generated/server';
import {
  recordActivity,
  requireLocation,
  requireMembership,
} from './lib/permissions';
import {
  businessTriggerAnswersValidator,
  businessTriggersValidator,
  lifecycleStageValidator,
} from './lib/validators';
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
    triggerAnswers: v.optional(businessTriggerAnswersValidator),
  },
  returns: v.id('locations'),
  handler: async (ctx, args) => {
    const { identity } = await requireMembership(
      ctx,
      args.organizationId,
      'contributor',
    );
    const business = await ctx.db.get(args.businessId);
    if (!business || business.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Business not found in this organization.',
      });
    }
    const existingLocations = await ctx.db
      .query('locations')
      .withIndex('by_organizationId', (query) =>
        query.eq('organizationId', args.organizationId),
      )
      .take(3);
    if (existingLocations.length >= 2) {
      throw new ConvexError({
        code: 'LOCATION_QUOTA',
        message: 'The beta allows two active locations per organization.',
      });
    }
    if (args.activities.length > 30 || args.triggers.other.length > 20) {
      throw new ConvexError({
        code: 'PROFILE_TOO_LARGE',
        message: 'Reduce the number of activities or custom triggers.',
      });
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
      activities: args.activities
        .map((activity) => activity.trim())
        .filter(Boolean),
      triggers: args.triggers,
      triggerAnswers: args.triggerAnswers,
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
      after: {
        name: args.name.trim(),
        city: args.city.trim(),
        region: args.region.trim(),
      },
    });
    return locationId;
  },
});

export const get = query({
  args: { locationId: v.id('locations') },
  returns: v.object({
    location: schema.doc('locations'),
    business: v.union(schema.doc('businesses'), v.null()),
    role: v.union(
      v.literal('owner'),
      v.literal('admin'),
      v.literal('contributor'),
      v.literal('viewer'),
    ),
  }),
  handler: async (ctx, args) => {
    const { membership, location } = await requireLocation(
      ctx,
      args.locationId,
    );
    const business = await ctx.db.get(location.businessId);
    return { location, business, role: membership.role };
  },
});

export const listByBusiness = query({
  args: {
    businessId: v.id('businesses'),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(schema.doc('locations')),
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);
    if (!business)
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Business not found.',
      });
    await requireMembership(ctx, business.organizationId);
    return await ctx.db
      .query('locations')
      .withIndex('by_businessId', (query) =>
        query.eq('businessId', args.businessId),
      )
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

export const updateProfile = mutation({
  args: {
    locationId: v.id('locations'),
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
    triggerAnswers: v.optional(businessTriggerAnswersValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(
      ctx,
      args.locationId,
      'contributor',
    );
    if (args.activities.length > 30 || args.triggers.other.length > 20) {
      throw new ConvexError({
        code: 'PROFILE_TOO_LARGE',
        message: 'Reduce the number of activities or custom triggers.',
      });
    }
    const next = {
      name: args.name.trim(),
      addressLine1: args.addressLine1.trim(),
      addressLine2: args.addressLine2?.trim() || undefined,
      city: args.city.trim(),
      region: args.region.trim(),
      postalCode: args.postalCode.trim(),
      countryCode: args.countryCode.trim().toUpperCase(),
      timezone: args.timezone.trim(),
      openingTarget: args.openingTarget,
      activities: args.activities
        .map((activity) => activity.trim())
        .filter(Boolean),
      triggers: {
        ...args.triggers,
        other: args.triggers.other.map((value) => value.trim()).filter(Boolean),
      },
      triggerAnswers: args.triggerAnswers,
    };
    if (
      !next.name ||
      !next.addressLine1 ||
      !next.city ||
      !next.region ||
      !next.postalCode ||
      !next.countryCode ||
      !next.timezone
    ) {
      throw new ConvexError({
        code: 'INVALID_LOCATION',
        message: 'Complete the required location fields.',
      });
    }
    const jurisdictionChanged =
      next.addressLine1 !== location.addressLine1 ||
      next.addressLine2 !== location.addressLine2 ||
      next.city !== location.city ||
      next.region !== location.region ||
      next.postalCode !== location.postalCode ||
      next.countryCode !== location.countryCode ||
      JSON.stringify(next.activities) !== JSON.stringify(location.activities) ||
      JSON.stringify(next.triggers) !== JSON.stringify(location.triggers) ||
      JSON.stringify(next.triggerAnswers) !==
        JSON.stringify(location.triggerAnswers);
    const now = Date.now();
    await ctx.db.patch(args.locationId, {
      ...next,
      ...(jurisdictionChanged
        ? {
            jurisdictionStatus: 'unconfirmed' as const,
            jurisdictionLabel: undefined,
            jurisdictionCountryCode: undefined,
            coverageMode: 'unselected' as const,
            coveragePackKey: undefined,
            nextSourceCheckAt: undefined,
          }
        : {}),
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: args.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'location.profile_updated',
      entityType: 'location',
      entityId: args.locationId,
      before: {
        name: location.name,
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2,
        city: location.city,
        region: location.region,
        postalCode: location.postalCode,
        countryCode: location.countryCode,
        openingTarget: location.openingTarget,
        activities: location.activities,
        triggers: location.triggers,
        jurisdictionStatus: location.jurisdictionStatus,
      },
      after: {
        ...next,
        jurisdictionStatus: jurisdictionChanged
          ? 'unconfirmed'
          : location.jurisdictionStatus,
      },
    });
    return null;
  },
});

export const confirmJurisdiction = mutation({
  args: {
    locationId: v.id('locations'),
    jurisdictionLabel: v.string(),
    jurisdictionCountryCode: v.string(),
    coverageMode: v.union(
      v.literal('verified_pack'),
      v.literal('dynamic_research'),
    ),
    coveragePackKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(
      ctx,
      args.locationId,
      'contributor',
    );
    if (args.coverageMode === 'verified_pack' && !args.coveragePackKey) {
      throw new ConvexError({
        code: 'PACK_REQUIRED',
        message: 'Choose a verified coverage pack.',
      });
    }
    const next = {
      jurisdictionStatus: 'confirmed' as const,
      jurisdictionLabel: args.jurisdictionLabel.trim(),
      jurisdictionCountryCode: args.jurisdictionCountryCode
        .trim()
        .toUpperCase(),
      coverageMode: args.coverageMode,
      coveragePackKey: args.coveragePackKey,
      nextSourceCheckAt: Date.now() + 7 * 24 * 60 * 60 * 1_000,
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
      before: {
        jurisdictionStatus: location.jurisdictionStatus,
        jurisdictionLabel: location.jurisdictionLabel,
      },
      after: next,
    });
    return null;
  },
});

export const transitionLifecycle = mutation({
  args: {
    locationId: v.id('locations'),
    lifecycleStage: lifecycleStageValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(
      ctx,
      args.locationId,
      'admin',
    );
    if (
      !allowedTransitions[location.lifecycleStage]?.includes(
        args.lifecycleStage,
      )
    ) {
      throw new ConvexError({
        code: 'INVALID_TRANSITION',
        message: `Cannot move from ${location.lifecycleStage} to ${args.lifecycleStage}.`,
      });
    }
    const now = Date.now();
    await ctx.db.patch(args.locationId, {
      lifecycleStage: args.lifecycleStage,
      nextSourceCheckAt:
        args.lifecycleStage === 'opening'
          ? now + 7 * 24 * 60 * 60 * 1_000
          : args.lifecycleStage === 'operating'
            ? now + 30 * 24 * 60 * 60 * 1_000
            : location.nextSourceCheckAt,
      updatedAt: now,
    });
    if (args.lifecycleStage === 'operating') {
      await ctx.scheduler.runAfter(
        0,
        internal.operations.activateOperatingLifecycle,
        {
          locationId: args.locationId,
          actorSubject: identity.tokenIdentifier,
        },
      );
    }
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
