import { WorkflowManager } from '@convex-dev/workflow';
import { v } from 'convex/values';

import { components, internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';

const workflow = new WorkflowManager(components.workflow);

function friendlyPipelineError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/429|rate.?limit|quota|credit/i.test(message)) {
    return 'A live research provider is temporarily at its limit. Your work is saved; try the route again shortly.';
  }
  if (
    /no usable official sources|no evidence could be captured/i.test(message)
  ) {
    return 'RibbonDesk could not find enough authoritative public information for this route. Check the business location and try again.';
  }
  if (/Firecrawl could not capture/i.test(message)) {
    return 'The official pages were found, but they could not be saved safely. Try the research again shortly.';
  }
  return 'One of the live sources did not respond cleanly. Your business details are safe; try the research again.';
}

export const buildJourney = workflow
  .define({
    args: { journeyId: v.id('journeys') },
    returns: v.null(),
  })
  .handler(async (step, args): Promise<null> => {
    try {
      await step.runMutation(internal.journey.setStage, {
        journeyId: args.journeyId,
        stage: 'finding_sources',
        progressPercent: 18,
      });
      const sources = await step.runAction(
        internal.journeyWorkflow.discoverSources,
        args,
        { retry: true },
      );
      await step.runMutation(internal.journey.setStage, {
        journeyId: args.journeyId,
        stage: 'checking_guidance',
        progressPercent: 36,
      });
      await step.runAction(
        internal.journeyWorkflow.captureSources,
        { journeyId: args.journeyId, sources },
        { retry: true },
      );
      await step.runAction(
        internal.journeyWorkflow.runSpecialist,
        { journeyId: args.journeyId, specialist: 'legal' },
        { retry: true },
      );
      await step.runAction(
        internal.journeyWorkflow.runSpecialist,
        { journeyId: args.journeyId, specialist: 'money_tax' },
        { retry: true },
      );
      await step.runMutation(internal.journey.setStage, {
        journeyId: args.journeyId,
        stage: 'building_route',
        progressPercent: 76,
      });
      const steps = await step.runAction(
        internal.journeyWorkflow.composeJourney,
        args,
        { retry: true },
      );
      await step.runMutation(internal.journey.setStage, {
        journeyId: args.journeyId,
        stage: 'double_checking',
        progressPercent: 92,
      });
      const context: {
        sources: Array<Doc<'sourceSnapshots'>>;
      } | null = await step.runQuery(
        internal.journeyContext.getEvidenceContext,
        args,
      );
      const sourcesForPublish = (context?.sources ?? [])
        .slice(0, 40)
        .map((source) => ({
          url: source.url,
          title: source.title,
          ...(source.excerpt ? { excerpt: source.excerpt } : {}),
          official: source.official,
          ...(source.sourceTier ? { sourceTier: source.sourceTier } : {}),
        }));
      await step.runMutation(internal.journey.publishJourney, {
        journeyId: args.journeyId,
        steps,
        sources: sourcesForPublish,
      });
    } catch (error) {
      await step.runMutation(internal.journey.markFailed, {
        journeyId: args.journeyId,
        message: friendlyPipelineError(error),
      });
    }
    return null;
  });
