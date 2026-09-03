import { FirecrawlClient } from '@firecrawl/firecrawl-convex';
import { generateText, Output } from 'ai';
import { v } from 'convex/values';
import { z } from 'zod';

import { components } from './_generated/api';
import { env, internalAction } from './_generated/server';
import { listAgentMailInboxes } from './lib/agentMailClient';
import {
  COMPLEX_MODEL,
  FAST_MODEL,
  complexModel,
  fastModel,
  hasAiProvider,
  openAiProviderOptions,
} from './lib/aiProvider';

const firecrawl = new FirecrawlClient(components.firecrawl);

const checkValidator = v.object({
  configured: v.boolean(),
  healthy: v.boolean(),
  detail: v.string(),
});

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown provider error';
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/(?:fc|sk|key|whsec)[-_][A-Za-z0-9._-]+/gi, '[redacted]')
    .slice(0, 300);
}

export const verify = internalAction({
  args: {},
  returns: v.object({
    openai: checkValidator,
    firecrawl: checkValidator,
    agentmail: checkValidator,
  }),
  handler: async (ctx) => {
    const openaiConfigured = hasAiProvider();
    const firecrawlConfigured = Boolean(env.FIRECRAWL_API_KEY?.trim());
    const agentmailConfigured = Boolean(env.AGENTMAIL_API_KEY?.trim());

    const [openaiResult, firecrawlResult, agentmailResult] =
      await Promise.allSettled([
        openaiConfigured
          ? Promise.all([
              generateText({
                model: fastModel(),
                prompt: 'Reply with exactly: provider health check passed',
                maxOutputTokens: 32,
                providerOptions: openAiProviderOptions({
                  reasoningEffort: 'none',
                }),
              }),
              generateText({
                model: complexModel({ structured: true }),
                output: Output.object({
                  schema: z.object({ status: z.literal('ok') }),
                }),
                prompt: 'Return the requested health status.',
                providerOptions: openAiProviderOptions({
                  reasoningEffort: 'none',
                }),
              }),
            ])
          : Promise.reject(new Error('OPENAI_API_KEY is not configured.')),
        firecrawlConfigured
          ? firecrawl.scrape(
              ctx,
              'https://www.nyc.gov/site/doh/business/food-operators/opening-a-restaurant.page',
              {
                formats: ['markdown'],
                onlyMainContent: true,
                maxAge: 3_600_000,
              },
            )
          : Promise.reject(new Error('FIRECRAWL_API_KEY is not configured.')),
        agentmailConfigured
          ? listAgentMailInboxes(1)
          : Promise.reject(new Error('AGENTMAIL_API_KEY is not configured.')),
      ]);

    return {
      openai:
        openaiResult.status === 'fulfilled'
          ? {
              configured: true,
              healthy:
                openaiResult.value[0].text
                  .toLowerCase()
                  .includes('health check passed') &&
                openaiResult.value[1].output.status === 'ok',
              detail: `OpenAI responded through ${FAST_MODEL} and ${COMPLEX_MODEL}, including structured output.`,
            }
          : {
              configured: openaiConfigured,
              healthy: false,
              detail: safeError(openaiResult.reason),
            },
      firecrawl:
        firecrawlResult.status === 'fulfilled'
          ? {
              configured: true,
              healthy: Boolean(firecrawlResult.value.markdown?.trim()),
              detail: 'Firecrawl returned content from an official NYC source.',
            }
          : {
              configured: firecrawlConfigured,
              healthy: false,
              detail: safeError(firecrawlResult.reason),
            },
      agentmail:
        agentmailResult.status === 'fulfilled'
          ? {
              configured: true,
              healthy: true,
              detail: 'AgentMail accepted a live inbox-list request.',
            }
          : {
              configured: agentmailConfigured,
              healthy: false,
              detail: safeError(agentmailResult.reason),
            },
    };
  },
});
