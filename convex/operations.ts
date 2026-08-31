import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import { recordActivity, requireLocation } from './lib/permissions';
import { roleValidator } from './lib/validators';
import schema from './schema';

const REMINDER_DAYS = [90, 60, 30, 14, 7, 1] as const;
const DAY = 24 * 60 * 60 * 1_000;

function clean(value: string | undefined, maximum = 2_000) {
  return value?.trim().replace(/\s+/g, ' ').slice(0, maximum) || undefined;
}

function nextRecurrence(base: number, recurrenceRule: string) {
  const date = new Date(base);
  const interval = Math.max(1, Math.min(120, Number(/INTERVAL=(\d+)/.exec(recurrenceRule)?.[1] ?? '1')));
  if (recurrenceRule.includes('FREQ=MONTHLY')) date.setUTCMonth(date.getUTCMonth() + interval);
  else date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.getTime();
}

function initialDueAt(requirement: Doc<'requirements'>, now: number) {
  if (requirement.deadline && requirement.deadline > now) return requirement.deadline;
  let dueAt = requirement.deadline ?? requirement.confirmedAt ?? requirement.capturedAt;
  const rule = requirement.recurrenceRule ?? 'FREQ=YEARLY';
  while (dueAt <= now) dueAt = nextRecurrence(dueAt, rule);
  return dueAt;
}

async function scheduleRenewalReminders(
  ctx: Parameters<typeof recordActivity>[0],
  renewalCycleId: Id<'renewalCycles'>,
  dueAt: number,
) {
  const now = Date.now();
  for (const cadenceDays of REMINDER_DAYS) {
    const scheduledFor = dueAt - cadenceDays * DAY;
    if (scheduledFor > now) {
      await ctx.scheduler.runAt(scheduledFor, internal.operations.deliverRenewalReminder, { renewalCycleId, cadenceDays });
    }
  }
  if (dueAt <= now + DAY) {
    await ctx.scheduler.runAfter(0, internal.operations.deliverRenewalReminder, { renewalCycleId, cadenceDays: dueAt <= now ? 0 : 1 });
  }
  await ctx.db.patch(renewalCycleId, { remindersScheduledAt: now, updatedAt: now });
}

async function createRenewalCycle(
  ctx: Parameters<typeof recordActivity>[0],
  input: {
    organizationId: Id<'organizations'>;
    locationId: Id<'locations'>;
    requirementId: Id<'requirements'>;
    recurrenceRule: string;
    dueAt: number;
    sequence: number;
    createdBy: string;
  },
) {
  const existing = await ctx.db
    .query('renewalCycles')
    .withIndex('by_requirementId_and_dueAt', (index) => index.eq('requirementId', input.requirementId).eq('dueAt', input.dueAt))
    .unique();
  if (existing) return existing._id;
  const now = Date.now();
  const renewalCycleId = await ctx.db.insert('renewalCycles', {
    ...input,
    status: input.dueAt <= now ? 'due' : 'upcoming',
    createdAt: now,
    updatedAt: now,
  });
  await scheduleRenewalReminders(ctx, renewalCycleId, input.dueAt);
  return renewalCycleId;
}

async function notifyMembers(
  ctx: Parameters<typeof recordActivity>[0],
  input: {
    organizationId: Id<'organizations'>;
    locationId: Id<'locations'>;
    kind: string;
    title: string;
    body: string;
    urgency: 'informational' | 'normal' | 'urgent';
    dedupePrefix: string;
    scheduledFor: number;
  },
) {
  const memberships = await ctx.db.query('memberships').withIndex('by_organizationId', (index) => index.eq('organizationId', input.organizationId)).take(100);
  for (const membership of memberships) {
    if (membership.status !== 'active') continue;
    const dedupeKey = `${input.dedupePrefix}:${membership.userTokenIdentifier}`;
    const existing = await ctx.db.query('notifications').withIndex('by_dedupeKey', (index) => index.eq('dedupeKey', dedupeKey)).unique();
    if (existing) continue;
    await ctx.db.insert('notifications', {
      organizationId: input.organizationId,
      userTokenIdentifier: membership.userTokenIdentifier,
      locationId: input.locationId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      urgency: input.urgency,
      scheduledFor: input.scheduledFor,
      dedupeKey,
      createdAt: Date.now(),
    });
  }
}

export const getSetup = query({
  args: { locationId: v.id('locations') },
  returns: v.object({
    location: schema.doc('locations'),
    role: roleValidator,
    requirements: v.array(schema.doc('requirements')),
    expiringDocuments: v.array(schema.doc('documents')),
  }),
  handler: async (ctx, args) => {
    const { location, membership } = await requireLocation(ctx, args.locationId);
    const requirements = await ctx.db.query('requirements').withIndex('by_locationId_and_createdAt', (index) => index.eq('locationId', args.locationId)).order('desc').take(100);
    const expiringDocuments = (await ctx.db.query('documents').withIndex('by_locationId_and_expiresAt', (index) => index.eq('locationId', args.locationId).gt('expiresAt', 0)).order('asc').take(100)).filter((document) => document.status === 'ready');
    return { location, role: membership.role, requirements, expiringDocuments };
  },
});

export const listInspections = query({
  args: { locationId: v.id('locations'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc('inspections')),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    return await ctx.db.query('inspections').withIndex('by_locationId_and_scheduledAt', (index) => index.eq('locationId', args.locationId)).order('asc').paginate(args.paginationOpts);
  },
});

export const listRenewals = query({
  args: { locationId: v.id('locations'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc('renewalCycles')),
  handler: async (ctx, args) => {
    await requireLocation(ctx, args.locationId);
    return await ctx.db.query('renewalCycles').withIndex('by_locationId_and_dueAt', (index) => index.eq('locationId', args.locationId)).order('asc').paginate(args.paginationOpts);
  },
});

export const listNotifications = query({
  args: { locationId: v.id('locations'), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc('notifications')),
  handler: async (ctx, args) => {
    const { identity } = await requireLocation(ctx, args.locationId);
    return await ctx.db
      .query('notifications')
      .withIndex('by_userTokenIdentifier_and_locationId_and_createdAt', (index) => index.eq('userTokenIdentifier', identity.tokenIdentifier).eq('locationId', args.locationId))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

export const getPreferences = query({
  args: { locationId: v.id('locations') },
  returns: v.object({ urgentEmail: v.boolean(), dailyDigest: v.boolean(), digestHourLocal: v.number(), timezone: v.string() }),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(ctx, args.locationId);
    const preferences = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_organizationId_and_userTokenIdentifier', (index) => index.eq('organizationId', location.organizationId).eq('userTokenIdentifier', identity.tokenIdentifier))
      .unique();
    return preferences
      ? { urgentEmail: preferences.urgentEmail, dailyDigest: preferences.dailyDigest, digestHourLocal: preferences.digestHourLocal, timezone: preferences.timezone }
      : { urgentEmail: false, dailyDigest: false, digestHourLocal: 8, timezone: location.timezone };
  },
});

export const updatePreferences = mutation({
  args: { locationId: v.id('locations'), urgentEmail: v.boolean(), dailyDigest: v.boolean(), digestHourLocal: v.number(), timezone: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(ctx, args.locationId);
    if (!Number.isInteger(args.digestHourLocal) || args.digestHourLocal < 0 || args.digestHourLocal > 23) throw new ConvexError({ code: 'INVALID_HOUR', message: 'Digest hour must be between 0 and 23.' });
    const timezone = clean(args.timezone, 100);
    if (!timezone) throw new ConvexError({ code: 'INVALID_TIMEZONE', message: 'Choose a timezone.' });
    const existing = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_organizationId_and_userTokenIdentifier', (index) => index.eq('organizationId', location.organizationId).eq('userTokenIdentifier', identity.tokenIdentifier))
      .unique();
    const patch = { urgentEmail: args.urgentEmail, dailyDigest: args.dailyDigest, digestHourLocal: args.digestHourLocal, timezone, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert('notificationPreferences', { organizationId: location.organizationId, userTokenIdentifier: identity.tokenIdentifier, ...patch });
    return null;
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id('notifications') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || !notification.locationId) throw new ConvexError({ code: 'NOT_FOUND', message: 'Notification not found.' });
    const { identity } = await requireLocation(ctx, notification.locationId);
    if (notification.userTokenIdentifier !== identity.tokenIdentifier) throw new ConvexError({ code: 'FORBIDDEN', message: 'This notification belongs to another user.' });
    if (!notification.readAt) await ctx.db.patch(notification._id, { readAt: Date.now() });
    return null;
  },
});

export const createInspection = mutation({
  args: {
    locationId: v.id('locations'),
    requirementId: v.optional(v.id('requirements')),
    applicationId: v.optional(v.id('applications')),
    agency: v.string(),
    inspectionType: v.string(),
    scheduledAt: v.optional(v.number()),
  },
  returns: v.id('inspections'),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(ctx, args.locationId, 'contributor');
    if (args.requirementId && args.applicationId) throw new ConvexError({ code: 'ONE_LINK_ONLY', message: 'Link an inspection to either a requirement or an application.' });
    if (args.requirementId) {
      const requirement = await ctx.db.get(args.requirementId);
      if (!requirement || requirement.locationId !== args.locationId) throw new ConvexError({ code: 'INVALID_REQUIREMENT', message: 'Requirement not found in this location.' });
    }
    if (args.applicationId) {
      const application = await ctx.db.get(args.applicationId);
      if (!application || application.locationId !== args.locationId) throw new ConvexError({ code: 'INVALID_APPLICATION', message: 'Application not found in this location.' });
    }
    const agency = clean(args.agency, 160);
    const inspectionType = clean(args.inspectionType, 160);
    if (!agency || !inspectionType) throw new ConvexError({ code: 'INSPECTION_INCOMPLETE', message: 'Agency and inspection type are required.' });
    const now = Date.now();
    const inspectionId = await ctx.db.insert('inspections', {
      organizationId: location.organizationId,
      locationId: args.locationId,
      requirementId: args.requirementId,
      applicationId: args.applicationId,
      agency,
      inspectionType,
      scheduledAt: args.scheduledAt,
      status: args.scheduledAt ? 'scheduled' : 'proposed',
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: args.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'inspection.created',
      entityType: 'inspection',
      entityId: inspectionId,
      after: { agency, inspectionType, scheduledAt: args.scheduledAt, requirementId: args.requirementId, applicationId: args.applicationId },
    });
    return inspectionId;
  },
});

export const recordInspectionOutcome = mutation({
  args: {
    inspectionId: v.id('inspections'),
    status: v.union(v.literal('completed'), v.literal('passed'), v.literal('failed'), v.literal('reschedule_needed')),
    outcome: v.string(),
    documentId: v.optional(v.id('documents')),
  },
  returns: v.union(v.null(), v.id('tasks')),
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new ConvexError({ code: 'NOT_FOUND', message: 'Inspection not found.' });
    const { identity } = await requireLocation(ctx, inspection.locationId, 'contributor');
    if (['passed', 'failed', 'completed'].includes(inspection.status)) throw new ConvexError({ code: 'ALREADY_RECORDED', message: 'This inspection already has a final outcome.' });
    const outcome = clean(args.outcome, 2_000);
    if (!outcome) throw new ConvexError({ code: 'OUTCOME_REQUIRED', message: 'Record the inspection outcome.' });
    let document: Doc<'documents'> | null = null;
    if (args.documentId) {
      document = await ctx.db.get(args.documentId);
      if (!document || document.locationId !== inspection.locationId || document.status !== 'ready') throw new ConvexError({ code: 'INVALID_DOCUMENT', message: 'Outcome evidence must be a checked document from this location.' });
    }
    const now = Date.now();
    await ctx.db.patch(inspection._id, { status: args.status, outcome, updatedAt: now });
    if (document) {
      await ctx.db.insert('documentLinks', { organizationId: inspection.organizationId, documentId: document._id, inspectionId: inspection._id, linkType: 'outcome', createdBy: identity.tokenIdentifier, createdAt: now });
    }
    let taskId: Id<'tasks'> | null = null;
    if (args.status === 'failed' || args.status === 'reschedule_needed') {
      taskId = await ctx.db.insert('tasks', {
        organizationId: inspection.organizationId,
        locationId: inspection.locationId,
        requirementId: inspection.requirementId,
        title: args.status === 'failed' ? `Resolve ${inspection.inspectionType} findings` : `Reschedule ${inspection.inspectionType}`,
        description: outcome,
        status: 'not_started',
        priority: args.status === 'failed' ? 'blocking' : 'high',
        createdBy: identity.tokenIdentifier,
        createdAt: now,
        updatedAt: now,
      });
      if (inspection.requirementId) await ctx.db.patch(inspection.requirementId, { status: 'needs_attention', updatedAt: now });
    } else if (args.status === 'passed' && inspection.requirementId) {
      await ctx.db.patch(inspection.requirementId, { status: 'approved', updatedAt: now });
    }
    await recordActivity(ctx, {
      organizationId: inspection.organizationId,
      locationId: inspection.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'inspection.outcome_recorded',
      entityType: 'inspection',
      entityId: inspection._id,
      before: { status: inspection.status },
      after: { status: args.status, outcome, taskId, documentId: document?._id },
      evidence: document ? [{ kind: 'document', id: document._id }] : undefined,
    });
    return taskId;
  },
});

export const trackRenewal = mutation({
  args: { requirementId: v.id('requirements'), dueAt: v.number(), recurrenceRule: v.optional(v.string()) },
  returns: v.id('renewalCycles'),
  handler: async (ctx, args) => {
    const requirement = await ctx.db.get(args.requirementId);
    if (!requirement) throw new ConvexError({ code: 'NOT_FOUND', message: 'Requirement not found.' });
    const { identity } = await requireLocation(ctx, requirement.locationId, 'admin');
    if (!requirement.confirmedAt || ['proposed', 'conflicted', 'not_applicable'].includes(requirement.status)) throw new ConvexError({ code: 'CONFIRM_FIRST', message: 'Only a confirmed applicable requirement can become a renewal.' });
    if (!Number.isFinite(args.dueAt) || args.dueAt < Date.now() - DAY) throw new ConvexError({ code: 'INVALID_DUE_DATE', message: 'Choose a current or future renewal date.' });
    const recurrenceRule = clean(args.recurrenceRule, 200) ?? requirement.recurrenceRule ?? 'FREQ=YEARLY';
    const latest = await ctx.db.query('renewalCycles').withIndex('by_requirementId_and_dueAt', (index) => index.eq('requirementId', requirement._id)).order('desc').take(1);
    const renewalCycleId = await createRenewalCycle(ctx, {
      organizationId: requirement.organizationId,
      locationId: requirement.locationId,
      requirementId: requirement._id,
      recurrenceRule,
      dueAt: args.dueAt,
      sequence: (latest[0]?.sequence ?? 0) + 1,
      createdBy: identity.tokenIdentifier,
    });
    await ctx.db.patch(requirement._id, { recurrenceRule, deadline: args.dueAt, status: args.dueAt <= Date.now() + 90 * DAY ? 'renewal_due' : requirement.status, updatedAt: Date.now() });
    await recordActivity(ctx, {
      organizationId: requirement.organizationId,
      locationId: requirement.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'renewal.tracked',
      entityType: 'renewal_cycle',
      entityId: renewalCycleId,
      after: { requirementId: requirement._id, dueAt: args.dueAt, recurrenceRule },
    });
    return renewalCycleId;
  },
});

export const startRenewal = mutation({
  args: { renewalCycleId: v.id('renewalCycles') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cycle = await ctx.db.get(args.renewalCycleId);
    if (!cycle) throw new ConvexError({ code: 'NOT_FOUND', message: 'Renewal cycle not found.' });
    const { identity } = await requireLocation(ctx, cycle.locationId, 'contributor');
    if (!['upcoming', 'due', 'overdue'].includes(cycle.status)) throw new ConvexError({ code: 'INVALID_STATUS', message: 'This renewal cannot be started.' });
    await ctx.db.patch(cycle._id, { status: 'in_progress', updatedAt: Date.now() });
    await recordActivity(ctx, { organizationId: cycle.organizationId, locationId: cycle.locationId, actorSubject: identity.tokenIdentifier, action: 'renewal.started', entityType: 'renewal_cycle', entityId: cycle._id, before: { status: cycle.status }, after: { status: 'in_progress' } });
    return null;
  },
});

export const completeRenewal = mutation({
  args: { renewalCycleId: v.id('renewalCycles'), outcomeNotes: v.string() },
  returns: v.id('renewalCycles'),
  handler: async (ctx, args) => {
    const cycle = await ctx.db.get(args.renewalCycleId);
    if (!cycle) throw new ConvexError({ code: 'NOT_FOUND', message: 'Renewal cycle not found.' });
    const { identity } = await requireLocation(ctx, cycle.locationId, 'contributor');
    if (cycle.status === 'completed' || cycle.status === 'cancelled') throw new ConvexError({ code: 'ALREADY_COMPLETE', message: 'This renewal is already closed.' });
    const outcomeNotes = clean(args.outcomeNotes, 2_000);
    if (!outcomeNotes) throw new ConvexError({ code: 'OUTCOME_REQUIRED', message: 'Record the renewal outcome.' });
    const now = Date.now();
    await ctx.db.patch(cycle._id, { status: 'completed', outcomeNotes, completedAt: now, updatedAt: now });
    const requirement = await ctx.db.get(cycle.requirementId);
    if (!requirement) throw new ConvexError({ code: 'REQUIREMENT_MISSING', message: 'The linked requirement is unavailable.' });
    const nextDueAt = nextRecurrence(cycle.dueAt, cycle.recurrenceRule);
    const nextCycleId = await createRenewalCycle(ctx, {
      organizationId: cycle.organizationId,
      locationId: cycle.locationId,
      requirementId: cycle.requirementId,
      recurrenceRule: cycle.recurrenceRule,
      dueAt: nextDueAt,
      sequence: cycle.sequence + 1,
      createdBy: identity.tokenIdentifier,
    });
    await ctx.db.patch(requirement._id, { status: 'approved', deadline: nextDueAt, lastVerifiedAt: now, updatedAt: now });
    await recordActivity(ctx, {
      organizationId: cycle.organizationId,
      locationId: cycle.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'renewal.completed',
      entityType: 'renewal_cycle',
      entityId: cycle._id,
      before: { status: cycle.status },
      after: { status: 'completed', nextCycleId, nextDueAt, outcomeNotes },
    });
    return nextCycleId;
  },
});

export const activateOperatingLifecycle = internalMutation({
  args: { locationId: v.id('locations'), actorSubject: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.locationId);
    if (!location || location.lifecycleStage !== 'operating') return 0;
    const requirements = await ctx.db.query('requirements').withIndex('by_locationId_and_createdAt', (index) => index.eq('locationId', args.locationId)).take(250);
    const now = Date.now();
    let created = 0;
    for (const requirement of requirements) {
      if (!requirement.recurrenceRule || !requirement.confirmedAt || ['proposed', 'conflicted', 'not_applicable'].includes(requirement.status)) continue;
      const dueAt = initialDueAt(requirement, now);
      const existing = await ctx.db.query('renewalCycles').withIndex('by_requirementId_and_dueAt', (index) => index.eq('requirementId', requirement._id).eq('dueAt', dueAt)).unique();
      if (existing) continue;
      await createRenewalCycle(ctx, { organizationId: requirement.organizationId, locationId: requirement.locationId, requirementId: requirement._id, recurrenceRule: requirement.recurrenceRule, dueAt, sequence: 1, createdBy: args.actorSubject });
      created += 1;
    }
    await recordActivity(ctx, { organizationId: location.organizationId, locationId: location._id, actorSubject: args.actorSubject, action: 'location.operating_lifecycle_activated', entityType: 'location', entityId: location._id, after: { renewalCyclesCreated: created } });
    return created;
  },
});

export const deliverRenewalReminder = internalMutation({
  args: { renewalCycleId: v.id('renewalCycles'), cadenceDays: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cycle = await ctx.db.get(args.renewalCycleId);
    if (!cycle || ['completed', 'cancelled'].includes(cycle.status)) return null;
    const requirement = await ctx.db.get(cycle.requirementId);
    if (!requirement) return null;
    const now = Date.now();
    const overdue = cycle.dueAt < now;
    if (overdue && cycle.status !== 'overdue') await ctx.db.patch(cycle._id, { status: 'overdue', updatedAt: now });
    else if (args.cadenceDays <= 30 && cycle.status === 'upcoming') await ctx.db.patch(cycle._id, { status: 'due', updatedAt: now });
    if (args.cadenceDays <= 90 && !['renewal_due', 'needs_attention'].includes(requirement.status)) await ctx.db.patch(requirement._id, { status: 'renewal_due', updatedAt: now });
    const timing = overdue ? 'overdue' : args.cadenceDays === 1 ? 'due tomorrow' : `due in ${args.cadenceDays} days`;
    await notifyMembers(ctx, {
      organizationId: cycle.organizationId,
      locationId: cycle.locationId,
      kind: 'renewal_reminder',
      title: `${requirement.title} ${timing}`,
      body: `Review the official source and prepare renewal evidence before ${new Date(cycle.dueAt).toISOString().slice(0, 10)}.`,
      urgency: overdue || args.cadenceDays <= 7 ? 'urgent' : 'normal',
      dedupePrefix: `renewal:${cycle._id}:${args.cadenceDays}`,
      scheduledFor: now,
    });
    return null;
  },
});

export const scheduleDocumentReminders = internalMutation({
  args: { documentId: v.id('documents') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document?.expiresAt || document.status !== 'ready') return null;
    const now = Date.now();
    for (const cadenceDays of REMINDER_DAYS) {
      const scheduledFor = document.expiresAt - cadenceDays * DAY;
      if (scheduledFor > now) await ctx.scheduler.runAt(scheduledFor, internal.operations.deliverDocumentReminder, { documentId: document._id, cadenceDays });
    }
    if (document.expiresAt <= now + DAY) await ctx.scheduler.runAfter(0, internal.operations.deliverDocumentReminder, { documentId: document._id, cadenceDays: document.expiresAt <= now ? 0 : 1 });
    return null;
  },
});

export const deliverDocumentReminder = internalMutation({
  args: { documentId: v.id('documents'), cadenceDays: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document?.expiresAt || document.status !== 'ready') return null;
    const now = Date.now();
    const overdue = document.expiresAt < now;
    const timing = overdue ? 'has expired' : args.cadenceDays === 1 ? 'expires tomorrow' : `expires in ${args.cadenceDays} days`;
    await notifyMembers(ctx, {
      organizationId: document.organizationId,
      locationId: document.locationId,
      kind: 'document_expiry',
      title: `${document.fileName} ${timing}`,
      body: 'Review the document, replace it if needed, and keep the current evidence attached to the relevant requirement.',
      urgency: overdue || args.cadenceDays <= 7 ? 'urgent' : 'normal',
      dedupePrefix: `document:${document._id}:${args.cadenceDays}`,
      scheduledFor: now,
    });
    return null;
  },
});

export const markOverdueRenewals = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const upcoming = await ctx.db.query('renewalCycles').withIndex('by_status_and_dueAt', (index) => index.eq('status', 'upcoming').lte('dueAt', now)).take(100);
    const due = await ctx.db.query('renewalCycles').withIndex('by_status_and_dueAt', (index) => index.eq('status', 'due').lte('dueAt', now)).take(100);
    for (const cycle of [...upcoming, ...due]) {
      await ctx.db.patch(cycle._id, { status: 'overdue', updatedAt: now });
      await ctx.scheduler.runAfter(0, internal.operations.deliverRenewalReminder, { renewalCycleId: cycle._id, cadenceDays: 0 });
    }
    return upcoming.length + due.length;
  },
});
