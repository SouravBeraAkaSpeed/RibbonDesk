import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Fingerprint, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Your desk',
  description: 'Create or unlock a secure RibbonDesk workspace with a passkey.',
};

export default function AppEntryPage() {
  return (
    <main className="ribbon-grid grid min-h-screen place-items-center bg-[var(--paper-strong)] px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to RibbonDesk
        </Link>
        <section className="overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-[0_24px_80px_rgb(28_37_51/14%)]">
          <div className="border-b border-border bg-[var(--ink)] px-6 py-7 text-white">
            <Badge className="bg-white/10 text-white"><Sparkles data-icon="inline-start" />Private beta</Badge>
            <h1 className="mt-5 font-heading text-3xl font-semibold tracking-[-0.035em]">Your compliance desk, secured by a passkey.</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">No password to remember. Your device confirms it is you.</p>
          </div>
          <div className="p-6">
            <div className="grid size-12 place-items-center rounded-2xl bg-[var(--ribbon-soft)] text-[var(--ribbon)]"><Fingerprint className="size-6" /></div>
            <h2 className="mt-5 text-lg font-semibold">Create or unlock your workspace</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Passkey account activation will open when the secure Convex identity service is connected.</p>
            <Button className="mt-6 h-11 w-full bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]" disabled>
              <KeyRound data-icon="inline-start" /> Continue with a passkey
            </Button>
            <Button nativeButton={false} variant="outline" className="mt-3 h-11 w-full" render={<Link href="/demo" />}>Explore the demo instead</Button>
            <div className="mt-6 flex gap-3 rounded-xl bg-[var(--sage-soft)] p-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" />
              Compliance-impacting AI suggestions and outgoing messages always require an authorized human approval.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
