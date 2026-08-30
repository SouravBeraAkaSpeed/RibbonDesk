import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { recordActivity, requireLocation } from './lib/permissions';
import { taskStatusValidator } from './lib/validators';
import schema from './schema';

export const list = query({
  args: {
    locationId: v.id('locations'),
    status: v.optional(taskStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(schema.doc('tasks')),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    if (args.status) {
      return await ctx.db
        .query('tasks')
        .withIndex('by_locationId_and_status', (query) => query.eq('locationId', args.locationId).eq('status', args.status!))
        .order('desc')
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query('tasks')
      .withIndex('by_locationId_and_createdAt', (query) => query.eq('locationId', args.locationId))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

export const create = mutation({
  args: {
    locationId: v.id('locations'),
    requirementId: v.optional(v.id('requirements')),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal('blocking'), v.literal('high'), v.literal('normal'), v.literal('low')),
    ownerTokenIdentifier: v.optional(v.string()),
    dueAt: v.optional(v.number()),
  },
  returns: v.id('tasks'),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(ctx, args.locationId, 'contributor');
    if (args.requirementId) {
      const requirement = await ctx.db.get(args.requirementId);
      if (!requirement || requirement.locationId !== args.locationId) {
        throw new ConvexError({ code: 'NOT_FOUND', message: 'Requirement not found in this location.' });
      }
    }
    if (args.ownerTokenIdentifier) {
      const membership = await ctx.db
        .query('memberships')
        .withIndex('by_organizationId_and_userTokenIdentifier', (query) =>
          query.eq('organizationId', location.organizationId).eq('userTokenIdentifier', args.ownerTokenIdentifier!),
        )
        .unique();
      if (!membership || membership.status !== 'active') {
        throw new ConvexError({ code: 'INVALID_OWNER', message: 'Assign tasks only to active organization members.' });
      }
    }
    const now = Date.now();
    const taskId = await ctx.db.insert('tasks', {
      organizationId: location.organizationId,
      locationId: args.locationId,
      requirementId: args.requirementId,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      status: 'not_started',
      priority: args.priority,
      ownerTokenIdentifier: args.ownerTokenIdentifier,
      dueAt: args.dueAt,
      createdBy: identity.tokenIdentifier,
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: args.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'task.created',
      entityType: 'task',
      entityId: taskId,
      after: { title: args.title.trim(), priority: args.priority, ownerTokenIdentifier: args.ownerTokenIdentifier, dueAt: args.dueAt },
    });
    return taskId;
  },
});

export const updateStatus = mutation({
  args: { taskId: v.id('tasks'), status: taskStatusValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new ConvexError({ code: 'NOT_FOUND', message: 'Task not found.' });
    const { identity } = await requireLocation(ctx, task.locationId, 'contributor');
    const now = Date.now();
    const patch = { status: args.status, completedAt: args.status === 'completed' ? now : undefined, updatedAt: now };
    await ctx.db.patch(args.taskId, patch);
    await recordActivity(ctx, {
      organizationId: task.organizationId,
      locationId: task.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'task.status_changed',
      entityType: 'task',
      entityId: args.taskId,
      before: { status: task.status, completedAt: task.completedAt },
      after: patch,
    });
    return null;
  },
});

export const assign = mutation({
  args: { taskId: v.id('tasks'), ownerTokenIdentifier: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new ConvexError({ code: 'NOT_FOUND', message: 'Task not found.' });
    const { identity, location } = await requireLocation(ctx, task.locationId, 'contributor');
    if (args.ownerTokenIdentifier) {
      const membership = await ctx.db
        .query('memberships')
        .withIndex('by_organizationId_and_userTokenIdentifier', (query) =>
          query.eq('organizationId', location.organizationId).eq('userTokenIdentifier', args.ownerTokenIdentifier!),
        )
        .unique();
      if (!membership || membership.status !== 'active') {
        throw new ConvexError({ code: 'INVALID_OWNER', message: 'Assign tasks only to active organization members.' });
      }
    }
    await ctx.db.patch(args.taskId, { ownerTokenIdentifier: args.ownerTokenIdentifier, updatedAt: Date.now() });
    await recordActivity(ctx, {
      organizationId: task.organizationId,
      locationId: task.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'task.assigned',
      entityType: 'task',
      entityId: args.taskId,
      before: { ownerTokenIdentifier: task.ownerTokenIdentifier },
      after: { ownerTokenIdentifier: args.ownerTokenIdentifier },
    });
    return null;
  },
});
