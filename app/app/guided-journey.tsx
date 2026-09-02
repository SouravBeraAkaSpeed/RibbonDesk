'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Files,
  FileText,
  Fingerprint,
  Globe2,
  Inbox,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Map,
  Mail,
  MessageCircleQuestion,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Route,
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAction, useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';

import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { authClient } from '@/lib/auth-client';

import { CaseInboxPanel } from './case-inbox-panel';
import { DataControlsPanel } from './data-controls-panel';
import { EvidenceApplicationsPanel } from './evidence-applications-panel';
import { TeamPanel } from './team-panel';
import { WorkspaceSearch } from './workspace-search';

type Role = 'owner' | 'admin' | 'contributor' | 'viewer';
type JourneyStep = Doc<'journeySteps'>;
type CurrentJourneyResult = FunctionReturnType<typeof api.journey.getCurrent>;

function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Something went wrong. Please try again.';
}

function compactEvidence(value: string, max = 420) {
  const plain = value
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}

const legacyRoutes: Record<string, string> = {
  '/app/plan': '/app',
  '/app/assistant': '/app',
  '/app/inbox': '/app/more/inbox',
  '/app/documents': '/app/more/files',
  '/app/operations': '/app/roadmap',
  '/app/team': '/app/more/team',
  '/app/settings': '/app/more/settings',
};

export function GuidedJourneyShell({
  organizationId,
  organizationName,
  businessName,
  displayName,
  locationId,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
  businessName: string;
  displayName: string;
  locationId: Id<'locations'>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const journey = useQuery(api.journey.getCurrent, { locationId });
  const dashboard = useQuery(api.dashboard.getCommandCenter, { locationId });
  const [passkeyPending, setPasskeyPending] = useState(false);

  useEffect(() => {
    const replacement = legacyRoutes[pathname];
    if (replacement) router.replace(replacement);
  }, [pathname, router]);

  const stepSegment = pathname.match(/^\/app\/step\/([^/?#]+)/)?.[1];
  const selectedStep = useQuery(
    api.journey.getStep,
    stepSegment
      ? { journeyStepId: decodeURIComponent(stepSegment) as Id<'journeySteps'> }
      : 'skip',
  );

  async function addPasskey() {
    setPasskeyPending(true);
    try {
      const result = await authClient.passkey.addPasskey({
        authenticatorAttachment: 'platform',
      });
      if (result.error) throw new Error(result.error.message);
    } finally {
      setPasskeyPending(false);
    }
  }

  if (journey === undefined || dashboard === undefined) {
    return <JourneyLoading label="Opening your route…" />;
  }

  const role = dashboard.role;
  const utility = pathname.match(/^\/app\/more\/([^/?#]+)/)?.[1];
  const isRoadmap = pathname === '/app/roadmap';
  const isStep = Boolean(stepSegment);

  return (
    <main className="journey-shell min-h-screen pb-20 text-[var(--ink)] md:pb-0">
      <header className="journey-header sticky top-0 z-40 border-b border-[color:var(--line)]/80 bg-[color:var(--paper-strong)]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/app" className="flex min-w-0 items-center gap-3">
            <span className="depth-brand-mark grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--ribbon)] text-sm font-black text-white shadow-[0_8px_22px_rgba(219,93,79,.24)]">
              R
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-none">
                RibbonDesk
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {businessName} · {organizationName}
              </span>
            </span>
          </Link>
          <nav
            className="hidden items-center gap-1 rounded-full border bg-background/80 p-1 md:flex"
            aria-label="Workspace"
          >
            <TopLink
              href="/app"
              active={!isRoadmap && !isStep && !utility}
              icon={Route}
            >
              Journey
            </TopLink>
            <TopLink href="/app/roadmap" active={isRoadmap} icon={Map}>
              Roadmap
            </TopLink>
            <details className="group relative">
              <summary
                className={`flex cursor-pointer list-none items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-muted ${utility ? 'bg-[var(--ribbon-soft)] text-[var(--ribbon-dark)]' : ''}`}
              >
                <MoreHorizontal className="size-4" /> More{' '}
                <ChevronDown className="size-3 transition group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 top-12 z-50 grid w-56 gap-1 rounded-2xl border bg-background p-2 shadow-xl">
                <UtilityLink
                  href="/app/more/inbox"
                  icon={Inbox}
                  label="Messages"
                />
                <UtilityLink
                  href="/app/more/files"
                  icon={Files}
                  label="Files & applications"
                />
                <UtilityLink href="/app/more/team" icon={Users} label="Team" />
                <UtilityLink
                  href="/app/more/settings"
                  icon={Settings2}
                  label="Settings"
                />
              </div>
            </details>
          </nav>
          <div className="flex items-center gap-2">
            <WorkspaceSearch organizationId={organizationId} />
            <span className="hidden text-sm xl:inline">{displayName}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={addPasskey}
              disabled={passkeyPending}
              aria-label="Add passkey"
            >
              {passkeyPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Fingerprint />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => authClient.signOut()}
              aria-label="Sign out"
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      {utility ? (
        <UtilitySurface
          utility={utility}
          locationId={locationId}
          organizationId={organizationId}
          organizationName={organizationName}
          role={role}
        />
      ) : isRoadmap ? (
        <RoadmapSurface journey={journey} locationId={locationId} />
      ) : isStep ? (
        selectedStep === undefined ? (
          <JourneyLoading label="Opening this step…" />
        ) : selectedStep ? (
          <StepWorkspace
            step={selectedStep.step}
            allSteps={journey?.steps ?? []}
          />
        ) : (
          <EmptyStep />
        )
      ) : (
        <JourneyHome journey={journey} locationId={locationId} />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t bg-background/95 px-2 py-2 backdrop-blur md:hidden">
        <MobileLink
          href="/app"
          icon={Route}
          label="Journey"
          active={!isRoadmap && !utility}
        />
        <MobileLink
          href="/app/roadmap"
          icon={Map}
          label="Roadmap"
          active={isRoadmap}
        />
        <MobileLink
          href="/app/more/inbox"
          icon={Inbox}
          label="Messages"
          active={utility === 'inbox'}
        />
        <MobileLink
          href="/app/more/settings"
          icon={MoreHorizontal}
          label="More"
          active={Boolean(utility && utility !== 'inbox')}
        />
      </nav>
    </main>
  );
}

function JourneyHome({
  journey,
  locationId,
}: {
  journey: CurrentJourneyResult;
  locationId: Id<'locations'>;
}) {
  const startResearch = useMutation(api.journey.startResearch);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buildRoute(refresh = false) {
    setPending(true);
    setError(null);
    try {
      await startResearch({ locationId, refresh });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setPending(false);
    }
  }

  if (!journey) {
    return (
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:py-16">
        <div className="journey-hero-card relative overflow-hidden rounded-[2rem] border bg-background p-7 shadow-[0_24px_80px_rgba(25,39,62,.08)] sm:p-10">
          <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">
            <Sparkles /> AI-guided opening route
          </Badge>
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            Tell us the business. We’ll map the work.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            RibbonDesk checks current government sources, asks its legal and
            money guides to double-check the details, then gives you one clear
            step at a time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={() => buildRoute()}
              disabled={pending}
              className="h-12 rounded-full bg-[var(--ribbon)] px-6 text-white hover:bg-[var(--ribbon-dark)]"
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <Search />}{' '}
              Build my route
            </Button>
            <span className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
              <Clock3 className="size-4" /> Usually 5–10 minutes
            </span>
          </div>
          {error ? <InlineError message={error} /> : null}
          <div className="mt-10 flex gap-3 rounded-2xl bg-[var(--paper)] p-4 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--sage)]" />
            RibbonDesk provides AI guidance based on cited public information.
            It is not a law firm, accounting firm, or government agency.
          </div>
        </div>
        <div className="grid content-start gap-4">
          <GuideCard
            icon={Scale}
            title="AI Legal Guide"
            text="Checks formation, naming, licenses, permits, notices, and operating duties against current evidence."
          />
          <GuideCard
            icon={CircleDollarSign}
            title="AI Money & Tax Guide"
            text="Checks tax registration, employer duties, filing schedules, and recordkeeping without asking for bank details."
          />
          <GuideCard
            icon={Route}
            title="Journey Guide"
            text="Turns the research into plain language and keeps only the next useful action in front of you."
          />
        </div>
      </section>
    );
  }

  if (journey.journey.status === 'researching') {
    return <ResearchProgress journey={journey.journey} />;
  }

  if (journey.journey.status === 'failed') {
    return (
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="rounded-[2rem] border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--amber-soft)] text-[var(--amber)]">
            <RefreshCw />
          </div>
          <h1 className="mt-5 font-heading text-4xl font-semibold">
            The route needs another pass.
          </h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground">
            {journey.journey.errorMessage ??
              'A live source did not respond cleanly.'}
          </p>
          <Button
            className="mt-7 rounded-full bg-[var(--ribbon)] text-white"
            onClick={() => buildRoute(true)}
            disabled={pending}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <RefreshCw />
            )}{' '}
            Try the research again
          </Button>
          {error ? <InlineError message={error} /> : null}
        </div>
      </section>
    );
  }

  if (!journey.currentStep) {
    return (
      <JourneyComplete
        journeyId={journey.journey._id}
        steps={journey.steps}
        location={journey.location}
        role={journey.role}
      />
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">
              <Route /> Your opening journey
            </Badge>
            <Badge variant="outline">
              {journey.journey.progressPercent}% complete
            </Badge>
          </div>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            One useful step at a time.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The research stays behind the scenes. You only see what needs your
            attention now.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => buildRoute(true)}
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}{' '}
          Check for newer guidance
        </Button>
      </div>
      <Progress value={journey.journey.progressPercent} className="mt-7 h-2" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <CurrentStepCard step={journey.currentStep} />
        <NextSteps
          steps={journey.steps}
          currentStepId={journey.currentStep._id}
        />
      </div>
    </section>
  );
}

function ResearchProgress({ journey }: { journey: Doc<'journeys'> }) {
  const stages = [
    ['learning', 'Learning about your business'],
    ['finding_sources', 'Checking local, state, and federal sources'],
    ['checking_guidance', 'Checking legal and money questions'],
    ['building_route', 'Building your step-by-step route'],
    ['double_checking', 'Double-checking every source'],
  ] as const;
  const activeIndex = Math.max(
    0,
    stages.findIndex(([key]) => key === journey.researchStage),
  );
  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-20">
      <div className="rounded-[2rem] border bg-background p-7 shadow-[0_24px_80px_rgba(25,39,62,.08)] sm:p-10">
        <div className="flex items-center gap-3 text-[var(--ribbon)]">
          <LoaderCircle className="animate-spin" />
          <span className="text-sm font-semibold">Building your route</span>
        </div>
        <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          We’re doing the homework now.
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          You can leave this page. RibbonDesk keeps working and your route will
          appear here when it is ready.
        </p>
        <Progress value={journey.progressPercent} className="mt-8 h-3" />
        <div className="mt-8 grid gap-3">
          {stages.map(([key, label], index) => {
            const done = index < activeIndex;
            const active = key === journey.researchStage;
            return (
              <div
                key={key}
                className={`flex items-center gap-4 rounded-2xl border p-4 ${active ? 'border-[var(--ribbon)] bg-[var(--ribbon-soft)]' : 'bg-[var(--paper)]'}`}
              >
                <span
                  className={`grid size-9 place-items-center rounded-full ${done ? 'bg-[var(--sage)] text-white' : active ? 'bg-[var(--ribbon)] text-white' : 'bg-background text-muted-foreground'}`}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : active ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`font-medium ${active ? 'text-[var(--ribbon-dark)]' : ''}`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CurrentStepCard({ step }: { step: JourneyStep }) {
  return (
    <article className="journey-current-card relative overflow-hidden rounded-[2rem] border bg-background p-6 shadow-[0_24px_80px_rgba(25,39,62,.08)] sm:p-9">
      <div className="absolute right-[-3rem] top-[-3rem] size-40 rounded-full bg-[var(--ribbon-soft)] blur-2xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <PhaseBadge phase={step.phase} />
          <GuideBadge guide={step.guide} />
        </div>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Your next step
        </p>
        <h2 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          {step.title}
        </h2>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
          {step.plainSummary}
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {step.timeEstimate ? (
            <QuickFact
              icon={Clock3}
              label="Usually takes"
              value={step.timeEstimate}
            />
          ) : null}
          {step.costSummary ? (
            <QuickFact
              icon={Banknote}
              label="Expected cost"
              value={step.costSummary}
            />
          ) : null}
        </div>
        <div className="mt-7 rounded-2xl bg-[var(--paper)] p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircleQuestion className="size-4 text-[var(--ribbon)]" />{' '}
            Why this matters
          </p>
          <p className="mt-2 leading-7 text-muted-foreground">{step.why}</p>
        </div>
        <Button
          nativeButton={false}
          className="mt-7 h-12 rounded-full bg-[var(--ribbon)] px-6 text-white hover:bg-[var(--ribbon-dark)]"
          render={<Link href={`/app/step/${step._id}`} />}
        >
          Open this step <ArrowRight />
        </Button>
      </div>
    </article>
  );
}

function NextSteps({
  steps,
  currentStepId,
}: {
  steps: JourneyStep[];
  currentStepId: Id<'journeySteps'>;
}) {
  const upcoming = steps
    .filter(
      (step) =>
        !['done', 'skipped'].includes(step.status) &&
        step._id !== currentStepId,
    )
    .slice(0, 5);
  return (
    <aside className="rounded-[2rem] border bg-[var(--paper)] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold">Coming up</h2>
        <Link
          href="/app/roadmap"
          className="text-sm font-semibold text-[var(--ribbon-dark)] hover:underline"
        >
          See route
        </Link>
      </div>
      <div className="mt-5 grid gap-3">
        {upcoming.length ? (
          upcoming.map((step, index) => (
            <Link
              key={step._id}
              href={`/app/step/${step._id}`}
              className="group flex gap-3 rounded-2xl border bg-background p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--paper)] text-xs font-semibold text-muted-foreground">
                {index + 2}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold group-hover:text-[var(--ribbon-dark)]">
                  {step.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {phaseLabel(step.phase)}
                </span>
              </span>
            </Link>
          ))
        ) : (
          <p className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
            This is the final active step.
          </p>
        )}
      </div>
    </aside>
  );
}

function RoadmapSurface({
  journey,
  locationId,
}: {
  journey: CurrentJourneyResult;
  locationId: Id<'locations'>;
}) {
  const startResearch = useMutation(api.journey.startResearch);
  if (!journey) {
    return <JourneyHome journey={journey} locationId={locationId} />;
  }
  const groups = [
    [
      'must',
      'Must do before opening',
      'The steps supported by official government evidence.',
    ],
    [
      'smart',
      'Smart to consider',
      'Helpful protections and setup work that are not presented as legal requirements.',
    ],
    [
      'later',
      'After opening',
      'Renewals, filings, and recurring work that keep the business ready.',
    ],
  ] as const;
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">
            <Map /> Full route
          </Badge>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Know what’s next without doing it all now.
          </h1>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => startResearch({ locationId, refresh: true })}
        >
          <RefreshCw /> Check for changes
        </Button>
      </div>
      <div className="mt-10 grid gap-9">
        {groups.map(([phase, title, description]) => {
          const steps = journey.steps.filter((step) => step.phase === phase);
          return (
            <section key={phase}>
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <h2 className="font-heading text-3xl font-semibold">{title}</h2>
                <p className="max-w-xl text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
              <div className="mt-4 grid gap-3">
                {steps.length ? (
                  steps.map((step) => (
                    <RoadmapRow
                      key={step._id}
                      step={step}
                      current={journey.currentStep?._id === step._id}
                    />
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                    No steps in this part of the route.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function RoadmapRow({
  step,
  current,
}: {
  step: JourneyStep;
  current: boolean;
}) {
  const done = step.status === 'done';
  return (
    <Link
      href={`/app/step/${step._id}`}
      className={`grid gap-3 rounded-2xl border bg-background p-5 transition hover:shadow-sm sm:grid-cols-[44px_1fr_auto] sm:items-center ${current ? 'border-[var(--ribbon)] ring-2 ring-[var(--ribbon-soft)]' : ''}`}
    >
      <span
        className={`grid size-10 place-items-center rounded-full ${done ? 'bg-[var(--sage)] text-white' : current ? 'bg-[var(--ribbon)] text-white' : 'bg-[var(--paper)] text-muted-foreground'}`}
      >
        {done ? (
          <Check />
        ) : current ? (
          <ArrowRight />
        ) : (
          <LockKeyhole className="size-4" />
        )}
      </span>
      <span>
        <span className="font-semibold">{step.title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {step.plainSummary}
        </span>
      </span>
      <span className="text-xs font-semibold text-muted-foreground">
        {friendlyStatus(step.status)}
      </span>
    </Link>
  );
}

function StepWorkspace({
  step,
  allSteps,
}: {
  step: JourneyStep;
  allSteps: JourneyStep[];
}) {
  const router = useRouter();
  const startStep = useMutation(api.journey.startStep);
  const completeStep = useMutation(api.journey.completeStep);
  const skipStep = useMutation(api.journey.skipOptionalStep);
  const answerQuestion = useMutation(api.journey.answerQuestion);
  const askGuide = useAction(api.specialists.askAboutStep);
  const preflight = useAction(api.portal.preflight);
  const recordVisit = useMutation(api.portal.recordVisit);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveUpload = useMutation(api.documents.saveUpload);
  const attachScreen = useMutation(api.portal.attachSharedScreen);
  const attachProof = useMutation(api.journey.attachProof);
  const options = useQuery(api.portal.listCompletionOptions, {
    journeyStepId: step._id,
  });
  const records = useQuery(api.journey.getStepRecords, {
    journeyStepId: step._id,
  });
  const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState(step.userAnswer ?? '');
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<
    Array<{ role: 'user' | 'assistant'; text: string }>
  >([]);
  const [capture, setCapture] = useState<{
    blob: Blob;
    preview: string;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const proofInput = useRef<HTMLInputElement>(null);
  const isLocked = step.status === 'locked';
  const isFinished = ['done', 'skipped'].includes(step.status);
  const stepNumber = allSteps.findIndex((item) => item._id === step._id) + 1;

  useEffect(
    () => () => {
      if (capture) URL.revokeObjectURL(capture.preview);
    },
    [capture],
  );

  async function run(label: string, task: () => Promise<unknown>) {
    setPending(label);
    setError(null);
    try {
      await task();
      return true;
    } catch (caught) {
      setError(readableError(caught));
      return false;
    } finally {
      setPending(null);
    }
  }

  async function finishAndAdvance(
    label: 'complete' | 'skip',
    task: () => Promise<unknown>,
  ) {
    if (await run(label, task)) router.push('/app');
  }

  async function openPortal(url: string) {
    await run('portal', async () => {
      const result = await preflight({ journeyStepId: step._id, url });
      await recordVisit({
        journeyStepId: step._id,
        url: result.url,
        mode: result.mode,
      });
      setPortalNotice(result.reason);
      if (result.mode === 'embedded') setEmbeddedUrl(result.url);
      else {
        setEmbeddedUrl(null);
        const opened = window.open(result.url, '_blank', 'noopener,noreferrer');
        if (!opened)
          setPortalNotice(
            `${result.reason} Your browser blocked the new window; use the direct link below.`,
          );
      }
    });
  }

  async function ask() {
    const value = question.trim();
    if (!value) return;
    setConversation((items) => [...items, { role: 'user', text: value }]);
    setQuestion('');
    await run('ask', async () => {
      const result = await askGuide({
        journeyStepId: step._id,
        question: value,
      });
      setConversation((items) => [
        ...items,
        { role: 'assistant', text: result.answer },
      ]);
    });
  }

  async function captureScreen() {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error(
          'Screen sharing is not available in this browser. Upload or paste a screenshot instead.',
        );
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      stream.getTracks().forEach((track) => track.stop());
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png', 0.92),
      );
      if (!blob) throw new Error('The screenshot could not be prepared.');
      setCapture((previous) => {
        if (previous) URL.revokeObjectURL(previous.preview);
        return { blob, preview: URL.createObjectURL(blob) };
      });
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  async function acceptFile(file: File) {
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Upload a PNG or JPEG screenshot.');
      return;
    }
    setCapture((previous) => {
      if (previous) URL.revokeObjectURL(previous.preview);
      return { blob: file, preview: URL.createObjectURL(file) };
    });
  }

  async function uploadCapture() {
    if (!capture) return;
    await run('capture', async () => {
      const uploadUrl = await generateUploadUrl({
        locationId: step.locationId,
      });
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': capture.blob.type || 'image/png' },
        body: capture.blob,
      });
      if (!response.ok) throw new Error('The screenshot upload failed.');
      const payload = (await response.json()) as { storageId: Id<'_storage'> };
      const saved = await saveUpload({
        locationId: step.locationId,
        storageId: payload.storageId,
        fileName: `portal-step-${stepNumber}-${Date.now()}.png`,
      });
      await attachScreen({
        journeyStepId: step._id,
        documentId: saved.documentId,
      });
      URL.revokeObjectURL(capture.preview);
      setCapture(null);
      setPortalNotice(
        'Screenshot shared. Journey Guide is checking only what is visible.',
      );
    });
  }

  async function uploadProof(file: File) {
    await run('proof', async () => {
      const uploadUrl = await generateUploadUrl({
        locationId: step.locationId,
      });
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!response.ok) throw new Error('The proof upload failed.');
      const payload = (await response.json()) as { storageId: Id<'_storage'> };
      const saved = await saveUpload({
        locationId: step.locationId,
        storageId: payload.storageId,
        fileName: file.name,
      });
      if (saved.status === 'rejected') {
        throw new Error(saved.reason ?? 'This file was not accepted.');
      }
      await attachProof({
        journeyStepId: step._id,
        documentId: saved.documentId,
      });
      setPortalNotice(
        'Proof attached to this step. RibbonDesk is checking the file safely.',
      );
    });
  }

  const previous = allSteps.filter((item) => item.order < step.order).at(-1);
  const next = allSteps.find((item) => item.order > step.order);
  const canCapture = step.actionType !== 'banking' && !isLocked && !isFinished;

  return (
    <section
      className={`mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8 ${embeddedUrl ? '' : 'xl:max-w-7xl'}`}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link href="/app" />}
        >
          <ArrowLeft /> Back to journey
        </Button>
        <span className="text-sm text-muted-foreground">
          Step {Math.max(stepNumber, 1)} of {allSteps.length}
        </span>
      </div>
      <div
        className={`grid gap-5 ${embeddedUrl ? 'lg:grid-cols-[minmax(360px,42%)_1fr]' : 'lg:grid-cols-[minmax(0,1fr)_360px]'}`}
      >
        <div className="grid content-start gap-5">
          <article className="rounded-[2rem] border bg-background p-6 shadow-[0_20px_60px_rgba(25,39,62,.07)] sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <PhaseBadge phase={step.phase} />
              <GuideBadge guide={step.guide} />
              <Badge variant="outline">{friendlyStatus(step.status)}</Badge>
            </div>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {step.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {step.plainSummary}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {step.timeEstimate ? (
                <QuickFact
                  icon={Clock3}
                  label="Usually takes"
                  value={step.timeEstimate}
                />
              ) : null}
              {step.costSummary ? (
                <QuickFact
                  icon={Banknote}
                  label="Expected cost"
                  value={step.costSummary}
                />
              ) : null}
            </div>
            <div className="mt-6 rounded-2xl bg-[var(--paper)] p-5">
              <p className="font-semibold">Why this matters</p>
              <p className="mt-2 leading-7 text-muted-foreground">{step.why}</p>
            </div>
            {step.requiredInfo.length ? (
              <div className="mt-6">
                <h2 className="font-heading text-2xl font-semibold">
                  Have these ready
                </h2>
                <ul className="mt-3 grid gap-2">
                  {step.requiredInfo.map((item) => (
                    <li key={item} className="flex gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {step.nextQuestion && !step.userAnswer ? (
              <div className="mt-6 rounded-2xl border border-[var(--amber)]/35 bg-[var(--amber-soft)] p-5">
                <p className="text-sm font-semibold">
                  One answer will make this step precise
                </p>
                <p className="mt-2 leading-7">{step.nextQuestion}</p>
                <Textarea
                  className="mt-4 bg-background"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Type what you know. ‘I’m not sure’ is okay."
                />
                <Button
                  className="mt-3 rounded-full bg-[var(--ribbon)] text-white"
                  disabled={pending === 'answer'}
                  onClick={() =>
                    run('answer', () =>
                      answerQuestion({ journeyStepId: step._id, answer }),
                    )
                  }
                >
                  {pending === 'answer' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}{' '}
                  Let the guide use this
                </Button>
              </div>
            ) : null}
            {isLocked ? (
              <div className="mt-6 flex gap-3 rounded-2xl border bg-[var(--paper)] p-4 text-sm text-muted-foreground">
                <LockKeyhole className="size-5 shrink-0" />
                This step is visible so you know what is ahead. Finish the
                current step before starting it.
              </div>
            ) : null}
            {!isLocked && !isFinished ? (
              <div className="mt-7 flex flex-wrap gap-3">
                {step.status === 'ready' ? (
                  <Button
                    className="rounded-full bg-[var(--ink)] text-white"
                    onClick={() =>
                      run('start', () => startStep({ journeyStepId: step._id }))
                    }
                  >
                    <ArrowRight /> Start this step
                  </Button>
                ) : null}
                <Button
                  className="rounded-full bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
                  onClick={() =>
                    void finishAndAdvance('complete', () =>
                      completeStep({ journeyStepId: step._id }),
                    )
                  }
                  disabled={
                    Boolean(pending) ||
                    Boolean(step.nextQuestion && !step.userAnswer)
                  }
                >
                  {pending === 'complete' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Check />
                  )}{' '}
                  I finished this step
                </Button>
                {step.phase !== 'must' ? (
                  <Button
                    variant="ghost"
                    className="rounded-full"
                    onClick={() =>
                      void finishAndAdvance('skip', () =>
                        skipStep({ journeyStepId: step._id }),
                      )
                    }
                  >
                    Skip for now
                  </Button>
                ) : null}
              </div>
            ) : null}
            {error ? <InlineError message={error} /> : null}
          </article>

          {!isLocked && !isFinished ? (
            <CompletionOptions
              step={step}
              options={options}
              pending={pending}
              portalNotice={portalNotice}
              onOpen={openPortal}
              onOpenDirect={(url) =>
                window.open(url, '_blank', 'noopener,noreferrer')
              }
            />
          ) : null}

          <StepRecords
            records={records}
            pending={pending === 'proof'}
            onChooseProof={() => proofInput.current?.click()}
          />
          <input
            ref={proofInput}
            type="file"
            accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadProof(file);
              event.currentTarget.value = '';
            }}
          />

          {step.citations.length ? (
            <SourcesCard citations={step.citations} />
          ) : null}
          <div className="flex justify-between gap-3">
            {previous ? (
              <Button
                nativeButton={false}
                variant="ghost"
                render={<Link href={`/app/step/${previous._id}`} />}
              >
                <ArrowLeft /> Previous
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button
                nativeButton={false}
                variant="ghost"
                render={<Link href={`/app/step/${next._id}`} />}
              >
                Next preview <ArrowRight />
              </Button>
            ) : null}
          </div>
        </div>

        {embeddedUrl ? (
          <div className="sticky top-20 h-[calc(100vh-6.5rem)] overflow-hidden rounded-[1.75rem] border bg-background shadow-xl">
            <div className="flex h-12 items-center justify-between border-b bg-[var(--paper)] px-4">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <Globe2 className="size-4" />
                <span className="truncate">Official page</span>
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() =>
                    window.open(embeddedUrl, '_blank', 'noopener,noreferrer')
                  }
                  aria-label="Open directly"
                >
                  <ExternalLink />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setEmbeddedUrl(null)}
                  aria-label="Close embedded page"
                >
                  <X />
                </Button>
              </div>
            </div>
            <iframe
              title="External completion page"
              src={embeddedUrl}
              className="h-[calc(100%-3rem)] w-full bg-white"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-downloads"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <aside className="grid content-start gap-5 lg:sticky lg:top-20 lg:self-start">
            <GuideChat
              step={step}
              question={question}
              setQuestion={setQuestion}
              conversation={conversation}
              pending={pending}
              onAsk={ask}
            />
            {step.screenAnalysis ? (
              <div className="rounded-[1.75rem] border bg-[var(--sage-soft)] p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <Sparkles className="size-4" /> What the guide saw
                </p>
                <div className="prose prose-sm mt-3 max-w-none text-[var(--ink)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {step.screenAnalysis}
                  </ReactMarkdown>
                </div>
              </div>
            ) : null}
            {canCapture ? (
              <div className="rounded-[1.75rem] border bg-background p-5">
                <p className="font-semibold">Stuck on another page?</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Share only the window or tab you want help with. You approve
                  the image before it uploads.
                </p>
                <div className="mt-4 grid gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={captureScreen}
                  >
                    <Paperclip /> Share what I see
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload /> Upload screenshot
                  </Button>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void acceptFile(file);
                  }}
                />
              </div>
            ) : null}
          </aside>
        )}
      </div>

      {capture ? (
        <dialog
          open
          className="fixed inset-0 z-[70] m-0 grid h-screen w-screen max-w-none place-items-center bg-[var(--ink)]/65 p-4 backdrop-blur-sm"
          aria-label="Confirm screenshot"
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[2rem] bg-background p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-3xl font-semibold">
                  Share this image?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check that it contains no password, bank information, card
                  number, or secret token.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCapture(null)}
              >
                <X />
              </Button>
            </div>
            <Image
              src={capture.preview}
              alt="Screenshot preview awaiting confirmation"
              width={1600}
              height={900}
              unoptimized
              className="mt-5 max-h-[60vh] w-full rounded-2xl border object-contain"
            />
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCapture(null)}>
                Discard
              </Button>
              <Button
                className="bg-[var(--ribbon)] text-white"
                onClick={uploadCapture}
                disabled={pending === 'capture'}
              >
                {pending === 'capture' ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ShieldCheck />
                )}{' '}
                Confirm and share
              </Button>
            </div>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}

function StepRecords({
  records,
  pending,
  onChooseProof,
}: {
  records:
    | {
        documents: Doc<'documents'>[];
        messages: Doc<'caseMessages'>[];
        applications: Doc<'applications'>[];
      }
    | undefined;
  pending: boolean;
  onChooseProof: () => void;
}) {
  return (
    <section className="rounded-[2rem] border bg-background p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Badge variant="outline">
            <Paperclip /> Connected to this step
          </Badge>
          <h2 className="mt-3 font-heading text-2xl font-semibold">
            Files, messages, and applications
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep the real record beside the work instead of searching across the
            workspace.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={onChooseProof}
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Upload />}{' '}
          Attach proof
        </Button>
      </div>
      {!records ? (
        <div className="mt-5 h-20 animate-pulse rounded-2xl bg-[var(--paper)]" />
      ) : records.documents.length ||
        records.messages.length ||
        records.applications.length ? (
        <div className="mt-5 grid gap-3">
          {records.documents.map((document) => (
            <div
              key={document._id}
              className="flex items-center justify-between gap-3 rounded-2xl border bg-[var(--paper)] p-4"
            >
              <span className="flex min-w-0 items-center gap-3">
                <FileText className="size-4 shrink-0 text-[var(--ribbon)]" />
                <span className="truncate text-sm font-semibold">
                  {document.fileName}
                </span>
              </span>
              <Badge variant="outline">
                {document.status.replaceAll('_', ' ')}
              </Badge>
            </div>
          ))}
          {records.messages.map((message) => (
            <Link
              key={message._id}
              href="/app/more/inbox"
              className="flex items-center justify-between gap-3 rounded-2xl border bg-[var(--paper)] p-4 hover:shadow-sm"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Mail className="size-4 shrink-0 text-[var(--ribbon)]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {message.subject}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {message.aiSummary ?? message.preview}
                  </span>
                </span>
              </span>
              <Badge variant="outline">{message.direction}</Badge>
            </Link>
          ))}
          {records.applications.map((application) => (
            <Link
              key={application._id}
              href="/app/more/files"
              className="flex items-center justify-between gap-3 rounded-2xl border bg-[var(--paper)] p-4 hover:shadow-sm"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Files className="size-4 shrink-0 text-[var(--ribbon)]" />
                <span className="truncate text-sm font-semibold">
                  {application.name}
                </span>
              </span>
              <Badge variant="outline">
                {application.status.replaceAll('_', ' ')}
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
          Nothing is attached yet. Add a receipt, approval, or other proof when
          you complete the outside action.
        </p>
      )}
    </section>
  );
}

function CompletionOptions({
  step,
  options,
  pending,
  portalNotice,
  onOpen,
  onOpenDirect,
}: {
  step: JourneyStep;
  options:
    | { official: Doc<'serviceOptions'>[]; commercial: Doc<'serviceOptions'>[] }
    | undefined;
  pending: string | null;
  portalNotice: string | null;
  onOpen: (url: string) => Promise<void>;
  onOpenDirect: (url: string) => void;
}) {
  if (step.actionType === 'banking') {
    return (
      <div className="rounded-[2rem] border bg-background p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--sage-soft)] text-[var(--sage)]">
            <Landmark />
          </span>
          <div>
            <h2 className="font-heading text-2xl font-semibold">
              Continue privately with a bank you trust
            </h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              RibbonDesk gives you the preparation list only. Banking pages,
              messages, screenshots, credentials, and sessions always stay
              outside this workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }
  const official = options?.official ?? [];
  const commercial = options?.commercial ?? [];
  return (
    <div className="rounded-[2rem] border bg-background p-6 sm:p-8">
      <Badge className="bg-[var(--ribbon-soft)] text-[var(--ribbon-dark)]">
        <Globe2 /> Where to do this
      </Badge>
      <h2 className="mt-4 font-heading text-3xl font-semibold">
        Start with the official route.
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Paid services are separated below and never outrank the government
        option.
      </p>
      <div className="mt-5 grid gap-3">
        {step.officialPortalUrl &&
        !official.some((item) => item.url === step.officialPortalUrl) ? (
          <ProviderRow
            name="Official government page"
            description="The official completion page cited by this step."
            url={step.officialPortalUrl}
            official
            pending={pending === 'portal'}
            onOpen={onOpen}
            onOpenDirect={onOpenDirect}
          />
        ) : null}
        {official.slice(0, 5).map((option) => (
          <ProviderRow
            key={option._id}
            name={option.name}
            description={option.description}
            capturedAt={option.capturedAt}
            url={option.url}
            official
            pending={pending === 'portal'}
            onOpen={onOpen}
            onOpenDirect={onOpenDirect}
          />
        ))}
        {!step.officialPortalUrl && !official.length ? (
          <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            The guide did not find a safe direct portal for this step. Ask the
            guide to explain the correct agency.
          </p>
        ) : null}
      </div>
      {portalNotice ? (
        <p className="mt-4 rounded-xl bg-[var(--sage-soft)] p-3 text-sm text-[var(--ink)]">
          {portalNotice}
        </p>
      ) : null}
      {commercial.length ? (
        <details className="mt-6 rounded-2xl border bg-[var(--paper)] p-4">
          <summary className="cursor-pointer font-semibold">
            Optional paid help · {commercial.length} choices
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Neutral web results. No affiliate ranking or sponsorship.
          </p>
          <div className="mt-4 grid gap-3">
            {commercial.map((option) => (
              <ProviderRow
                key={option._id}
                name={option.name}
                description={option.description}
                priceSummary={option.priceSummary}
                capturedAt={option.capturedAt}
                url={option.url}
                pending={pending === 'portal'}
                onOpen={onOpen}
                onOpenDirect={onOpenDirect}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ProviderRow({
  name,
  description,
  priceSummary,
  capturedAt,
  url,
  official = false,
  pending,
  onOpen,
  onOpenDirect,
}: {
  name: string;
  description: string;
  priceSummary?: string;
  capturedAt?: number;
  url: string;
  official?: boolean;
  pending: boolean;
  onOpen: (url: string) => Promise<void>;
  onOpenDirect: (url: string) => void;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{name}</p>
            {official ? (
              <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">
                Official
              </Badge>
            ) : (
              <Badge variant="outline">Paid service</Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {compactEvidence(description, 300)}
          </p>
          {priceSummary ? (
            <p className="mt-2 text-xs font-semibold text-[var(--ink)]">
              Price shown on source: {priceSummary}
            </p>
          ) : null}
          {capturedAt ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Checked{' '}
              {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
                capturedAt,
              )}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            className="rounded-full"
            variant={official ? 'default' : 'outline'}
            onClick={() => onOpen(url)}
            disabled={pending}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : <Globe2 />}{' '}
            Open with guide
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenDirect(url)}
            aria-label={`Open ${name} directly`}
          >
            <ExternalLink />
          </Button>
        </div>
      </div>
    </div>
  );
}

function GuideChat({
  step,
  question,
  setQuestion,
  conversation,
  pending,
  onAsk,
}: {
  step: JourneyStep;
  question: string;
  setQuestion: (value: string) => void;
  conversation: Array<{ role: 'user' | 'assistant'; text: string }>;
  pending: string | null;
  onAsk: () => Promise<void>;
}) {
  const guideName =
    step.guide === 'legal'
      ? 'AI Legal Guide'
      : step.guide === 'money_tax'
        ? 'AI Money & Tax Guide'
        : 'Journey Guide';
  return (
    <div className="rounded-[1.75rem] border bg-background p-5 shadow-[0_15px_45px_rgba(25,39,62,.06)]">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-[var(--ribbon-soft)] text-[var(--ribbon-dark)]">
          {step.guide === 'legal' ? (
            <Scale />
          ) : step.guide === 'money_tax' ? (
            <CircleDollarSign />
          ) : (
            <Bot />
          )}
        </span>
        <div>
          <p className="font-semibold">{guideName}</p>
          <p className="text-xs text-muted-foreground">
            Knows this step and its sources
          </p>
        </div>
      </div>
      <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto">
        {!conversation.length ? (
          <p className="rounded-2xl bg-[var(--paper)] p-4 text-sm leading-6 text-muted-foreground">
            Ask anything that feels confusing. I’ll answer from the evidence
            attached to this step.
          </p>
        ) : null}
        {conversation.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-2xl p-4 text-sm leading-6 ${message.role === 'user' ? 'ml-6 bg-[var(--ink)] text-white' : 'mr-3 bg-[var(--paper)]'}`}
          >
            {message.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none text-inherit">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              </div>
            ) : (
              message.text
            )}
          </div>
        ))}
        {pending === 'ask' ? (
          <div className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] p-4 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Reading the step
            evidence…
          </div>
        ) : null}
      </div>
      <Textarea
        className="mt-4"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="What does this mean for my business?"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void onAsk();
          }
        }}
      />
      <Button
        className="mt-3 w-full rounded-full bg-[var(--ink)] text-white"
        onClick={onAsk}
        disabled={!question.trim() || pending === 'ask'}
      >
        <Sparkles /> Ask the guide
      </Button>
    </div>
  );
}

function SourcesCard({ citations }: { citations: JourneyStep['citations'] }) {
  return (
    <details className="rounded-[1.75rem] border bg-[var(--paper)] p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
        <span className="flex items-center gap-2">
          <BookOpen className="size-4" /> Why you can trust this step
        </span>
        <ChevronDown className="size-4" />
      </summary>
      <div className="mt-4 grid gap-3">
        {citations.map((citation) => (
          <a
            key={citation.url}
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border bg-background p-4 transition hover:shadow-sm"
          >
            <span className="flex items-center gap-2 font-semibold">
              {citation.title}
              <ExternalLink className="size-3" />
            </span>
            {citation.excerpt ? (
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                {compactEvidence(citation.excerpt)}
              </span>
            ) : null}
            <span className="mt-2 block text-xs font-semibold text-[var(--sage)]">
              {citation.sourceTier === 'controlling_government'
                ? 'Controlling government source'
                : citation.official
                  ? 'Official government explanation'
                  : citation.sourceTier === 'professional_reference'
                    ? 'Professional reference'
                    : 'Supporting reference'}
            </span>
          </a>
        ))}
      </div>
    </details>
  );
}

function UtilitySurface({
  utility,
  locationId,
  organizationId,
  organizationName,
  role,
}: {
  utility: string;
  locationId: Id<'locations'>;
  organizationId: Id<'organizations'>;
  organizationName: string;
  role: Role;
}) {
  const labels: Record<string, { title: string; description: string }> = {
    inbox: {
      title: 'Messages connected to the work',
      description:
        'Government and provider email stays attached to the right business step.',
    },
    files: {
      title: 'Files and application records',
      description:
        'Keep receipts, approvals, evidence, and prepared packets without cluttering the journey.',
    },
    team: {
      title: 'People helping with the business',
      description: 'Invite teammates and control what each person can do.',
    },
    settings: {
      title: 'Workspace settings',
      description: 'Manage access, exports, security, and owner controls.',
    },
  };
  const copy = labels[utility] ?? {
    title: 'More tools',
    description: 'Open a supporting workspace tool.',
  };
  return (
    <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:py-12">
      <Badge variant="outline">
        <MoreHorizontal /> Supporting tools
      </Badge>
      <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
        {copy.title}
      </h1>
      <p className="mt-2 text-muted-foreground">{copy.description}</p>
      <div className="mt-8">
        {utility === 'inbox' ? (
          <CaseInboxPanel locationId={locationId} />
        ) : utility === 'files' ? (
          <EvidenceApplicationsPanel locationId={locationId} />
        ) : utility === 'team' ? (
          <TeamPanel organizationId={organizationId} role={role} />
        ) : (
          <DataControlsPanel
            organizationId={organizationId}
            organizationName={organizationName}
            role={role}
          />
        )}
      </div>
    </section>
  );
}

function JourneyComplete({
  journeyId,
  steps,
  location,
  role,
}: {
  journeyId: Id<'journeys'>;
  steps: JourneyStep[];
  location: Doc<'locations'>;
  role: Role;
}) {
  const activateAfterOpening = useMutation(api.journey.activateAfterOpening);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const laterRemaining = steps.filter(
    (step) =>
      step.phase === 'later' && !['done', 'skipped'].includes(step.status),
  ).length;

  async function activate() {
    setPending(true);
    setError(null);
    try {
      await activateAfterOpening({ journeyId });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[var(--sage-soft)] text-[var(--sage)]">
        <CheckCircle2 className="size-8" />
      </div>
      <h1 className="mt-6 font-heading text-5xl font-semibold">
        {laterRemaining
          ? 'Your opening steps are complete.'
          : 'You are caught up.'}
      </h1>
      <p className="mt-4 text-lg leading-8 text-muted-foreground">
        {laterRemaining
          ? `RibbonDesk kept the full record. ${laterRemaining} after-opening ${laterRemaining === 1 ? 'step is' : 'steps are'} ready when you confirm the business is operating.`
          : 'RibbonDesk will keep watching the route, source changes, messages, and future deadlines.'}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {laterRemaining &&
        location.lifecycleStage !== 'operating' &&
        ['owner', 'admin'].includes(role) ? (
          <Button
            className="rounded-full bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
            onClick={activate}
            disabled={pending}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{' '}
            My business is open—continue the journey
          </Button>
        ) : null}
        <Button
          nativeButton={false}
          variant="outline"
          className="rounded-full"
          render={<Link href="/app/roadmap" />}
        >
          See the full record <ArrowRight />
        </Button>
      </div>
      {error ? <InlineError message={error} /> : null}
    </section>
  );
}

function EmptyStep() {
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-heading text-4xl font-semibold">
        That step is not available.
      </h1>
      <p className="mt-3 text-muted-foreground">
        It may belong to an older version of the route.
      </p>
      <Button
        nativeButton={false}
        className="mt-6"
        render={<Link href="/app" />}
      >
        Return to the current step
      </Button>
    </section>
  );
}

function JourneyLoading({ label }: { label: string }) {
  return (
    <main className="journey-shell grid min-h-screen place-items-center">
      <div className="flex items-center gap-3 rounded-2xl border bg-background px-5 py-4 text-sm font-medium shadow-sm">
        <LoaderCircle className="size-4 animate-spin text-[var(--ribbon)]" />
        {label}
      </div>
    </main>
  );
}

function GuideCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Scale;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.75rem] border bg-background p-6 shadow-[0_15px_45px_rgba(25,39,62,.05)]">
      <span className="grid size-11 place-items-center rounded-2xl bg-[var(--ribbon-soft)] text-[var(--ribbon-dark)]">
        <Icon />
      </span>
      <h2 className="mt-4 font-heading text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function QuickFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-[var(--paper)] p-4">
      <span className="grid size-9 place-items-center rounded-xl bg-background text-[var(--ribbon-dark)]">
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block text-sm font-semibold">{value}</span>
      </span>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: JourneyStep['phase'] }) {
  return (
    <Badge
      className={
        phase === 'must'
          ? 'bg-[var(--ribbon-soft)] text-[var(--ribbon-dark)]'
          : phase === 'smart'
            ? 'bg-[var(--amber-soft)] text-[var(--amber)]'
            : 'bg-[var(--sage-soft)] text-[var(--sage)]'
      }
    >
      {phaseLabel(phase)}
    </Badge>
  );
}

function GuideBadge({ guide }: { guide: JourneyStep['guide'] }) {
  return (
    <Badge variant="outline">
      {guide === 'legal' ? (
        <Scale />
      ) : guide === 'money_tax' ? (
        <CircleDollarSign />
      ) : (
        <Bot />
      )}
      {guide === 'legal'
        ? 'AI Legal Guide'
        : guide === 'money_tax'
          ? 'AI Money & Tax Guide'
          : 'Journey Guide'}
    </Badge>
  );
}

function phaseLabel(phase: JourneyStep['phase']) {
  return phase === 'must'
    ? 'Must do before opening'
    : phase === 'smart'
      ? 'Smart to consider'
      : 'After opening';
}

function friendlyStatus(status: JourneyStep['status']) {
  const labels: Record<JourneyStep['status'], string> = {
    locked: 'Coming up',
    ready: 'Ready for you',
    in_progress: 'You’re working on this',
    waiting: 'Waiting for a reply',
    needs_input: 'I need one answer',
    done: 'Done',
    skipped: 'Saved for later',
    recheck_needed: 'Something changed',
  };
  return labels[status];
}

function InlineError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

function TopLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: typeof Route;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-muted ${active ? 'bg-[var(--ribbon-soft)] text-[var(--ribbon-dark)]' : ''}`}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}

function UtilityLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Inbox;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted"
    >
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </Link>
  );
}

function MobileLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof Route;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`grid place-items-center gap-1 rounded-xl py-1 text-[11px] font-medium ${active ? 'bg-[var(--ribbon-soft)] text-[var(--ribbon-dark)]' : 'text-muted-foreground'}`}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
