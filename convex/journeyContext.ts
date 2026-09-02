import { ConvexError, v } from 'convex/values';

import { internalQuery } from './_generated/server';
import { requireLocation } from './lib/permissions';
import schema from './schema';

export const getContext = internalQuery({
  args: { journeyId: v.id('journeys') },
  returns: v.union(
    v.null(),
    v.object({
      journey: schema.doc('journeys'),
      location: schema.doc('locations'),
      business: schema.doc('businesses'),
    }),
  ),
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) return null;
    const location = await ctx.db.get(journey.locationId);
    if (!location) return null;
    const business = await ctx.db.get(location.businessId);
    return business ? { journey, location, business } : null;
  },
});

export const getEvidenceContext = internalQuery({
  args: { journeyId: v.id('journeys') },
  returns: v.union(
    v.null(),
    v.object({
      journey: schema.doc('journeys'),
      location: schema.doc('locations'),
      business: schema.doc('businesses'),
      sources: v.array(schema.doc('sourceSnapshots')),
      reviews: v.array(schema.doc('specialistReviews')),
    }),
  ),
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) return null;
    const location = await ctx.db.get(journey.locationId);
    if (!location) return null;
    const business = await ctx.db.get(location.businessId);
    if (!business) return null;
    const [sources, reviews] = await Promise.all([
      ctx.db
        .query('sourceSnapshots')
        .withIndex('by_locationId_and_capturedAt', (index) =>
          index.eq('locationId', location._id),
        )
        .order('desc')
        .take(40),
      ctx.db
        .query('specialistReviews')
        .withIndex('by_journeyId_and_specialist', (index) =>
          index.eq('journeyId', args.journeyId),
        )
        .take(4),
    ]);
    return { journey, location, business, sources, reviews };
  },
});

export const getStepForAnswer = internalQuery({
  args: { journeyStepId: v.id('journeySteps') },
  returns: v.union(v.null(), schema.doc('journeySteps')),
  handler: async (ctx, args) => await ctx.db.get(args.journeyStepId),
});

export const getAskContext = internalQuery({
  args: { journeyStepId: v.id('journeySteps') },
  returns: v.union(
    v.null(),
    v.object({
      step: schema.doc('journeySteps'),
      location: schema.doc('locations'),
      business: v.union(v.null(), schema.doc('businesses')),
    }),
  ),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step) return null;
    const { location } = await requireLocation(ctx, step.locationId);
    const business = await ctx.db.get(location.businessId);
    return { step, location, business };
  },
});

export const getPreflightContext = internalQuery({
  args: { journeyStepId: v.id('journeySteps'), url: v.string() },
  returns: v.union(v.null(), v.object({ step: schema.doc('journeySteps') })),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step) return null;
    await requireLocation(ctx, step.locationId);
    if (step.actionType === 'banking') {
      throw new ConvexError({
        code: 'BANKING_EXTERNAL_ONLY',
        message: 'Banking pages always stay outside RibbonDesk.',
      });
    }
    const options = await ctx.db
      .query('serviceOptions')
      .withIndex('by_journeyId_and_kind', (index) =>
        index.eq('journeyId', step.journeyId),
      )
      .take(40);
    if (
      step.officialPortalUrl !== args.url &&
      !options.some((option) => option.url === args.url)
    ) {
      throw new ConvexError({
        code: 'URL_NOT_ALLOWED',
        message: 'This page is not part of the researched route.',
      });
    }
    return { step };
  },
});

export const getScreenContext = internalQuery({
  args: { journeyStepId: v.id('journeySteps'), documentId: v.id('documents') },
  returns: v.union(
    v.null(),
    v.object({
      step: schema.doc('journeySteps'),
      document: schema.doc('documents'),
      url: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const [step, document] = await Promise.all([
      ctx.db.get(args.journeyStepId),
      ctx.db.get(args.documentId),
    ]);
    if (!step || !document || step.locationId !== document.locationId)
      return null;
    const url = await ctx.storage.getUrl(document.storageId);
    return url ? { step, document, url } : null;
  },
});
