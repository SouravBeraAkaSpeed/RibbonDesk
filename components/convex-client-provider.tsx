'use client';

import { ConvexBetterAuthProvider, type AuthClient } from '@convex-dev/better-auth/react';
import { ConvexReactClient } from 'convex/react';

import { authClient } from '@/lib/auth-client';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  if (!convex) return children;

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient as unknown as AuthClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
