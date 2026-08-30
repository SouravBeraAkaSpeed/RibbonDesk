import agentmail from '@agentmail/convex/convex.config';
import agent from '@convex-dev/agent/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config.js';
import workflow from '@convex-dev/workflow/convex.config.js';
import firecrawl from '@firecrawl/firecrawl-convex/convex.config';
import { defineApp } from 'convex/server';
import { v } from 'convex/values';

import betterAuth from './betterAuth/convex.config';

const app = defineApp({
  env: {
    FIRECRAWL_API_KEY: v.string(),
    FIRECRAWL_API_URL: v.optional(v.string()),
    FIRECRAWL_WEBHOOK_SECRET: v.optional(v.string()),
    OPENAI_API_KEY: v.optional(v.string()),
    RIBBONDESK_PROVIDER_MODE: v.optional(v.string()),
  },
});

app.use(betterAuth);
app.use(agent);
app.use(workflow);
app.use(rateLimiter);
app.use(agentmail);
app.use(firecrawl, {
  httpPrefix: '/firecrawl/',
  env: {
    FIRECRAWL_API_KEY: app.env.FIRECRAWL_API_KEY,
    FIRECRAWL_API_URL: app.env.FIRECRAWL_API_URL,
    FIRECRAWL_WEBHOOK_SECRET: app.env.FIRECRAWL_WEBHOOK_SECRET,
  },
});

export default app;
