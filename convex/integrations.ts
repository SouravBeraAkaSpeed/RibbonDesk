import { ConvexError, v } from 'convex/values';

import { env, query } from './_generated/server';
import { hasAiProvider } from './lib/aiProvider';

function configured(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 8 && !normalized.includes('mock');
}

export const status = query({
  args: {},
  returns: v.object({
    mode: v.union(v.literal('live'), v.literal('replay')),
    ai: v.boolean(),
    firecrawl: v.boolean(),
    agentmail: v.boolean(),
    researchReady: v.boolean(),
    inboxReady: v.boolean(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: 'UNAUTHENTICATED',
        message: 'Sign in to inspect workspace integrations.',
      });
    }
    const mode: 'live' | 'replay' =
      env.RIBBONDESK_PROVIDER_MODE === 'replay' ? 'replay' : 'live';
    const ai = hasAiProvider();
    const firecrawl = configured(env.FIRECRAWL_API_KEY);
    const agentmail = configured(env.AGENTMAIL_API_KEY);
    return {
      mode,
      ai,
      firecrawl,
      agentmail,
      researchReady: mode === 'live' && ai && firecrawl,
      inboxReady: mode === 'live' && ai && agentmail,
    };
  },
});
