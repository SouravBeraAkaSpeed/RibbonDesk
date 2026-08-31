import { verifyAgentMailWebhook, WebhookVerificationError } from '@agentmail/convex';
import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { env, httpAction } from './_generated/server';
import { authComponent, createAuth } from './auth';

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  cors: true,
  trustedOrigins: [env.SITE_URL],
});

http.route({
  path: '/agentmail/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const secret = env.AGENTMAIL_WEBHOOK_SECRET?.trim();
    if (!secret) return new Response('webhook is not configured', { status: 503 });
    const rawBody = await request.text();
    try {
      const event = verifyAgentMailWebhook(secret, rawBody, {
        'svix-id': request.headers.get('svix-id') ?? '',
        'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
        'svix-signature': request.headers.get('svix-signature') ?? '',
      });
      await ctx.runMutation(internal.inbox.onAgentMailEvent, { event });
      return new Response(null, { status: 204 });
    } catch (error) {
      if (error instanceof WebhookVerificationError) return new Response('invalid signature', { status: 401 });
      throw error;
    }
  }),
});

export default http;
