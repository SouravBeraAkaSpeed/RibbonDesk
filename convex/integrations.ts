import { ConvexError, v } from 'convex/values';

import { query } from './_generated/server';

function configured(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 8 && !normalized.includes('mock');
}

export const status = query({
  args: {},
  returns: v.object({
    mode: v.union(v.literal('live'), v.literal('replay')),
    openai: v.boolean(),
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
      process.env.RIBBONDESK_PROVIDER_MODE === 'replay' ? 'replay' : 'live';
    const openai = configured(process.env.OPENAI_API_KEY);
    const firecrawl = configured(process.env.FIRECRAWL_API_KEY);
    const agentmail = configured(process.env.AGENTMAIL_API_KEY);
    return {
      mode,
      openai,
      firecrawl,
      agentmail,
      researchReady: mode === 'live' && openai && firecrawl,
      inboxReady: mode === 'live' && openai && agentmail,
    };
  },
});
