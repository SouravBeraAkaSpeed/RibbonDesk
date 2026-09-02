'use client';

import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useConvexAuth } from 'convex/react';

import { Button } from '@/components/ui/button';

export function LandingHeaderActions() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="rd-header-actions" aria-label="Checking account status">
        <span className="h-10 w-32 animate-pulse rounded-xl bg-black/5" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="rd-header-actions">
        <Button
          nativeButton={false}
          className="rd-button rd-button-primary"
          render={<Link href="/app" />}
        >
          Continue my journey
        </Button>
      </div>
    );
  }

  return (
    <div className="rd-header-actions">
      <Link href="/app" className="rd-login">
        Sign in
      </Link>
      <Button
        nativeButton={false}
        className="rd-button rd-button-primary"
        render={<Link href="/app" />}
      >
        Start free
      </Button>
    </div>
  );
}

export function LandingWorkspaceButton({
  signedOutLabel,
  signedInLabel = 'Continue my journey',
}: {
  signedOutLabel: string;
  signedInLabel?: string;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const label = isAuthenticated ? signedInLabel : signedOutLabel;

  return (
    <Button
      nativeButton={false}
      size="lg"
      className="rd-button rd-button-primary"
      render={<Link href="/app" aria-disabled={isLoading} />}
    >
      {isLoading ? 'Checking your workspace…' : label}
      <ArrowRight data-icon="inline-end" />
    </Button>
  );
}

export function LandingWorkspaceLink({
  signedOutLabel,
  signedInLabel = 'Open my journey',
}: {
  signedOutLabel: string;
  signedInLabel?: string;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <Link href="/app" className="rd-text-link" aria-disabled={isLoading}>
      {isLoading
        ? 'Checking your workspace…'
        : isAuthenticated
          ? signedInLabel
          : signedOutLabel}{' '}
      <ChevronRight />
    </Link>
  );
}
