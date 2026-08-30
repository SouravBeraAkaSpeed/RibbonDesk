import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { recordActivity, requireLocation } from './lib/permissions';
import { confidenceValidator, requirementStatusValidator } from './lib/validators';
import schema from './schema';

export const list = query({
  args: {
    locationId: v.id('locations'),
    status: v.optional(requirementStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(schema.doc('requirements')),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    if (args.status) {
      return await ctx.db
        .query('requirements')
        .withIndex('by_locationId_and_status', (query) => query.eq('locationId', args.locationId).eq('status', args.status!))
        .order('asc')
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query('requirements')
      .withIndex('by_locationId_and_createdAt', (query) => query.eq('locationId', args.locationId))
      .order('asc')
      .paginate(args.paginationOpts);
  },
});

export const getGraph = query({
  args: { locationId: v.id('locations') },
  returns: v.object({
    requirements: v.array(schema.doc('requirements')),
    edges: v.array(schema.doc('requirementEdges')),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    const [requirements, edges] = await Promise.all([
      ctx.db.query('requirements').withIndex('by_locationId_and_createdAt', (query) => query.eq('locationId', args.locationId)).take(250),
      ctx.db.query('requirementEdges').withIndex('by_locationId', (query) => query.eq('locationId', args.locationId)).take(500),
    ]);
    return { requirements, edges, truncated: requirements.length === 250 || edges.length === 500 };
  },
});

export const createManual = mutation({
  args: {
    locationId: v.id('locations'),
    title: v.string(),
    description: v.string(),
    requirementType: v.string(),
    agency: v.string(),
    sourceUrl: v.string(),
    sourceTitle: v.string(),
    officialSource: v.boolean(),
    confidence: confidenceValidator,
    deadline: v.optional(v.number()),
    feeMinCents: v.optional(v.number()),
    feeMaxCents: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id('requirements'),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(ctx, args.locationId, 'contributor');
    let source: URL;
    try {
      source = new URL(args.sourceUrl);
    } catch {
      throw new ConvexError({ code: 'INVALID_SOURCE', message: 'Add a valid HTTPS source URL.' });
    }
    if (source.protocol !== 'https:') {
      throw new ConvexError({ code: 'INVALID_SOURCE', message: 'Requirement sources must use HTTPS.' });
    }
    if (args.feeMinCents !== undefined && args.feeMaxCents !== undefined && args.feeMinCents > args.feeMaxCents) {
      throw new ConvexError({ code: 'INVALID_FEE_RANGE', message: 'The minimum fee cannot exceed the maximum fee.' });
    }
    const now = Date.now();
    const requirementId = await ctx.db.insert('requirements', {
      organizationId: location.organizationId,
      locationId: args.locationId,
      title: args.title.trim(),
      description: args.description.trim(),
      requirementType: args.requirementType.trim(),
      status: 'proposed',
      agency: args.agency.trim(),
      sourceUrl: source.toString(),
      sourceTitle: args.sourceTitle.trim(),
      officialSource: args.officialSource,
      confidence: args.confidence,
      capturedAt: now,
      lastVerifiedAt: now,
      deadline: args.deadline,
      feeMinCents: args.feeMinCents,
      feeMaxCents: args.feeMaxCents,
      notes: args.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: args.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'requirement.proposed_manually',
      entityType: 'requirement',
      entityId: requirementId,
      after: { title: args.title.trim(), agency: args.agency.trim(), sourceUrl: source.toString() },
    });
    return requirementId;
  },
});

export const updateStatus = mutation({
  args: { requirementId: v.id('requirements'), status: requirementStatusValidator, notes: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const requirement = await ctx.db.get(args.requirementId);
    if (!requirement) throw new ConvexError({ code: 'NOT_FOUND', message: 'Requirement not found.' });
    const { identity } = await requireLocation(ctx, requirement.locationId, 'contributor');
    if (requirement.status === 'proposed' && !['confirmed', 'not_applicable', 'conflicted'].includes(args.status)) {
      throw new ConvexError({ code: 'REVIEW_REQUIRED', message: 'Review the proposal before starting this requirement.' });
    }
    if (args.status === 'confirmed') {
      const { membership } = await requireLocation(ctx, requirement.locationId, 'admin');
      if (!['owner', 'admin'].includes(membership.role)) {
        throw new ConvexError({ code: 'APPROVAL_REQUIRED', message: 'An owner or admin must confirm requirements.' });
      }
    }
    const now = Date.now();
    const patch = {
      status: args.status,
      notes: args.notes?.trim() || requirement.notes,
      confirmedBy: args.status === 'confirmed' ? identity.tokenIdentifier : requirement.confirmedBy,
      confirmedAt: args.status === 'confirmed' ? now : requirement.confirmedAt,
      updatedAt: now,
    };
    await ctx.db.patch(args.requirementId, patch);
    await recordActivity(ctx, {
      organizationId: requirement.organizationId,
      locationId: requirement.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'requirement.status_changed',
      entityType: 'requirement',
      entityId: args.requirementId,
      before: { status: requirement.status, notes: requirement.notes },
      after: patch,
    });
    return null;
  },
});

async function createsCycle(
  ctx: Parameters<typeof requireLocation>[0],
  fromRequirementId: Id<'requirements'>,
  toRequirementId: Id<'requirements'>,
) {
  const frontier: Array<Id<'requirements'>> = [toRequirementId];
  const visited = new Set<string>();
  while (frontier.length > 0 && visited.size < 250) {
    const current = frontier.shift()!;
    if (current === fromRequirementId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const outgoing = await ctx.db
      .query('requirementEdges')
      .withIndex('by_fromRequirementId', (query) => query.eq('fromRequirementId', current))
      .take(100);
    frontier.push(...outgoing.map((edge) => edge.toRequirementId));
  }
  if (frontier.length > 0) {
    throw new ConvexError({ code: 'GRAPH_TOO_LARGE', message: 'The dependency graph needs review before adding more edges.' });
  }
  return false;
}

export const addDependency = mutation({
  args: {
    fromRequirementId: v.id('requirements'),
    toRequirementId: v.id('requirements'),
    kind: v.union(v.literal('blocks'), v.literal('requires'), v.literal('related')),
  },
  returns: v.id('requirementEdges'),
  handler: async (ctx, args) => {
    if (args.fromRequirementId === args.toRequirementId) {
      throw new ConvexError({ code: 'DEPENDENCY_CYCLE', message: 'A requirement cannot depend on itself.' });
    }
    const [fromRequirement, toRequirement] = await Promise.all([
      ctx.db.get(args.fromRequirementId),
      ctx.db.get(args.toRequirementId),
    ]);
    if (!fromRequirement || !toRequirement || fromRequirement.locationId !== toRequirement.locationId) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Both requirements must belong to the same location.' });
    }
    const { identity } = await requireLocation(ctx, fromRequirement.locationId, 'contributor');
    const existing = await ctx.db
      .query('requirementEdges')
      .withIndex('by_fromRequirementId_and_toRequirementId', (query) =>
        query.eq('fromRequirementId', args.fromRequirementId).eq('toRequirementId', args.toRequirementId),
      )
      .unique();
    if (existing) return existing._id;
    if (await createsCycle(ctx, args.fromRequirementId, args.toRequirementId)) {
      throw new ConvexError({ code: 'DEPENDENCY_CYCLE', message: 'This dependency would create a cycle.' });
    }
    const edgeId = await ctx.db.insert('requirementEdges', {
      organizationId: fromRequirement.organizationId,
      locationId: fromRequirement.locationId,
      fromRequirementId: args.fromRequirementId,
      toRequirementId: args.toRequirementId,
      kind: args.kind,
      createdBy: identity.tokenIdentifier,
      createdAt: Date.now(),
    });
    await recordActivity(ctx, {
      organizationId: fromRequirement.organizationId,
      locationId: fromRequirement.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'requirement.dependency_added',
      entityType: 'requirement_edge',
      entityId: edgeId,
      after: args,
    });
    return edgeId;
  },
});
