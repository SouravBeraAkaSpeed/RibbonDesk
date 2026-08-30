'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Bell,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileArchive,
  FileText,
  Inbox,
  ListChecks,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type View = 'today' | 'plan' | 'inbox' | 'sources';

type DemoTask = {
  id: string;
  title: string;
  meta: string;
  owner: string;
  priority: 'blocking' | 'due' | 'waiting';
  done: boolean;
};

const initialTasks: DemoTask[] = [
  {
    id: 'task-1',
    title: 'Confirm permitted use for the storefront',
    meta: 'Certificate of Occupancy · blocks 3 items',
    owner: 'You',
    priority: 'blocking',
    done: false,
  },
  {
    id: 'task-2',
    title: 'Review Food Protection Manager certificate',
    meta: 'Food Service Establishment Permit · due Sep 4',
    owner: 'Maya',
    priority: 'due',
    done: false,
  },
  {
    id: 'task-3',
    title: 'Attach sales tax registration receipt',
    meta: 'Certificate of Authority · agency review',
    owner: 'You',
    priority: 'waiting',
    done: false,
  },
  {
    id: 'task-4',
    title: 'Approve the storefront sign drawing',
    meta: 'Sign permit · completed evidence check',
    owner: 'Maya',
    priority: 'due',
    done: true,
  },
];

const requirements = [
  {
    id: 'occupancy',
    title: 'Confirm legal use and occupancy',
    agency: 'NYC Department of Buildings',
    state: 'Needs attention',
    stateClass: 'coral',
    confidence: 'High',
    detail:
      'Verify that the current Certificate of Occupancy permits an eating and drinking establishment before construction or operation.',
    source: 'Certificate of Occupancy guidance',
    captured: 'Aug 30, 2026',
    blocks: ['Food service permit', 'Pre-opening inspection'],
  },
  {
    id: 'tax',
    title: 'Register to collect sales tax',
    agency: 'New York State Department of Taxation and Finance',
    state: 'Waiting on agency',
    stateClass: 'amber',
    confidence: 'High',
    detail:
      'Keep the submitted registration receipt and Certificate of Authority with the opening record.',
    source: 'Register as a sales tax vendor',
    captured: 'Aug 30, 2026',
    blocks: ['Opening milestone'],
  },
  {
    id: 'food',
    title: 'Obtain a Food Service Establishment Permit',
    agency: 'NYC Department of Health and Mental Hygiene',
    state: 'In progress',
    stateClass: 'sage',
    confidence: 'High',
    detail:
      'Prepare the permit application, supporting documents, fee, and inspection readiness evidence.',
    source: 'Opening a Restaurant',
    captured: 'Aug 30, 2026',
    blocks: ['Pre-opening inspection'],
  },
] as const;

const sourceCards = [
  {
    agency: 'NYC Health',
    title: 'Opening a Restaurant',
    url: 'nyc.gov/site/doh/business/food-operators/opening-a-restaurant.page',
    checked: '18 minutes ago',
    status: 'Current',
  },
  {
    agency: 'NYC Business',
    title: 'Food Service Establishment Permit',
    url: 'nyc-business.nyc.gov/nycbusiness/description/food-service-establishment-permit',
    checked: '21 minutes ago',
    status: 'Current',
  },
  {
    agency: 'New York State Tax',
    title: 'Register as a sales tax vendor',
    url: 'tax.ny.gov/bus/doingbus/sell.htm',
    checked: '24 minutes ago',
    status: 'Current',
  },
] as const;

const navItems: { id: View; label: string; icon: typeof ListChecks; count?: number }[] = [
  { id: 'today', label: 'Today', icon: ListChecks, count: 4 },
  { id: 'plan', label: 'Plan', icon: ClipboardCheck, count: 12 },
  { id: 'inbox', label: 'Inbox', icon: Inbox, count: 2 },
  { id: 'sources', label: 'Sources', icon: BookOpenCheck },
];

function RibbonMark() {
  return (
    <span className="relative grid size-9 place-items-center overflow-hidden rounded-xl bg-[var(--ink)] text-white shadow-sm">
      <span className="absolute -right-2 -top-3 h-8 w-5 rotate-45 bg-[var(--ribbon)]" />
      <span className="relative font-heading text-lg font-bold">R</span>
    </span>
  );
}

export function DemoWorkspace() {
  const [activeView, setActiveView] = useState<View>('today');
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState('');
  const [proposalApproved, setProposalApproved] = useState(false);
  const [expandedRequirement, setExpandedRequirement] = useState<string>('occupancy');
  const [notice, setNotice] = useState<string | null>(null);
  const [teamPulse, setTeamPulse] = useState(false);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter((task) => `${task.title} ${task.meta} ${task.owner}`.toLowerCase().includes(term));
  }, [search, tasks]);

  const completedCount = tasks.filter((task) => task.done).length;
  const readiness = 68 + (proposalApproved ? 4 : 0) + Math.max(0, completedCount - 1) * 2;

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
    showNotice('Task updated across the demo workspace.');
  }

  function approveProposal() {
    if (proposalApproved) return;
    setProposalApproved(true);
    setTasks((current) => [
      {
        id: 'task-5',
        title: 'Prepare the site for the Sep 9 inspection',
        meta: 'Food Service Establishment Permit · new confirmed date',
        owner: 'You',
        priority: 'due',
        done: false,
      },
      ...current,
    ]);
    showNotice('Proposal approved. The inspection and task plan are updated.');
  }

  function simulateTeammate() {
    setTeamPulse(true);
    setTasks((current) => current.map((task) => (task.id === 'task-2' ? { ...task, done: true } : task)));
    showNotice('Maya completed the certificate review in another session.');
  }

  function resetDemo() {
    setTasks(initialTasks);
    setProposalApproved(false);
    setTeamPulse(false);
    setSearch('');
    setActiveView('today');
    showNotice('The synthetic workspace was reset.');
  }

  return (
    <main className="min-h-screen bg-[var(--paper-strong)] text-foreground">
      <header className="sticky top-0 z-50 flex h-16 items-center border-b border-border bg-background/95 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/" className="mr-5 flex items-center gap-2.5" aria-label="Back to RibbonDesk home">
          <RibbonMark />
          <span className="hidden font-heading text-xl font-semibold sm:inline">RibbonDesk</span>
        </Link>
        <div className="hidden h-7 w-px bg-border md:block" />
        <div className="ml-0 flex min-w-0 items-center gap-2 md:ml-5">
          <Building2 className="hidden size-4 text-muted-foreground md:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Marlow Coffee · Williamsburg</p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">Synthetic NYC café workspace</p>
          </div>
          <Badge className="ml-1 bg-[var(--ribbon-soft)] text-[var(--ribbon-dark)]">Demo</Badge>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={simulateTeammate} disabled={teamPulse}>
            <Users data-icon="inline-start" />
            {teamPulse ? 'Maya updated it' : 'Simulate teammate'}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Reset demo" onClick={resetDemo}>
            <RotateCcw />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Notifications">
            <Bell />
          </Button>
          <Button nativeButton={false} size="sm" className="hidden bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)] sm:inline-flex" render={<Link href="/app" />}>
            Start your desk
          </Button>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[1680px] lg:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-background px-3 py-5 lg:flex lg:flex-col">
          <nav className="space-y-1" aria-label="Demo workspace">
            {navItems.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveView(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeView === id
                    ? 'bg-[var(--ink)] text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {count ? (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${activeView === id ? 'bg-white/12' : 'bg-muted'}`}>
                    {id === 'inbox' && proposalApproved ? 1 : id === 'today' ? tasks.filter((task) => !task.done).length : count}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="mt-7 border-t border-border pt-5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
            {[
              { label: 'Documents', icon: FileArchive, value: '8' },
              { label: 'Applications', icon: FileText, value: '3' },
              { label: 'Inspections', icon: ShieldCheck, value: '1' },
              { label: 'Calendar', icon: CalendarDays, value: '' },
              { label: 'Activity', icon: Activity, value: '' },
            ].map(({ label, icon: Icon, value }) => (
              <button key={label} type="button" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                <Icon className="size-4" />
                {label}
                {value ? <span className="ml-auto text-xs">{value}</span> : null}
              </button>
            ))}
          </div>

          <div className="mt-auto rounded-xl border border-[var(--sage)]/20 bg-[var(--sage-soft)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--sage)]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--sage)] opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--sage)]" />
              </span>
              Realtime connected
            </div>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Two collaborators are viewing this desk.</p>
          </div>
        </aside>

        <section className="min-w-0 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 xl:px-10">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Link href="/" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground lg:hidden">
                  <ArrowLeft className="size-3.5" /> Back to RibbonDesk
                </Link>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ribbon)]">Monday, August 31</p>
                <h1 className="mt-1 font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  {activeView === 'today' && 'Good morning, Alex.'}
                  {activeView === 'plan' && 'Your opening plan'}
                  {activeView === 'inbox' && 'Agency inbox'}
                  {activeView === 'sources' && 'Source library'}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {activeView === 'today' && 'Three items can move your opening forward today.'}
                  {activeView === 'plan' && 'Every item keeps its evidence, owner, and dependencies.'}
                  {activeView === 'inbox' && 'AI can propose changes; you decide what enters the record.'}
                  {activeView === 'sources' && 'Official guidance behind the current requirement set.'}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search this workspace…"
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-9 text-sm outline-none transition focus:border-[var(--ribbon)] focus:ring-2 focus:ring-[var(--ribbon)]/15"
                />
                {search ? (
                  <button type="button" aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setSearch('')}>
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {activeView === 'today' ? (
              <TodayView
                tasks={filteredTasks}
                readiness={readiness}
                completedCount={completedCount}
                proposalApproved={proposalApproved}
                toggleTask={toggleTask}
                approveProposal={approveProposal}
                openInbox={() => setActiveView('inbox')}
                teamPulse={teamPulse}
              />
            ) : null}
            {activeView === 'plan' ? (
              <PlanView expandedRequirement={expandedRequirement} setExpandedRequirement={setExpandedRequirement} />
            ) : null}
            {activeView === 'inbox' ? (
              <InboxView proposalApproved={proposalApproved} approveProposal={approveProposal} />
            ) : null}
            {activeView === 'sources' ? <SourcesView /> : null}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-border bg-background/96 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Mobile demo navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setActiveView(id)} className={`grid place-items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium ${activeView === id ? 'text-[var(--ribbon)]' : 'text-muted-foreground'}`}>
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </nav>

      {notice ? (
        <output className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm text-white shadow-xl lg:bottom-6">
          <CheckCircle2 className="size-4 text-[var(--sage-light)]" />
          <span className="whitespace-nowrap">{notice}</span>
        </output>
      ) : null}
    </main>
  );
}

function TodayView({
  tasks,
  readiness,
  completedCount,
  proposalApproved,
  toggleTask,
  approveProposal,
  openInbox,
  teamPulse,
}: {
  tasks: DemoTask[];
  readiness: number;
  completedCount: number;
  proposalApproved: boolean;
  toggleTask: (id: string) => void;
  approveProposal: () => void;
  openInbox: () => void;
  teamPulse: boolean;
}) {
  return (
    <>
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-[var(--amber)]/25 bg-[var(--amber-soft)] px-4 py-3">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-[var(--amber-dark)]" />
        <p className="text-xs leading-5 text-muted-foreground">
          This is an interactive synthetic workspace. Actions stay in your browser and never send email, upload files, or consume provider credits.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Opening readiness" value={`${readiness}%`} detail="Confirmed items only" icon={ShieldCheck} accent="sage">
          <Progress value={readiness} className="mt-4 [&_[data-slot=progress-indicator]]:bg-[var(--sage)]" aria-label={`Opening readiness ${readiness} percent`} />
        </MetricCard>
        <MetricCard label="Opening target" value="Oct 12" detail="42 days remaining" icon={CalendarDays} accent="ink" />
        <MetricCard label="Blocking items" value={String(Math.max(1, 3 - (completedCount - 1)))} detail="1 needs owner review" icon={CircleAlert} accent="coral" />
        <MetricCard label="Known fees" value="$1,148" detail="2 fees need confirmation" icon={FileText} accent="amber" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.7fr)]">
        <div className="rounded-2xl border border-border bg-background shadow-sm">
          <div className="flex items-start justify-between border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="font-heading text-xl font-semibold">What needs you today</h2>
              <p className="mt-1 text-xs text-muted-foreground">Ordered by blockers, due dates, and agency waits.</p>
            </div>
            <Badge variant="outline">{tasks.filter((task) => !task.done).length} open</Badge>
          </div>
          <div className="divide-y divide-border">
            {tasks.length ? tasks.map((task) => (
              <div key={task.id} className={`flex items-start gap-3 px-4 py-4 transition-colors sm:px-5 ${task.done ? 'bg-muted/35' : 'hover:bg-muted/30'}`}>
                <button
                  type="button"
                  aria-label={`${task.done ? 'Reopen' : 'Complete'} ${task.title}`}
                  onClick={() => toggleTask(task.id)}
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition ${task.done ? 'border-[var(--sage)] bg-[var(--sage)] text-white' : 'border-border bg-background hover:border-[var(--ribbon)]'}`}
                >
                  {task.done ? <Check className="size-3.5" /> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${task.done ? 'text-muted-foreground line-through' : ''}`}>{task.title}</p>
                    {teamPulse && task.id === 'task-2' ? <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">Just updated</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.meta}</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs font-medium">{task.owner}</p>
                  <p className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${task.priority === 'blocking' ? 'text-[var(--ribbon)]' : task.priority === 'waiting' ? 'text-[var(--amber-dark)]' : 'text-muted-foreground'}`}>
                    {task.priority}
                  </p>
                </div>
              </div>
            )) : (
              <div className="px-5 py-12 text-center">
                <Search className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">No matching work</p>
                <p className="mt-1 text-xs text-muted-foreground">Try a requirement, owner, or agency name.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-[var(--ribbon)]/20 bg-background shadow-sm">
            <div className="border-b border-[var(--ribbon)]/15 bg-[var(--ribbon-soft)] px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-[var(--ribbon)]" />
                  Ribbon Assistant proposal
                </div>
                <Badge className={proposalApproved ? 'bg-[var(--sage-soft)] text-[var(--sage)]' : 'bg-background text-[var(--ribbon)]'}>
                  {proposalApproved ? 'Approved' : 'Needs approval'}
                </Badge>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold">Add the confirmed inspection date</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                NYC Health replied with a September 9 pre-opening inspection. I found the date, location, and preparation request in the agency email.
              </p>
              <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Change</span><span className="font-medium">Inspection · Sep 9, 10:00 AM</span></div>
                <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Confidence</span><span className="font-medium text-[var(--sage)]">High</span></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={openInbox}>View email</Button>
                <Button size="sm" onClick={approveProposal} disabled={proposalApproved} className="bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]">
                  {proposalApproved ? 'Approved' : 'Approve update'}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Next milestones</h2>
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-4">
              {[
                ['Sep 9', 'Pre-opening inspection', proposalApproved ? 'Confirmed' : 'Proposed'],
                ['Sep 14', 'Permit packet target', 'On track'],
                ['Oct 12', 'Opening target', '3 blockers'],
              ].map(([date, title, state], index) => (
                <div key={title} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 size-2.5 rounded-full ${index === 0 ? 'bg-[var(--ribbon)]' : 'bg-border'}`} />
                    {index < 2 ? <span className="mt-1 h-full w-px bg-border" /> : null}
                  </div>
                  <div className="pb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{date}</p>
                    <p className="mt-0.5 text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{state}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({ label, value, detail, icon: Icon, accent, children }: { label: string; value: string; detail: string; icon: typeof ShieldCheck; accent: 'sage' | 'ink' | 'coral' | 'amber'; children?: React.ReactNode }) {
  const iconClass = {
    sage: 'bg-[var(--sage-soft)] text-[var(--sage)]',
    ink: 'bg-[var(--ink)] text-white',
    coral: 'bg-[var(--ribbon-soft)] text-[var(--ribbon)]',
    amber: 'bg-[var(--amber-soft)] text-[var(--amber-dark)]',
  }[accent];
  return (
    <article className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className={`grid size-9 place-items-center rounded-xl ${iconClass}`}><Icon className="size-4" /></span>
      </div>
      {children}
    </article>
  );
}

function PlanView({ expandedRequirement, setExpandedRequirement }: { expandedRequirement: string; setExpandedRequirement: (id: string) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.6fr)]">
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-heading text-xl font-semibold">Requirement dependency list</h2>
            <p className="mt-1 text-xs text-muted-foreground">Accessible list view · 12 confirmed · 2 proposed</p>
          </div>
          <Button variant="outline" size="sm"><FileArchive data-icon="inline-start" /> Export plan</Button>
        </div>
        <div className="divide-y divide-border">
          {requirements.map((requirement, index) => {
            const expanded = expandedRequirement === requirement.id;
            return (
              <article key={requirement.id}>
                <button type="button" onClick={() => setExpandedRequirement(expanded ? '' : requirement.id)} aria-expanded={expanded} className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-muted/35 sm:px-5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{requirement.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{requirement.agency}</p>
                  </div>
                  <Badge variant="outline" className={`status-badge status-badge-${requirement.stateClass}`}>{requirement.state}</Badge>
                  <ChevronDown className={`mt-1 size-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded ? (
                  <div className="grid gap-4 bg-muted/25 px-5 pb-5 pt-1 sm:ml-14 sm:grid-cols-[1fr_210px]">
                    <div>
                      <p className="text-sm leading-6 text-muted-foreground">{requirement.detail}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {requirement.blocks.map((item) => <Badge key={item} variant="outline">Blocks: {item}</Badge>)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3 text-xs">
                      <p className="font-semibold">Official-source evidence</p>
                      <p className="mt-2 text-[var(--ribbon)]">{requirement.source}</p>
                      <p className="mt-1 text-muted-foreground">Captured {requirement.captured}</p>
                      <div className="mt-3 flex items-center justify-between"><span className="text-muted-foreground">Confidence</span><span className="font-semibold text-[var(--sage)]">{requirement.confidence}</span></div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl bg-[var(--ink)] p-5 text-white shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/55">Opening path</p>
          <p className="mt-3 font-heading text-2xl font-semibold">Occupancy first, then health inspection.</p>
          <p className="mt-2 text-xs leading-5 text-white/60">RibbonDesk never lets uncertain requirements silently increase readiness.</p>
          <div className="mt-5 space-y-2">
            {['Confirm legal use', 'Finish permit packet', 'Pass inspection', 'Open'].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-lg bg-white/7 px-3 py-2 text-xs">
                <span className={`grid size-5 place-items-center rounded-full ${index === 0 ? 'bg-[var(--ribbon)] text-white' : 'bg-white/10 text-white/60'}`}>{index + 1}</span>
                {step}
                {index < 3 ? <ChevronRight className="ml-auto size-3.5 text-white/35" /> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
          <h3 className="font-heading text-lg font-semibold">Unanswered questions</h3>
          <p className="mt-1 text-xs text-muted-foreground">2 answers could change your plan.</p>
          <button type="button" className="mt-4 flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-xs hover:border-[var(--ribbon)]">
            Will sidewalk seating be offered?
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
          <button type="button" className="mt-2 flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-xs hover:border-[var(--ribbon)]">
            Is the gas line changing?
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InboxView({ proposalApproved, approveProposal }: { proposalApproved: boolean; approveProposal: () => void }) {
  return (
    <div className="grid min-h-[610px] overflow-hidden rounded-2xl border border-border bg-background shadow-sm md:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)_330px]">
      <div className="border-b border-border md:border-b-0 md:border-r">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Case threads</p>
            <Badge variant="outline">2 unread</Badge>
          </div>
        </div>
        <button type="button" className="w-full border-b border-border bg-[var(--ribbon-soft)]/55 p-4 text-left">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">NYC Health inspections</p><span className="size-2 rounded-full bg-[var(--ribbon)]" /></div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">Your pre-opening inspection is confirmed for September 9…</p>
          <p className="mt-2 text-[10px] text-muted-foreground">11 minutes ago</p>
        </button>
        <button type="button" className="w-full border-b border-border p-4 text-left hover:bg-muted/30">
          <p className="text-xs font-semibold">Sales tax registration</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">We received your registration and will notify you…</p>
          <p className="mt-2 text-[10px] text-muted-foreground">Yesterday</p>
        </button>
      </div>

      <div className="flex min-w-0 flex-col border-b border-border md:border-b-0 xl:border-r">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Pre-opening inspection</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Linked to Food Service Establishment Permit</p>
          </div>
          <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">Verified sender</Badge>
        </div>
        <div className="flex-1 space-y-4 bg-muted/20 p-4 sm:p-6">
          <div className="max-w-xl rounded-2xl rounded-tl-sm border border-border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-[var(--ink)] text-xs font-semibold text-white">NH</span><div><p className="text-xs font-semibold">NYC Health inspections</p><p className="text-[10px] text-muted-foreground">Today, 9:42 AM</p></div></div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Your pre-opening inspection has been scheduled for September 9 at 10:00 AM at the business location. Please have your application documents and food protection certificate available.</p>
          </div>
          <div className="ml-auto max-w-lg rounded-2xl rounded-tr-sm bg-[var(--ink)] p-4 text-white">
            <p className="text-xs font-semibold text-white/55">Draft reply · not sent</p>
            <p className="mt-2 text-sm leading-6 text-white/80">Thank you for confirming. We will have the application documents and certificate ready for the inspector.</p>
          </div>
        </div>
        <div className="border-t border-border p-4">
          <div className="rounded-xl border border-border bg-muted/25 p-3 text-xs text-muted-foreground">Demo mode: outbound delivery is disabled.</div>
        </div>
      </div>

      <div className="hidden p-4 xl:block">
        <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-[var(--ribbon)]" />Proposed record update</div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">The assistant extracted a confirmed date and preparation request. This remains a proposal until an authorized person approves it.</p>
        <div className="mt-4 space-y-2 rounded-xl border border-border p-3 text-xs">
          <p className="font-semibold">Create inspection</p>
          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>Sep 9 · 10:00 AM</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span>Alex</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Evidence</span><span className="text-[var(--ribbon)]">This message</span></div>
        </div>
        <Button className="mt-4 w-full bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]" onClick={approveProposal} disabled={proposalApproved}>
          {proposalApproved ? <Check data-icon="inline-start" /> : null}
          {proposalApproved ? 'Approved and recorded' : 'Approve update'}
        </Button>
        <Button variant="outline" className="mt-2 w-full" disabled={proposalApproved}>Edit proposal</Button>
        <p className="mt-4 rounded-xl bg-[var(--sage-soft)] p-3 text-[11px] leading-5 text-[var(--sage)]">Approval creates an immutable activity event with the source message and before/after values.</p>
      </div>
    </div>
  );
}

function SourcesView() {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.65fr)]">
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div><h2 className="font-heading text-xl font-semibold">Trusted official sources</h2><p className="mt-1 text-xs text-muted-foreground">NYC café &amp; restaurant verified coverage pack · version 1</p></div>
          <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 1200); }} disabled={refreshing}>
            <RefreshCw data-icon="inline-start" className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />
            {refreshing ? 'Checking…' : 'Check for changes'}
          </Button>
        </div>
        <div className="divide-y divide-border">
          {sourceCards.map((source) => (
            <article key={source.url} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--sage-soft)] text-[var(--sage)]"><ShieldCheck className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{source.title}</p><Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">Official</Badge></div>
                  <p className="mt-1 text-xs text-muted-foreground">{source.agency}</p>
                  <p className="mt-2 truncate font-mono text-[10px] text-[var(--ribbon)]">{source.url}</p>
                </div>
                <div className="hidden text-right sm:block"><p className="text-xs font-semibold text-[var(--sage)]">{source.status}</p><p className="mt-1 text-[10px] text-muted-foreground">Checked {refreshing ? 'just now' : source.checked}</p></div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-[var(--amber-dark)]" />Monitoring policy</div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Weekly checks while opening, then monthly once operating. Meaningful source changes become proposals—never silent edits.</p>
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Next scheduled check</span><span className="font-semibold">Sep 6</span></div><div className="mt-2 flex justify-between"><span className="text-muted-foreground">Last meaningful change</span><span>None</span></div></div>
        </div>
        <div className="rounded-2xl border border-[var(--amber)]/25 bg-[var(--amber-soft)] p-5">
          <p className="text-sm font-semibold text-[var(--amber-dark)]">Dynamic research is honest by design</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Businesses outside a verified pack still receive cited research, but every result is labeled review required until a person confirms it.</p>
        </div>
      </div>
    </div>
  );
}
