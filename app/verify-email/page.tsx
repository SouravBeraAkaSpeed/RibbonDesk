'use client';

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  MailCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type ConfirmationState = 'checking' | 'confirmed' | 'invalid';

export default function VerifyEmailPage() {
  const started = useRef(false);
  const [state, setState] = useState<ConfirmationState>('checking');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const parameters = new URLSearchParams(window.location.hash.slice(1));
    const token = parameters.get('token');
    window.history.replaceState({}, '', '/verify-email');

    if (!token) {
      queueMicrotask(() => setState('invalid'));
      return;
    }

    void (async () => {
      try {
        const result = await authClient.verifyEmail({ query: { token } });
        setState(result.error ? 'invalid' : 'confirmed');
      } catch {
        setState('invalid');
      }
    })();
  }, []);

  const isChecking = state === 'checking';
  const isConfirmed = state === 'confirmed';

  return (
    <main className="auth-page grid min-h-screen place-items-center px-5 py-10">
      <section
        aria-live="polite"
        className="auth-card w-full max-w-lg overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_24px_80px_rgb(28_37_51/14%)]"
      >
        <div className="border-b border-border bg-[var(--ink)] px-6 py-7 text-white">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/10">
            <MailCheck className="size-6" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
            RibbonDesk account
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.035em]">
            {isChecking
              ? 'Confirming your email…'
              : isConfirmed
                ? 'Your email is confirmed.'
                : 'This link cannot be used.'}
          </h1>
        </div>

        <div className="p-6">
          {isChecking ? (
            <div className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
              <LoaderCircle className="mt-1 size-4 shrink-0 animate-spin text-[var(--ribbon)]" />
              Keep this page open for a moment while RibbonDesk checks the
              private confirmation link.
            </div>
          ) : isConfirmed ? (
            <>
              <div className="flex items-start gap-3 rounded-2xl bg-[var(--sage-soft)] p-4 text-sm leading-6 text-[var(--sage)]">
                <CheckCircle2 className="mt-1 size-5 shrink-0" />
                <p>
                  Your account is ready. Sign in once with the email and
                  password you created to open your desk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.location.assign('/app?verified=1')}
                className={cn(
                  buttonVariants(),
                  'mt-6 h-11 w-full bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]',
                )}
              >
                Continue to sign in <ArrowRight />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-2xl bg-[var(--amber-soft)] p-4 text-sm leading-6 text-[var(--amber)]">
                <AlertTriangle className="mt-1 size-5 shrink-0" />
                <p>
                  The confirmation link is incomplete, expired, or was already
                  replaced. Return to sign in and ask RibbonDesk for a fresh
                  email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.location.assign('/app')}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'mt-6 h-11 w-full',
                )}
              >
                Return to sign in
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
