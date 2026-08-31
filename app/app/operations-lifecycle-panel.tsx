'use client';

import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Siren,
} from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>;

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'The action could not be completed. Please try again.';
}

function tone(status: string) {
  if (['passed', 'completed'].includes(status)) return 'bg-[var(--sage-soft)] text-[var(--sage)]';
  if (['failed', 'overdue'].includes(status)) return 'bg-[var(--danger-soft)] text-[var(--danger)]';
  if (['due', 'renewal_due', 'reschedule_needed'].includes(status)) return 'bg-[var(--amber-soft)] text-[var(--amber)]';
  return 'bg-[var(--ribbon-soft)] text-[var(--ribbon)]';
}

export function OperationsLifecyclePanel({ locationId }: { locationId: Id<'locations'> }) {
  const setup = useQuery(api.operations.getSetup, { locationId });
  const inspections = useQuery(api.operations.listInspections, { locationId, paginationOpts: { numItems: 20, cursor: null } });
  const renewals = useQuery(api.operations.listRenewals, { locationId, paginationOpts: { numItems: 20, cursor: null } });
  const notifications = useQuery(api.operations.listNotifications, { locationId, paginationOpts: { numItems: 20, cursor: null } });
  const preferences = useQuery(api.operations.getPreferences, { locationId });
  const transitionLifecycle = useMutation(api.locations.transitionLifecycle);
  const createInspection = useMutation(api.operations.createInspection);
  const recordInspectionOutcome = useMutation(api.operations.recordInspectionOutcome);
  const trackRenewal = useMutation(api.operations.trackRenewal);
  const startRenewal = useMutation(api.operations.startRenewal);
  const completeRenewal = useMutation(api.operations.completeRenewal);
  const updatePreferences = useMutation(api.operations.updatePreferences);
  const markRead = useMutation(api.operations.markNotificationRead);
  const [inspection, setInspection] = useState({ agency: '', type: '', date: '', requirementId: '' });
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [renewal, setRenewal] = useState({ requirementId: '', dueDate: '', recurrenceRule: 'FREQ=YEARLY' });
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canApprove = setup?.role === 'owner' || setup?.role === 'admin';
  const canContribute = canApprove || setup?.role === 'contributor';
  const activeRequirements = setup?.requirements.filter((requirement) => requirement.confirmedAt && !['not_applicable', 'conflicted', 'proposed'].includes(requirement.status)) ?? [];

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setPending(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function addInspection(event: FormSubmitEvent) {
    event.preventDefault();
    await run('inspection-create', async () => {
      await createInspection({
        locationId,
        requirementId: inspection.requirementId ? inspection.requirementId as Id<'requirements'> : undefined,
        agency: inspection.agency,
        inspectionType: inspection.type,
        scheduledAt: inspection.date ? new Date(`${inspection.date}T12:00:00`).getTime() : undefined,
      });
      setInspection({ agency: '', type: '', date: '', requirementId: '' });
    }, 'Inspection added to the location record.');
  }

  async function addRenewal(event: FormSubmitEvent) {
    event.preventDefault();
    if (!renewal.requirementId || !renewal.dueDate) return;
    await run('renewal-create', async () => {
      await trackRenewal({ requirementId: renewal.requirementId as Id<'requirements'>, dueAt: new Date(`${renewal.dueDate}T12:00:00`).getTime(), recurrenceRule: renewal.recurrenceRule });
      setRenewal({ requirementId: '', dueDate: '', recurrenceRule: 'FREQ=YEARLY' });
    }, 'Renewal tracked with durable reminder scheduling.');
  }

  return (
    <section id="operations" data-testid="operations-lifecycle" className="mt-7 overflow-hidden rounded-[1.5rem] border bg-background" aria-labelledby="operations-title">
      <div className="flex flex-col justify-between gap-4 border-b px-5 py-6 sm:flex-row sm:items-start sm:px-6"><div><Badge className="bg-[var(--sage-soft)] text-[var(--sage)]"><RefreshCw />Stay-open operations</Badge><h2 id="operations-title" className="mt-4 font-heading text-2xl font-semibold">Opening history in. Recurring readiness out.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Track inspection outcomes, renewals, expiring evidence, and reminder preferences without erasing the opening case file.</p></div>{setup ? <div className="text-right"><Badge className={tone(setup.location.lifecycleStage)}>{setup.location.lifecycleStage}</Badge><div className="mt-3">{setup.location.lifecycleStage === 'planning' ? <Button size="sm" variant="outline" onClick={() => void run('lifecycle', () => transitionLifecycle({ locationId, lifecycleStage: 'opening' }), 'Location moved into opening operations.')} disabled={!canApprove || pending === 'lifecycle'}>Start opening</Button> : setup.location.lifecycleStage === 'opening' ? <Button size="sm" onClick={() => void run('lifecycle', () => transitionLifecycle({ locationId, lifecycleStage: 'operating' }), 'Location is operating. Recurring confirmed requirements are now active.')} disabled={!canApprove || pending === 'lifecycle'}><CheckCircle2 />Mark operating</Button> : null}</div></div> : null}</div>
      {error ? <p role="alert" className="mx-5 mt-5 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)] sm:mx-6">{error}</p> : null}
      {notice ? <output className="mx-5 mt-5 block rounded-xl bg-[var(--sage-soft)] px-3 py-2 text-sm text-[var(--sage)] sm:mx-6">{notice}</output> : null}

      <div className="grid xl:grid-cols-2">
        <div className="border-b p-5 sm:p-6 xl:border-r xl:border-b-0">
          <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-[var(--ribbon)]" /><p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">Inspections</p></div>
          <form onSubmit={addInspection} className="mt-4 grid gap-3 rounded-2xl border bg-[var(--paper-strong)] p-4"><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="inspection-agency">Agency</Label><Input id="inspection-agency" value={inspection.agency} onChange={(event) => setInspection((current) => ({ ...current, agency: event.target.value }))} required /></div><div className="grid gap-1.5"><Label htmlFor="inspection-type">Inspection type</Label><Input id="inspection-type" value={inspection.type} onChange={(event) => setInspection((current) => ({ ...current, type: event.target.value }))} required /></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="inspection-date">Scheduled date</Label><Input id="inspection-date" type="date" value={inspection.date} onChange={(event) => setInspection((current) => ({ ...current, date: event.target.value }))} /></div><div className="grid gap-1.5"><Label htmlFor="inspection-requirement">Linked requirement</Label><select id="inspection-requirement" className="h-9 rounded-lg border bg-background px-3 text-sm" value={inspection.requirementId} onChange={(event) => setInspection((current) => ({ ...current, requirementId: event.target.value }))}><option value="">No requirement</option>{activeRequirements.map((requirement) => <option key={requirement._id} value={requirement._id}>{requirement.title}</option>)}</select></div></div><Button type="submit" size="sm" variant="outline" className="w-fit" disabled={!canContribute || pending === 'inspection-create'}>{pending === 'inspection-create' ? <LoaderCircle className="animate-spin" /> : <CalendarClock />}Add inspection</Button></form>
          <div className="mt-4 grid gap-3">{inspections?.page.length ? inspections.page.map((item) => <article key={item._id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{item.inspectionType}</p><p className="mt-1 text-xs text-muted-foreground">{item.agency}{item.scheduledAt ? ` · ${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(item.scheduledAt)}` : ''}</p></div><Badge className={tone(item.status)}>{item.status.replaceAll('_', ' ')}</Badge></div>{item.outcome ? <p className="mt-3 text-xs leading-5">{item.outcome}</p> : null}{!['passed', 'failed', 'completed'].includes(item.status) ? <div className="mt-3 grid gap-2"><Input aria-label={`Outcome for ${item.inspectionType}`} placeholder="Record what the inspector found" value={outcomes[item._id] ?? ''} onChange={(event) => setOutcomes((current) => ({ ...current, [item._id]: event.target.value }))} /><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void run(`inspection:${item._id}`, () => recordInspectionOutcome({ inspectionId: item._id, status: 'passed', outcome: outcomes[item._id] ?? '' }), 'Inspection marked passed; linked readiness updated.')} disabled={!canContribute || pending === `inspection:${item._id}`}><Check />Passed</Button><Button size="sm" variant="outline" onClick={() => void run(`inspection:${item._id}`, () => recordInspectionOutcome({ inspectionId: item._id, status: 'failed', outcome: outcomes[item._id] ?? '' }), 'Failure recorded and a blocking corrective task created.')} disabled={!canContribute || pending === `inspection:${item._id}`}><AlertTriangle />Failed</Button><Button size="sm" variant="ghost" onClick={() => void run(`inspection:${item._id}`, () => recordInspectionOutcome({ inspectionId: item._id, status: 'reschedule_needed', outcome: outcomes[item._id] ?? '' }), 'Reschedule task created.')} disabled={!canContribute || pending === `inspection:${item._id}`}><Clock3 />Reschedule</Button></div></div> : null}</article>) : <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">No inspections recorded yet.</p>}</div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2"><CalendarClock className="size-4 text-[var(--sage)]" /><p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">Renewals & expirations</p></div>
          <form onSubmit={addRenewal} className="mt-4 grid gap-3 rounded-2xl border bg-[var(--paper-strong)] p-4"><div className="grid gap-1.5"><Label htmlFor="renewal-requirement">Confirmed requirement</Label><select id="renewal-requirement" className="h-9 rounded-lg border bg-background px-3 text-sm" value={renewal.requirementId} onChange={(event) => setRenewal((current) => ({ ...current, requirementId: event.target.value }))} required><option value="">Choose requirement</option>{activeRequirements.map((requirement) => <option key={requirement._id} value={requirement._id}>{requirement.title}</option>)}</select></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="renewal-due">Next due date</Label><Input id="renewal-due" type="date" value={renewal.dueDate} onChange={(event) => setRenewal((current) => ({ ...current, dueDate: event.target.value }))} required /></div><div className="grid gap-1.5"><Label htmlFor="renewal-frequency">Frequency</Label><select id="renewal-frequency" className="h-9 rounded-lg border bg-background px-3 text-sm" value={renewal.recurrenceRule} onChange={(event) => setRenewal((current) => ({ ...current, recurrenceRule: event.target.value }))}><option value="FREQ=YEARLY">Yearly</option><option value="FREQ=MONTHLY">Monthly</option><option value="FREQ=MONTHLY;INTERVAL=3">Quarterly</option><option value="FREQ=MONTHLY;INTERVAL=6">Every six months</option></select></div></div><Button type="submit" size="sm" variant="outline" className="w-fit" disabled={!canApprove || pending === 'renewal-create'}><RefreshCw />Track renewal</Button></form>
          <div className="mt-4 grid gap-3">{renewals?.page.length ? renewals.page.map((cycle) => { const requirement = setup?.requirements.find((item) => item._id === cycle.requirementId); return <article key={cycle._id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{requirement?.title ?? 'Recurring requirement'}</p><p className="mt-1 text-xs text-muted-foreground">Cycle {cycle.sequence} · due {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(cycle.dueAt)}</p></div><Badge className={tone(cycle.status)}>{cycle.status.replaceAll('_', ' ')}</Badge></div>{cycle.outcomeNotes ? <p className="mt-3 text-xs">{cycle.outcomeNotes}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{['upcoming', 'due', 'overdue'].includes(cycle.status) ? <Button size="sm" variant="outline" onClick={() => void run(`renewal:${cycle._id}:start`, () => startRenewal({ renewalCycleId: cycle._id }), 'Renewal work started.')} disabled={!canContribute || pending?.startsWith(`renewal:${cycle._id}`)}><Clock3 />Start</Button> : null}{cycle.status !== 'completed' && cycle.status !== 'cancelled' ? <Button size="sm" onClick={() => void run(`renewal:${cycle._id}:complete`, () => completeRenewal({ renewalCycleId: cycle._id, outcomeNotes: 'Renewal completed and evidence reviewed.' }), 'Renewal completed; the next cycle and reminders were created.')} disabled={!canContribute || pending?.startsWith(`renewal:${cycle._id}`)}><CheckCircle2 />Complete & roll forward</Button> : null}</div></article>; }) : <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">No renewal cycles yet. Operating mode activates confirmed recurring requirements automatically.</p>}</div>
          {setup?.expiringDocuments.length ? <div className="mt-5 rounded-2xl border border-[var(--amber)]/30 bg-[var(--amber-soft)] p-4"><div className="flex items-center gap-2"><Siren className="size-4 text-[var(--amber)]" /><p className="text-sm font-semibold">Expiring evidence</p></div>{setup.expiringDocuments.slice(0, 6).map((document) => <p key={document._id} className="mt-2 text-xs">{document.fileName} · {document.expiresAt ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(document.expiresAt) : ''}</p>)}</div> : null}
        </div>
      </div>

      <div className="grid border-t xl:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b p-5 sm:p-6 xl:border-r xl:border-b-0"><div className="flex items-center gap-2"><Bell className="size-4 text-[var(--ribbon)]" /><p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">Notification center</p></div><div className="mt-4 grid gap-2">{notifications?.page.length ? notifications.page.map((notification) => <button key={notification._id} aria-label={`Mark ${notification.title} read`} className={`rounded-xl border p-3 text-left ${notification.readAt ? 'opacity-65' : 'bg-[var(--paper-strong)]'}`} onClick={() => void run(`notification:${notification._id}`, () => markRead({ notificationId: notification._id }), 'Notification marked read.')} disabled={Boolean(notification.readAt)}><span className="flex items-start justify-between gap-2"><span><span className="block text-sm font-semibold">{notification.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{notification.body}</span></span><Badge className={notification.urgency === 'urgent' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[var(--ribbon-soft)] text-[var(--ribbon)]'}>{notification.urgency}</Badge></span></button>) : <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">No reminders delivered yet.</p>}</div></div>
        <div className="p-5 sm:p-6"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--sage)]" /><p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">Reminder preferences</p></div>{preferences ? <div className="mt-4 grid gap-3"><label htmlFor="urgent-email-reminders" className="flex items-center gap-3 rounded-xl border p-3 text-sm"><Checkbox id="urgent-email-reminders" checked={preferences.urgentEmail} onCheckedChange={(checked) => void run('preferences', () => updatePreferences({ locationId, urgentEmail: checked === true, dailyDigest: preferences.dailyDigest, digestHourLocal: preferences.digestHourLocal, timezone: preferences.timezone }), 'Reminder preferences saved.')} />Urgent reminder email</label><label htmlFor="daily-digest-reminders" className="flex items-center gap-3 rounded-xl border p-3 text-sm"><Checkbox id="daily-digest-reminders" checked={preferences.dailyDigest} onCheckedChange={(checked) => void run('preferences', () => updatePreferences({ locationId, urgentEmail: preferences.urgentEmail, dailyDigest: checked === true, digestHourLocal: preferences.digestHourLocal, timezone: preferences.timezone }), 'Reminder preferences saved.')} />Daily digest at {String(preferences.digestHourLocal).padStart(2, '0')}:00</label><p className="text-xs leading-5 text-muted-foreground">Email delivery is opt-in. In-app reminders are retained in the case record; SMS is not used.</p></div> : null}</div>
      </div>
    </section>
  );
}
