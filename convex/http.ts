import { AgentMail } from '@agentmail/convex';
import { httpRouter } from 'convex/server';

import { components, internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { authComponent, createAuth } from './auth';

const http = httpRouter();
const agentmail = new AgentMail(components.agentmail, { onMessageReceived: internal.inbox.onMessageReceived });

authComponent.registerRoutes(http, createAuth, { cors: true });

http.route({
  path: '/agentmail/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => await agentmail.handleWebhook(ctx as unknown as Parameters<typeof agentmail.handleWebhook>[0], request)),
});

export default http;
