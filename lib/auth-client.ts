'use client';

import { passkeyClient } from '@better-auth/passkey/client';
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    passkeyClient(),
    convexClient(),
    // Do not cache get-session responses across the OAuth handoff. A slower
    // pre-callback request must never overwrite the newly exchanged session.
    crossDomainClient({ disableCache: true }),
  ],
});
