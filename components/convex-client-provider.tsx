'use client';

import { ConvexBetterAuthProvider, type AuthClient } from '@convex-dev/better-auth/react';
import { ConvexReactClient } from 'convex/react';
import { useEffect, useRef, useState } from 'react';

import { authClient } from '@/lib/auth-client';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

type CallbackState = 'checking' | 'ready' | 'failed';

function GoogleCallbackGate({ children }: { children: React.ReactNode }) {
  const handled = useRef(false);
  const [state, setState] = useState<CallbackState>(() => {
    if (typeof window === 'undefined') return 'checking';
    return new URL(window.location.href).searchParams.has('ott') ? 'checking' : 'ready';
  });

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const url = new URL(window.location.href);
    const token = url.searchParams.get('ott');
    if (!token) return;

    url.searchParams.delete('ott');
    window.history.replaceState({}, '', url);

    void (async () => {
      try {
        const result = await authClient.crossDomain.oneTimeToken.verify({ token });
        const session = result.data?.session;
        if (!session?.token) throw new Error('Google did not return a valid RibbonDesk session.');

        const sessionResult = await authClient.getSession({
          fetchOptions: {
            headers: { Authorization: `Bearer ${session.token}` },
          },
        });
        if (sessionResult.error || !sessionResult.data?.session) {
          throw new Error(sessionResult.error?.message || 'RibbonDesk could not confirm the Google session.');
        }

        void authClient.updateSession();
        setState('ready');
      } catch (error) {
        console.error('Google OAuth callback failed', error);
        setState('failed');
      }
    })();
  }, []);

  if (state === 'checking') {
    return (
      <main className="auth-page grid min-h-screen place-items-center px-5">
        <output className="rounded-2xl border bg-background px-5 py-4 text-sm font-medium shadow-sm">
          Finishing your Google sign-in…
        </output>
      </main>
    );
  }

  if (state === 'failed') {
    return (
      <main className="auth-page grid min-h-screen place-items-center px-5">
        <section className="w-full max-w-md rounded-3xl border bg-background p-6 shadow-sm">
          <h1 className="font-heading text-2xl font-semibold">Google sign-in was not completed</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The temporary sign-in link may have expired or already been used. Start Google sign-in again to create a fresh link.
          </p>
          <button
            type="button"
            className="mt-5 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => window.location.assign('/app')}
          >
            Return to sign in
          </button>
        </section>
      </main>
    );
  }

  return children;
}

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  if (!convex) return children;

  return (
    <GoogleCallbackGate>
      <ConvexBetterAuthProvider client={convex} authClient={authClient as unknown as AuthClient}>
        {children}
      </ConvexBetterAuthProvider>
    </GoogleCallbackGate>
  );
}
