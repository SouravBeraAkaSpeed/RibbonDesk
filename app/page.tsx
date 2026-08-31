import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  FileCheck2,
  Inbox,
  MailCheck,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const requirements = [
  {
    title: 'Food Service Establishment Permit',
    agency: 'NYC Health',
    detail: 'Application packet ready for review',
    state: 'Ready',
    tone: 'sage',
  },
  {
    title: 'Certificate of Authority',
    agency: 'New York State Tax',
    detail: 'Waiting on agency confirmation',
    state: 'Waiting',
    tone: 'amber',
  },
  {
    title: 'Certificate of Occupancy',
    agency: 'NYC Buildings',
    detail: 'Blocks the opening milestone',
    state: 'Blocked',
    tone: 'coral',
  },
] as const;

const signals = [
  { label: 'Permit packet', value: 'Ready to review', icon: FileCheck2 },
  { label: 'Case inbox', value: '2 replies need you', icon: Inbox },
  { label: 'Next deadline', value: 'Sep 14', icon: CalendarClock },
] as const;

export default function Home() {
  return (
    <main className="depth-landing min-h-screen overflow-hidden text-foreground">
      <header className="depth-header sticky top-0 z-40 border-b border-white/40 bg-background/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label="RibbonDesk home"
          >
            <span className="depth-brand-mark relative grid size-9 place-items-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm">
              <span className="absolute -right-2 -top-3 h-8 w-5 rotate-45 bg-[var(--ribbon)]" />
              <span className="relative font-heading text-lg font-bold">R</span>
            </span>
            <span className="font-heading text-xl font-semibold tracking-[-0.02em]">
              RibbonDesk
            </span>
          </Link>

          <nav
            className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
            aria-label="Primary navigation"
          >
            <Link
              href="#how-it-works"
              className="transition-colors hover:text-foreground"
            >
              How it works
            </Link>
            <Link
              href="#daily-desk"
              className="transition-colors hover:text-foreground"
            >
              Daily desk
            </Link>
            <Link
              href="/disclaimer"
              className="transition-colors hover:text-foreground"
            >
              Trust &amp; safety
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/app" />}
            >
              Sign in
            </Button>
            <Button
              nativeButton={false}
              className="hidden bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)] sm:inline-flex"
              render={<Link href="/demo" />}
            >
              Explore demo
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </header>

      <section className="hero-stage relative border-b border-white/35 px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:px-12">
        <div className="ribbon-grid pointer-events-none absolute inset-0 opacity-45" />
        <div className="relative mx-auto grid w-full max-w-[1440px] items-center gap-14 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
          <div className="hero-copy max-w-2xl">
            <Badge
              variant="outline"
              className="mb-6 h-7 border-[var(--ribbon)]/35 bg-[var(--ribbon-soft)] px-3 text-[var(--ribbon-dark)]"
            >
              <Sparkles data-icon="inline-start" />
              Your opening, organized and evidence-backed
            </Badge>
            <h1 className="hero-title font-heading text-[clamp(3.15rem,6vw,6.6rem)] font-semibold leading-[0.88] tracking-[-0.055em] text-balance">
              Open right.
              <span className="mt-2 block text-[var(--ribbon)]">
                Stay ready.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              One live desk for permits, applications, inspections, agency
              email, evidence, and renewals—built for every local business.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                nativeButton={false}
                size="lg"
                className="h-11 bg-[var(--ribbon)] px-5 text-white hover:bg-[var(--ribbon-dark)]"
                render={<Link href="/demo" />}
              >
                Explore the live demo
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                nativeButton={false}
                size="lg"
                variant="outline"
                className="h-11 px-5"
                render={<Link href="/app" />}
              >
                Start with a passkey
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {[
                'Official-source citations',
                'Human approval gates',
                'Realtime teamwork',
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-[var(--sage-soft)] text-[var(--sage)]">
                    <Check className="size-3.5" />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div id="daily-desk" className="hero-desk-scene relative lg:pl-4">
            <div className="absolute -inset-5 -z-10 rounded-[2.4rem] bg-[var(--ribbon-soft)] blur-2xl" />
            <div className="floating-chip floating-chip-top">
              <ShieldCheck className="size-3.5" /> Official source verified
            </div>
            <div className="floating-chip floating-chip-side">
              <MailCheck className="size-3.5" /> Agency reply triaged
            </div>
            <div className="floating-chip floating-chip-bottom">
              <CalendarClock className="size-3.5" /> Renewal watched
            </div>
            <div className="depth-dashboard overflow-hidden rounded-[1.75rem] border border-white/65 bg-card/88 shadow-[0_38px_110px_rgb(28_37_51/22%)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border bg-[var(--paper-strong)] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--ink)] text-white">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Marlow Coffee</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> Brooklyn, New York
                    </p>
                  </div>
                </div>
                <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">
                  Verified pack
                </Badge>
              </div>

              <div className="grid gap-5 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <div className="mb-2 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Opening readiness
                        </p>
                        <p className="mt-1 font-heading text-4xl font-semibold tracking-tight">
                          68%
                        </p>
                      </div>
                      <p className="text-right text-xs leading-5 text-muted-foreground">
                        3 blockers
                        <br />
                        42 days to target
                      </p>
                    </div>
                    <Progress
                      value={68}
                      className="[&_[data-slot=progress-indicator]]:bg-[var(--sage)]"
                      aria-label="Opening readiness 68 percent"
                    />
                  </div>
                  <Button
                    nativeButton={false}
                    variant="outline"
                    className="h-9"
                    render={<Link href="/demo" />}
                  >
                    Open command center
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {signals.map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="depth-panel rounded-xl border border-white/65 bg-background/72 p-3.5"
                    >
                      <Icon className="mb-4 size-4 text-[var(--ribbon)]" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        What needs you today
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Ordered by impact on your opening
                      </p>
                    </div>
                    <span className="text-xs font-medium text-[var(--ribbon)]">
                      View plan
                    </span>
                  </div>
                  <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {requirements.map((item) => (
                      <div
                        key={item.title}
                        className="group flex items-center gap-3 bg-card px-3.5 py-3 transition-colors hover:bg-muted/50"
                      >
                        <span
                          className={`status-dot status-dot-${item.tone}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="truncate text-sm font-semibold">
                              {item.title}
                            </p>
                            <span className="text-[11px] text-muted-foreground">
                              {item.agency}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.detail}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`status-badge status-badge-${item.tone}`}
                        >
                          {item.state}
                        </Badge>
                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[var(--sage)]/25 bg-[var(--sage-soft)] p-4">
                  <MailCheck className="mt-0.5 size-5 shrink-0 text-[var(--sage)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      Agency reply received
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Ribbon Assistant found a new inspection date and prepared
                      a cited update for your approval.
                    </p>
                  </div>
                  <Badge className="bg-card text-[var(--sage)] shadow-sm">
                    Review
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="depth-ink-section px-5 py-14 text-white sm:px-8 sm:py-16 lg:px-12"
      >
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              From uncertainty to evidence
            </p>
            <h2 className="mt-4 max-w-lg font-heading text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">
              A living case file—not another static checklist.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                number: '01',
                title: 'Discover',
                copy: 'Research official sources for your exact business and location.',
                icon: Sparkles,
              },
              {
                number: '02',
                title: 'Coordinate',
                copy: 'Turn requirements, evidence, and agency replies into owned work.',
                icon: MailCheck,
              },
              {
                number: '03',
                title: 'Stay ready',
                copy: 'Monitor renewals, inspections, notices, and source changes.',
                icon: ShieldCheck,
              },
            ].map(({ number, title, copy, icon: Icon }) => (
              <article
                key={number}
                className="depth-panel depth-panel-dark rounded-2xl border border-white/14 bg-white/7 p-5 backdrop-blur-xl"
              >
                <div className="mb-7 flex items-center justify-between text-white/55">
                  <span className="font-mono text-xs">{number}</span>
                  <Icon className="size-5 text-[var(--ribbon-light)]" />
                </div>
                <h3 className="font-heading text-2xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="depth-footer border-t border-white/40 bg-[var(--paper-strong)]/72 px-5 py-6 backdrop-blur-xl sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            RibbonDesk organizes information and work. It does not provide legal
            advice.
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/disclaimer" className="hover:text-foreground">
              Disclaimer
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
