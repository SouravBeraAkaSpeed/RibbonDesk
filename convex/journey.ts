import { start } from '@convex-dev/workflow';
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { env, internalMutation, mutation, query } from './_generated/server';
import {
  journeyActionTypeValidator,
  journeyGuideValidator,
  journeyPhaseValidator,
  journeyResearchStageValidator,
  sourceTierValidator,
} from './lib/validators';
import { hasAiProvider } from './lib/aiProvider';
import { recordActivity, requireLocation } from './lib/permissions';
import schema from './schema';

const citationValidator = v.object({
  url: v.string(),
  title: v.string(),
  excerpt: v.optional(v.string()),
  official: v.boolean(),
  sourceTier: v.optional(sourceTierValidator),
});

const generatedStepValidator = v.object({
  phase: journeyPhaseValidator,
  title: v.string(),
  plainSummary: v.string(),
  why: v.string(),
  guide: journeyGuideValidator,
  actionType: journeyActionTypeValidator,
  timeEstimate: v.optional(v.string()),
  costSummary: v.optional(v.string()),
  requiredInfo: v.array(v.string()),
  citationUrls: v.array(v.string()),
  nextQuestion: v.optional(v.string()),
  officialPortalUrl: v.optional(v.string()),
});

function progressFor(steps: Array<{ status: string }>) {
  if (!steps.length) return 0;
  const finished = steps.filter((step) =>
    ['done', 'skipped'].includes(step.status),
  ).length;
  return Math.round((finished / steps.length) * 100);
}

export const getCurrent = query({
  args: { locationId: v.id('locations') },
  returns: v.union(
    v.null(),
    v.object({
      journey: schema.doc('journeys'),
      currentStep: v.union(v.null(), schema.doc('journeySteps')),
      steps: v.array(schema.doc('journeySteps')),
      location: schema.doc('locations'),
      business: v.union(v.null(), schema.doc('businesses')),
      reviews: v.array(schema.doc('specialistReviews')),
      role: v.union(
        v.literal('owner'),
        v.literal('admin'),
        v.literal('contributor'),
        v.literal('viewer'),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const { location, membership } = await requireLocation(
      ctx,
      args.locationId,
    );
    const journey = await ctx.db
      .query('journeys')
      .withIndex('by_locationId_and_version', (index) =>
        index.eq('locationId', args.locationId),
      )
      .order('desc')
      .first();
    if (!journey) return null;
    const [steps, business, reviews] = await Promise.all([
      ctx.db
        .query('journeySteps')
        .withIndex('by_journeyId_and_order', (index) =>
          index.eq('journeyId', journey._id),
        )
        .take(60),
      ctx.db.get(location.businessId),
      ctx.db
        .query('specialistReviews')
        .withIndex('by_journeyId_and_specialist', (index) =>
          index.eq('journeyId', journey._id),
        )
        .take(4),
    ]);
    const currentStep = journey.currentStepId
      ? await ctx.db.get(journey.currentStepId)
      : null;
    return {
      journey,
      currentStep,
      steps,
      location,
      business,
      reviews,
      role: membership.role,
    };
  },
});

export const getStep = query({
  args: { journeyStepId: v.id('journeySteps') },
  returns: v.union(
    v.null(),
    v.object({
      step: schema.doc('journeySteps'),
      journey: schema.doc('journeys'),
      location: schema.doc('locations'),
      business: v.union(v.null(), schema.doc('businesses')),
      role: v.union(
        v.literal('owner'),
        v.literal('admin'),
        v.literal('contributor'),
        v.literal('viewer'),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step) return null;
    const { location, membership } = await requireLocation(
      ctx,
      step.locationId,
    );
    const [journey, business] = await Promise.all([
      ctx.db.get(step.journeyId),
      ctx.db.get(location.businessId),
    ]);
    if (!journey) return null;
    return { step, journey, location, business, role: membership.role };
  },
});

export const getStepRecords = query({
  args: { journeyStepId: v.id('journeySteps') },
  returns: v.object({
    documents: v.array(schema.doc('documents')),
    messages: v.array(schema.doc('caseMessages')),
    applications: v.array(schema.doc('applications')),
  }),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step) return { documents: [], messages: [], applications: [] };
    await requireLocation(ctx, step.locationId);
    const directLinks = await ctx.db
      .query('documentLinks')
      .withIndex('by_journeyStepId', (index) =>
        index.eq('journeyStepId', step._id),
      )
      .take(30);
    const requirementLinks = step.requirementId
      ? await ctx.db
          .query('documentLinks')
          .withIndex('by_requirementId', (index) =>
            index.eq('requirementId', step.requirementId),
          )
          .take(30)
      : [];
    const documentIds = [
      ...new Set(
        [...directLinks, ...requirementLinks].map((link) => link.documentId),
      ),
    ];
    const documents = (
      await Promise.all(documentIds.slice(0, 30).map((id) => ctx.db.get(id)))
    ).filter((document): document is Doc<'documents'> =>
      Boolean(document && document.locationId === step.locationId),
    );

    const requirementId = step.requirementId;
    const messageLinks = requirementId
      ? await ctx.db
          .query('messageLinks')
          .withIndex('by_requirementId', (index) =>
            index.eq('requirementId', requirementId),
          )
          .take(20)
      : [];
    const messages = (
      await Promise.all(
        messageLinks.map((link) =>
          ctx.db
            .query('caseMessages')
            .withIndex('by_providerMessageId', (index) =>
              index.eq('providerMessageId', link.providerMessageId),
            )
            .unique(),
        ),
      )
    ).filter((message): message is Doc<'caseMessages'> =>
      Boolean(message && message.locationId === step.locationId),
    );
    const applications = requirementId
      ? await ctx.db
          .query('applications')
          .withIndex('by_requirementId', (index) =>
            index.eq('requirementId', requirementId),
          )
          .take(10)
      : [];
    return { documents, messages, applications };
  },
});

export const startResearch = mutation({
  args: { locationId: v.id('locations'), refresh: v.optional(v.boolean()) },
  returns: v.id('journeys'),
  handler: async (ctx, args) => {
    const { identity, location } = await requireLocation(
      ctx,
      args.locationId,
      'contributor',
    );
    if (location.jurisdictionStatus !== 'confirmed') {
      throw new ConvexError({
        code: 'LOCATION_REQUIRED',
        message: 'Confirm where the business will operate first.',
      });
    }
    const now = Date.now();
    const active = await ctx.db
      .query('journeys')
      .withIndex('by_locationId_and_status', (index) =>
        index.eq('locationId', args.locationId).eq('status', 'researching'),
      )
      .first();
    if (active && now - active.updatedAt < 20 * 60 * 1_000) return active._id;
    if (active) {
      await ctx.db.patch(active._id, {
        status: 'failed',
        errorMessage:
          'The earlier research run stopped responding. Start a fresh route.',
        progressPercent: 100,
        updatedAt: now,
      });
    }

    const previous = await ctx.db
      .query('journeys')
      .withIndex('by_locationId_and_version', (index) =>
        index.eq('locationId', args.locationId),
      )
      .order('desc')
      .first();
    if (previous && !args.refresh) return previous._id;

    if (
      !hasAiProvider() ||
      !env.EXA_API_KEY?.trim() ||
      !env.FIRECRAWL_API_KEY?.trim()
    ) {
      throw new ConvexError({
        code: 'LIVE_PROVIDERS_NOT_CONFIGURED',
        message:
          'Live route research is not configured yet. No placeholder route was created.',
      });
    }

    const periodKey = new Date(now).toISOString().slice(0, 10);
    const usage = await ctx.db
      .query('usageMeters')
      .withIndex('by_organizationId_and_periodKey', (index) =>
        index
          .eq('organizationId', location.organizationId)
          .eq('periodKey', periodKey),
      )
      .unique();
    if ((usage?.researchRuns ?? 0) >= 3) {
      throw new ConvexError({
        code: 'RESEARCH_QUOTA',
        message:
          'This workspace has built three live routes today. Try again tomorrow.',
      });
    }
    if ((usage?.aiOperations ?? 0) + 3 > 25) {
      throw new ConvexError({
        code: 'AI_QUOTA',
        message:
          'There is not enough AI capacity left today to finish a complete route.',
      });
    }
    if (usage) {
      await ctx.db.patch(usage._id, {
        researchRuns: usage.researchRuns + 1,
        aiOperations: usage.aiOperations + 3,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('usageMeters', {
        organizationId: location.organizationId,
        periodKey,
        researchRuns: 1,
        aiOperations: 3,
        approvedSends: 0,
        storedBytes: 0,
        updatedAt: now,
      });
    }
    const journeyId = await ctx.db.insert('journeys', {
      organizationId: location.organizationId,
      locationId: location._id,
      version: (previous?.version ?? 0) + 1,
      status: 'researching',
      researchStage: 'learning',
      progressPercent: 5,
      createdBy: identity.tokenIdentifier,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await start(
      ctx,
      internal.journeyPipeline.buildJourney,
      { journeyId },
      { startAsync: true },
    );
    await ctx.db.patch(journeyId, { workflowId, updatedAt: Date.now() });
    await recordActivity(ctx, {
      organizationId: location.organizationId,
      locationId: location._id,
      actorSubject: identity.tokenIdentifier,
      action: 'journey.research_started',
      entityType: 'journey',
      entityId: journeyId,
      after: { version: (previous?.version ?? 0) + 1 },
    });
    return journeyId;
  },
});

export const setStage = internalMutation({
  args: {
    journeyId: v.id('journeys'),
    stage: journeyResearchStageValidator,
    progressPercent: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.status !== 'researching') return null;
    await ctx.db.patch(args.journeyId, {
      researchStage: args.stage,
      progressPercent: Math.max(0, Math.min(100, args.progressPercent)),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const publishJourney = internalMutation({
  args: {
    journeyId: v.id('journeys'),
    steps: v.array(generatedStepValidator),
    sources: v.array(citationValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.status !== 'researching') return null;
    const sourceMap = new Map(
      args.sources.map((source) => [source.url, source]),
    );
    const oldSteps = await ctx.db
      .query('journeySteps')
      .withIndex('by_journeyId_and_order', (index) =>
        index.eq('journeyId', args.journeyId),
      )
      .take(60);
    for (const step of oldSteps) await ctx.db.delete('journeySteps', step._id);

    const phaseRank = { must: 0, smart: 1, later: 2 } as const;
    const sorted = [...args.steps]
      .slice(0, 30)
      .sort((left, right) => phaseRank[left.phase] - phaseRank[right.phase]);
    const inserted: Id<'journeySteps'>[] = [];
    const now = Date.now();

    for (const [index, generated] of sorted.entries()) {
      const citations = generated.citationUrls
        .map((url) => sourceMap.get(url))
        .filter((source): source is NonNullable<typeof source> =>
          Boolean(source),
        )
        .slice(0, 6);
      const hasOfficialEvidence = citations.some(
        (citation) => citation.official,
      );
      const phase =
        generated.phase === 'must' && !hasOfficialEvidence
          ? 'smart'
          : generated.phase;
      let requirementId: Id<'requirements'> | undefined;
      const officialCitation = citations.find((citation) => citation.official);
      if (phase === 'must' && officialCitation) {
        const matching = await ctx.db
          .query('requirements')
          .withIndex('by_locationId_and_sourceUrl', (queryBuilder) =>
            queryBuilder
              .eq('locationId', journey.locationId)
              .eq('sourceUrl', officialCitation.url),
          )
          .take(20);
        const existing = matching.find(
          (requirement) => requirement.title === generated.title,
        );
        requirementId = existing?._id;
        if (!requirementId) {
          requirementId = await ctx.db.insert('requirements', {
            organizationId: journey.organizationId,
            locationId: journey.locationId,
            title: generated.title,
            description: generated.plainSummary,
            requirementType: 'guided-opening-step',
            status: 'not_started',
            agency: new URL(officialCitation.url).hostname,
            sourceUrl: officialCitation.url,
            sourceTitle: officialCitation.title,
            officialSource: true,
            confidence: 'high',
            capturedAt: now,
            lastVerifiedAt: now,
            confirmedBy: 'ribbondesk-evidence-engine',
            confirmedAt: now,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      const taskId = await ctx.db.insert('tasks', {
        organizationId: journey.organizationId,
        locationId: journey.locationId,
        requirementId,
        title: generated.title,
        description: generated.plainSummary,
        status: 'not_started',
        priority: phase === 'must' ? 'blocking' : 'normal',
        createdBy: journey.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      const journeyStepId = await ctx.db.insert('journeySteps', {
        organizationId: journey.organizationId,
        locationId: journey.locationId,
        journeyId: journey._id,
        phase,
        order: index,
        title: generated.title.slice(0, 160),
        plainSummary: generated.plainSummary.slice(0, 2_000),
        why: generated.why.slice(0, 1_000),
        guide: generated.guide,
        actionType: generated.actionType,
        status:
          index === 0
            ? generated.nextQuestion
              ? 'needs_input'
              : 'ready'
            : 'locked',
        timeEstimate: generated.timeEstimate?.slice(0, 120),
        costSummary: generated.costSummary?.slice(0, 180),
        requiredInfo: generated.requiredInfo.slice(0, 12),
        citations,
        nextQuestion: generated.nextQuestion?.slice(0, 500),
        officialPortalUrl:
          generated.actionType === 'banking'
            ? undefined
            : generated.officialPortalUrl,
        requirementId,
        taskId,
        createdAt: now,
        updatedAt: now,
      });
      inserted.push(journeyStepId);
    }

    if (!inserted.length) {
      await ctx.db.patch(journey._id, {
        status: 'failed',
        errorMessage:
          'No evidence-backed steps could be built for this business.',
        progressPercent: 100,
        updatedAt: now,
      });
      return null;
    }

    const options = await ctx.db
      .query('serviceOptions')
      .withIndex('by_journeyId_and_kind', (index) =>
        index.eq('journeyId', journey._id),
      )
      .take(40);
    for (const option of options) {
      const matchingIndex = sorted.findIndex(
        (step) => step.officialPortalUrl === option.url,
      );
      if (matchingIndex >= 0 && inserted[matchingIndex]) {
        await ctx.db.patch(option._id, {
          journeyStepId: inserted[matchingIndex],
        });
      }
    }

    await ctx.db.patch(journey._id, {
      status: 'active',
      researchStage: 'ready',
      currentStepId: inserted[0],
      progressPercent: 0,
      readyAt: now,
      errorMessage: undefined,
      updatedAt: now,
    });
    await ctx.db.insert('notifications', {
      organizationId: journey.organizationId,
      userTokenIdentifier: journey.createdBy,
      locationId: journey.locationId,
      kind: 'journey_ready',
      title: 'Your business route is ready',
      body: `RibbonDesk built ${inserted.length} clear steps from current source evidence.`,
      urgency: 'normal',
      dedupeKey: `journey-ready:${journey._id}`,
      createdAt: now,
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: { journeyId: v.id('journeys'), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) return null;
    await ctx.db.patch(args.journeyId, {
      status: 'failed',
      errorMessage: args.message.slice(0, 500),
      progressPercent: 100,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const startStep = mutation({
  args: { journeyStepId: v.id('journeySteps') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step)
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Step not found.' });
    const { identity } = await requireLocation(
      ctx,
      step.locationId,
      'contributor',
    );
    if (!['ready', 'needs_input'].includes(step.status)) return null;
    await ctx.db.patch(step._id, {
      status:
        step.nextQuestion && !step.userAnswer ? 'needs_input' : 'in_progress',
      updatedAt: Date.now(),
    });
    await recordActivity(ctx, {
      organizationId: step.organizationId,
      locationId: step.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'journey.step_started',
      entityType: 'journeyStep',
      entityId: step._id,
    });
    return null;
  },
});

export const answerQuestion = mutation({
  args: { journeyStepId: v.id('journeySteps'), answer: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step)
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Step not found.' });
    await requireLocation(ctx, step.locationId, 'contributor');
    const answer = args.answer.trim();
    if (answer.length < 2 || answer.length > 2_000) {
      throw new ConvexError({
        code: 'INVALID_ANSWER',
        message: 'Add a short answer so the guide can continue.',
      });
    }
    const now = Date.now();
    const periodKey = new Date(now).toISOString().slice(0, 10);
    const usage = await ctx.db
      .query('usageMeters')
      .withIndex('by_organizationId_and_periodKey', (index) =>
        index
          .eq('organizationId', step.organizationId)
          .eq('periodKey', periodKey),
      )
      .unique();
    if ((usage?.aiOperations ?? 0) >= 25) {
      throw new ConvexError({
        code: 'AI_QUOTA',
        message: 'The AI guides have reached today’s workspace limit.',
      });
    }
    if (usage) {
      await ctx.db.patch(usage._id, {
        aiOperations: usage.aiOperations + 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('usageMeters', {
        organizationId: step.organizationId,
        periodKey,
        researchRuns: 0,
        aiOperations: 1,
        approvedSends: 0,
        storedBytes: 0,
        updatedAt: now,
      });
    }
    await ctx.db.patch(step._id, {
      userAnswer: answer,
      status: 'in_progress',
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.journeyWorkflow.resolveAnswer, {
      journeyStepId: step._id,
    });
    return null;
  },
});

export const completeStep = mutation({
  args: { journeyStepId: v.id('journeySteps') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step)
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Step not found.' });
    const { identity, location } = await requireLocation(
      ctx,
      step.locationId,
      'contributor',
    );
    if (step.status === 'locked') {
      throw new ConvexError({
        code: 'STEP_LOCKED',
        message: 'Finish the current step first.',
      });
    }
    const now = Date.now();
    await ctx.db.patch(step._id, {
      status: 'done',
      completedAt: now,
      updatedAt: now,
    });
    if (step.taskId) {
      await ctx.db.patch(step.taskId, {
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      });
    }
    if (step.requirementId) {
      await ctx.db.patch(step.requirementId, {
        status: 'completed',
        updatedAt: now,
      });
    }
    const steps = await ctx.db
      .query('journeySteps')
      .withIndex('by_journeyId_and_order', (index) =>
        index.eq('journeyId', step.journeyId),
      )
      .take(60);
    const remaining = steps
      .filter((item) => item._id !== step._id)
      .filter((item) => !['done', 'skipped'].includes(item.status))
      .filter(
        (item) =>
          item.phase !== 'later' || location.lifecycleStage === 'operating',
      )
      .sort((left, right) => left.order - right.order);
    const next = remaining[0];
    if (next?.status === 'locked') {
      await ctx.db.patch(next._id, {
        status: next.nextQuestion ? 'needs_input' : 'ready',
        updatedAt: now,
      });
    }
    const projected = steps.map((item) =>
      item._id === step._id ? { ...item, status: 'done' } : item,
    );
    await ctx.db.patch(step.journeyId, {
      currentStepId: next?._id,
      status: next ? 'active' : 'completed',
      progressPercent: progressFor(projected),
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: step.organizationId,
      locationId: step.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'journey.step_completed',
      entityType: 'journeyStep',
      entityId: step._id,
      before: { status: step.status },
      after: { status: 'done', nextStepId: next?._id },
    });
    return null;
  },
});

export const skipOptionalStep = mutation({
  args: { journeyStepId: v.id('journeySteps') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step)
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Step not found.' });
    if (step.phase === 'must') {
      throw new ConvexError({
        code: 'REQUIRED_STEP',
        message: 'A required opening step cannot be skipped.',
      });
    }
    const { identity, location } = await requireLocation(
      ctx,
      step.locationId,
      'contributor',
    );
    const now = Date.now();
    await ctx.db.patch(step._id, { status: 'skipped', updatedAt: now });
    const [journey, steps] = await Promise.all([
      ctx.db.get(step.journeyId),
      ctx.db
        .query('journeySteps')
        .withIndex('by_journeyId_and_order', (index) =>
          index.eq('journeyId', step.journeyId),
        )
        .take(60),
    ]);
    if (!journey) return null;
    const projected = steps.map((item) =>
      item._id === step._id ? { ...item, status: 'skipped' } : item,
    );
    const remaining = projected
      .filter((item) => !['done', 'skipped'].includes(item.status))
      .filter(
        (item) =>
          item.phase !== 'later' || location.lifecycleStage === 'operating',
      )
      .sort((left, right) => left.order - right.order);
    const next = remaining[0];
    if (journey.currentStepId === step._id && next?.status === 'locked') {
      await ctx.db.patch(next._id, {
        status: next.nextQuestion ? 'needs_input' : 'ready',
        updatedAt: now,
      });
    }
    await ctx.db.patch(journey._id, {
      currentStepId:
        journey.currentStepId === step._id ? next?._id : journey.currentStepId,
      status:
        journey.currentStepId === step._id
          ? next
            ? 'active'
            : 'completed'
          : journey.status,
      progressPercent: progressFor(projected),
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: step.organizationId,
      locationId: step.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'journey.optional_step_skipped',
      entityType: 'journeyStep',
      entityId: step._id,
      before: { status: step.status },
      after: { status: 'skipped' },
    });
    return null;
  },
});

export const activateAfterOpening = mutation({
  args: { journeyId: v.id('journeys') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Journey not found.',
      });
    }
    const { identity, location } = await requireLocation(
      ctx,
      journey.locationId,
      'admin',
    );
    if (['paused', 'closed'].includes(location.lifecycleStage)) {
      throw new ConvexError({
        code: 'INVALID_LIFECYCLE',
        message: 'Resume this location before starting after-opening work.',
      });
    }
    const laterSteps = await ctx.db
      .query('journeySteps')
      .withIndex('by_journeyId_and_order', (index) =>
        index.eq('journeyId', journey._id),
      )
      .take(60);
    const next = laterSteps
      .filter((step) => step.phase === 'later')
      .filter((step) => !['done', 'skipped'].includes(step.status))
      .sort((left, right) => left.order - right.order)[0];
    if (!next) return null;
    const now = Date.now();
    if (location.lifecycleStage !== 'operating') {
      await ctx.db.patch(location._id, {
        lifecycleStage: 'operating',
        nextSourceCheckAt: now + 30 * 24 * 60 * 60 * 1_000,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.operations.activateOperatingLifecycle,
        {
          locationId: location._id,
          actorSubject: identity.tokenIdentifier,
        },
      );
    }
    if (next.status === 'locked') {
      await ctx.db.patch(next._id, {
        status: next.nextQuestion ? 'needs_input' : 'ready',
        updatedAt: now,
      });
    }
    await ctx.db.patch(journey._id, {
      currentStepId: next._id,
      status: 'active',
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: journey.organizationId,
      locationId: journey.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'journey.after_opening_activated',
      entityType: 'journey',
      entityId: journey._id,
      before: { lifecycleStage: location.lifecycleStage },
      after: { lifecycleStage: 'operating', currentStepId: next._id },
    });
    return null;
  },
});

export const attachProof = mutation({
  args: {
    journeyStepId: v.id('journeySteps'),
    documentId: v.id('documents'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const [step, document] = await Promise.all([
      ctx.db.get(args.journeyStepId),
      ctx.db.get(args.documentId),
    ]);
    if (!step || !document || document.locationId !== step.locationId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'The file or journey step is not available.',
      });
    }
    const { identity } = await requireLocation(
      ctx,
      step.locationId,
      'contributor',
    );
    if (document.status === 'rejected') {
      throw new ConvexError({
        code: 'INVALID_DOCUMENT',
        message: document.rejectionReason ?? 'This file was not accepted.',
      });
    }
    const existing = await ctx.db
      .query('documentLinks')
      .withIndex('by_documentId', (index) =>
        index.eq('documentId', document._id),
      )
      .take(20);
    if (!existing.some((link) => link.journeyStepId === step._id)) {
      await ctx.db.insert('documentLinks', {
        organizationId: step.organizationId,
        documentId: document._id,
        journeyStepId: step._id,
        requirementId: step.requirementId,
        linkType: 'evidence',
        createdBy: identity.tokenIdentifier,
        createdAt: Date.now(),
      });
    }
    await recordActivity(ctx, {
      organizationId: step.organizationId,
      locationId: step.locationId,
      actorSubject: identity.tokenIdentifier,
      action: 'journey.proof_attached',
      entityType: 'journeyStep',
      entityId: step._id,
      after: { documentId: document._id, fileName: document.fileName },
    });
    return null;
  },
});

export const setResolvedAnswer = internalMutation({
  args: {
    journeyStepId: v.id('journeySteps'),
    summary: v.string(),
    why: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step) return null;
    await ctx.db.patch(step._id, {
      plainSummary: args.summary.slice(0, 2_000),
      why: args.why.slice(0, 1_000),
      nextQuestion: undefined,
      status: 'ready',
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateScreenAnalysis = internalMutation({
  args: { journeyStepId: v.id('journeySteps'), analysis: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.journeyStepId);
    if (!step) return null;
    await ctx.db.patch(step._id, {
      screenAnalysis: args.analysis.slice(0, 3_000),
      updatedAt: Date.now(),
    });
    return null;
  },
});
