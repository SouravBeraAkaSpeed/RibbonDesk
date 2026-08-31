import { v } from 'convex/values';

import { internal } from './_generated/api';
import { env, internalAction, internalMutation, internalQuery } from './_generated/server';
import { AgentMailRequestError, sendAgentMailMessage } from './lib/agentMailClient';

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000];
const kindValidator = v.union(v.literal('verification'), v.literal('password_reset'));

export const queue = internalMutation({
  args: {
    recipient: v.string(),
    subject: v.string(),
    text: v.string(),
    kind: kindValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobId = await ctx.db.insert('authEmailJobs', {
      ...args,
      status: 'queued',
      attempts: 0,
      nextAttemptAt: now,
      expiresAt: now + 55 * 60_000,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.authEmail.deliver, { jobId });
    return null;
  },
});

export const getJob = internalQuery({
  args: { jobId: v.id('authEmailJobs') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('authEmailJobs'),
      _creationTime: v.number(),
      recipient: v.string(),
      subject: v.string(),
      text: v.string(),
      kind: kindValidator,
      status: v.union(v.literal('queued'), v.literal('retrying')),
      attempts: v.number(),
      nextAttemptAt: v.number(),
      expiresAt: v.number(),
      lastErrorCode: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => await ctx.db.get('authEmailJobs', args.jobId),
});

export const complete = internalMutation({
  args: { jobId: v.id('authEmailJobs') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get('authEmailJobs', args.jobId);
    if (job) await ctx.db.delete('authEmailJobs', args.jobId);
    return null;
  },
});

export const cleanupExpired = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query('authEmailJobs')
      .withIndex('by_expiresAt', (q) => q.lt('expiresAt', now))
      .take(100);
    for (const job of expired) await ctx.db.delete('authEmailJobs', job._id);
    if (expired.length === 100) {
      await ctx.scheduler.runAfter(0, internal.authEmail.cleanupExpired, {});
    }
    return expired.length;
  },
});

export const recordFailure = internalMutation({
  args: {
    jobId: v.id('authEmailJobs'),
    retryable: v.boolean(),
    errorCode: v.string(),
    retryAfterMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get('authEmailJobs', args.jobId);
    if (!job) return null;
    const attempt = job.attempts + 1;
    const fallbackDelay = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
    const delay = Math.max(fallbackDelay, args.retryAfterMs ?? 0);
    const nextAttemptAt = Date.now() + delay;
    if (!args.retryable || attempt > RETRY_DELAYS_MS.length || nextAttemptAt >= job.expiresAt) {
      await ctx.db.delete('authEmailJobs', args.jobId);
      return null;
    }
    await ctx.db.patch('authEmailJobs', args.jobId, {
      status: 'retrying',
      attempts: attempt,
      nextAttemptAt,
      lastErrorCode: args.errorCode,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(delay, internal.authEmail.deliver, { jobId: args.jobId });
    return null;
  },
});

export const deliver = internalAction({
  args: { jobId: v.id('authEmailJobs') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.authEmail.getJob, { jobId: args.jobId });
    if (!job) return null;
    if (Date.now() >= job.expiresAt) {
      await ctx.runMutation(internal.authEmail.complete, { jobId: args.jobId });
      return null;
    }
    const inboxId = env.AUTH_EMAIL_INBOX_ID?.trim();
    if (!inboxId) {
      await ctx.runMutation(internal.authEmail.recordFailure, {
        jobId: args.jobId,
        retryable: false,
        errorCode: 'not_configured',
      });
      return null;
    }
    try {
      await sendAgentMailMessage(inboxId, {
        to: [job.recipient],
        subject: job.subject,
        text: job.text,
      });
      await ctx.runMutation(internal.authEmail.complete, { jobId: args.jobId });
    } catch (error) {
      const status = error instanceof AgentMailRequestError ? error.status : 500;
      await ctx.runMutation(internal.authEmail.recordFailure, {
        jobId: args.jobId,
        retryable: [404, 408, 409, 429].includes(status) || status >= 500,
        errorCode: `agentmail_${status}`,
        retryAfterMs: error instanceof AgentMailRequestError ? error.retryAfterMs : undefined,
      });
    }
    return null;
  },
});
