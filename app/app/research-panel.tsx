'use client';

import {
  Check,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

type Proposal = Doc<'proposals'>;
type ReviewRole = 'owner' | 'admin' | 'contributor' | 'viewer';
type EditValues = { title: string; agency: string; nextAction: string };

function messageFrom(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'The action could not be completed. Please try again.';
}

function payloadStrings(payload: unknown) {
  const value =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};
  return {
    agency: typeof value.agency === 'string' ? value.agency : '',
    nextAction: typeof value.nextAction === 'string' ? value.nextAction : '',
    questions: Array.isArray(value.unansweredQuestions)
      ? value.unansweredQuestions.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
  };
}

function statusTone(status?: string) {
  if (status === 'needs_review' || status === 'partial')
    return 'bg-[var(--amber-soft)] text-[var(--amber)]';
  if (status === 'failed' || status === 'rate_limited')
    return 'bg-[var(--danger-soft)] text-[var(--danger)]';
  if (status === 'completed') return 'bg-[var(--sage-soft)] text-[var(--sage)]';
  return 'bg-[var(--ribbon-soft)] text-[var(--ribbon)]';
}

export function ResearchPanel({
  locationId,
  role,
}: {
  locationId: Id<'locations'>;
  role: ReviewRole;
}) {
  const preview = useQuery(api.research.previewSources, { locationId });
  const latest = useQuery(api.research.latest, { locationId });
  const proposals = useQuery(api.proposals.list, {
    locationId,
    status: 'pending',
    proposalType: 'requirement',
    paginationOpts: { numItems: 20, cursor: null },
  });
  const requirements = useQuery(api.requirements.list, {
    locationId,
    paginationOpts: { numItems: 20, cursor: null },
  });
  const startResearch = useMutation(api.research.start);
  const cancelResearch = useMutation(api.research.cancel);
  const acceptRequirement = useMutation(api.proposals.acceptRequirement);
  const rejectProposal = useMutation(api.proposals.reject);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<EditValues>({
    title: '',
    agency: '',
    nextAction: '',
  });

  const canApprove = role === 'owner' || role === 'admin';
  const runStatus = latest?.run?.status as string | undefined;
  const runActive = runStatus === 'queued' || runStatus === 'running';
  const crawlCompleted = Number(
    latest?.crawl?.completed ?? latest?.run?.processedSources ?? 0,
  );
  const crawlTotal = Number(
    latest?.crawl?.total ?? latest?.run?.totalSources ?? 0,
  );
  const crawlProgress =
    crawlTotal > 0
      ? Math.min(100, Math.round((crawlCompleted / crawlTotal) * 100))
      : runActive
        ? 12
        : 0;

  async function runResearch() {
    setPending('research');
    setError(null);
    setNotice(null);
    try {
      await startResearch({ locationId });
      setNotice(
        'Research started. Progress and proposals update here in realtime.',
      );
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  function beginEditing(proposal: Proposal) {
    const payload = payloadStrings(proposal.payload);
    setEditingId(proposal._id);
    setEdits({
      title: proposal.title,
      agency: payload.agency,
      nextAction: payload.nextAction,
    });
  }

  async function accept(
    proposal: Proposal,
    disposition: 'start' | 'not_applicable',
    includeEdits = false,
  ) {
    setPending(`${proposal._id}:${disposition}`);
    setError(null);
    setNotice(null);
    try {
      await acceptRequirement({
        proposalId: proposal._id,
        disposition,
        edits: includeEdits ? edits : undefined,
      });
      setEditingId(null);
      setNotice(
        disposition === 'start'
          ? 'Requirement confirmed and its next action was added to Today.'
          : 'Requirement recorded as not applicable with its evidence preserved.',
      );
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function reject(proposal: Proposal) {
    setPending(`${proposal._id}:reject`);
    setError(null);
    setNotice(null);
    try {
      await rejectProposal({
        proposalId: proposal._id,
        reason: 'Rejected during human compliance review.',
      });
      setNotice(
        'Proposal rejected. The decision remains in the activity record.',
      );
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      className="mt-7 overflow-hidden rounded-[1.5rem] border bg-background"
      aria-labelledby="research-title"
    >
      <div className="border-b bg-[var(--ink)] px-5 py-6 text-white sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/10 text-white">
                <FileSearch />
                Cited research desk
              </Badge>
              {latest?.run ? (
                <Badge className={statusTone(runStatus)}>
                  {runStatus?.replaceAll('_', ' ')}
                </Badge>
              ) : null}
              {latest?.run ? (
                <Badge className="bg-white/10 text-white">
                  {latest.run.providerMode === 'live'
                    ? 'Live providers'
                    : 'Synthetic replay'}
                </Badge>
              ) : null}
            </div>
            <h2
              id="research-title"
              className="mt-4 font-heading text-2xl font-semibold"
            >
              Find the rules. Keep the judgment human.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Review the source scope, start a durable run, then accept, edit,
              reject, or mark each cited proposal not applicable.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              onClick={runResearch}
              disabled={runActive || pending === 'research' || !preview}
              className="bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
            >
              {runActive || pending === 'research' ? (
                <LoaderCircle className="animate-spin" />
              ) : latest?.run ? (
                <RefreshCw />
              ) : (
                <Sparkles />
              )}
              {runActive
                ? 'Research running…'
                : latest?.run
                  ? 'Run research again'
                  : 'Approve & run research'}
            </Button>
            {runActive && latest?.run ? (
              <Button
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() =>
                  void (async () => {
                    setPending('cancel');
                    setError(null);
                    try {
                      await cancelResearch({ researchRunId: latest.run._id });
                      setNotice(
                        'Research cancelled. Captured evidence remains available and a new run can be started.',
                      );
                    } catch (caught) {
                      setError(messageFrom(caught));
                    } finally {
                      setPending(null);
                    }
                  })()
                }
                disabled={pending === 'cancel'}
              >
                {pending === 'cancel' ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <X />
                )}
                Cancel run
              </Button>
            ) : null}
          </div>
        </div>
        {runActive ? (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-white/60">
              <span>Firecrawl workflow</span>
              <span>
                {crawlTotal
                  ? `${crawlCompleted} / ${crawlTotal} sources`
                  : 'Starting…'}
              </span>
            </div>
            <Progress
              value={crawlProgress}
              aria-label={`Research progress ${crawlProgress} percent`}
              className="[&_[data-slot=progress-indicator]]:bg-[var(--ribbon)]"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-0 xl:grid-cols-[0.82fr_1.3fr]">
        <div className="border-b p-5 sm:p-6 xl:border-r xl:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                Source scope
              </p>
              <h3 className="mt-2 font-semibold">
                {preview?.coverageMode === 'verified_pack'
                  ? 'Verified NYC pack'
                  : 'Official-domain discovery'}
              </h3>
            </div>
            <Badge variant="outline">
              {preview?.sources.length ?? 0} source
              {preview?.sources.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {preview?.reviewRequired
              ? 'This coverage is dynamic. Every result is labeled review required.'
              : 'These maintained starting points are official. Human approval is still required.'}
          </p>
          <div className="mt-4 grid gap-3">
            {preview?.sources.map((source) => (
              <div
                key={source.key}
                className="rounded-xl border bg-[var(--paper-strong)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{source.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {source.agency}
                    </p>
                  </div>
                  <CheckCircle2 className="size-4 shrink-0 text-[var(--sage)]" />
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {source.why}
                </p>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ribbon)] hover:underline"
                  >
                    Open official source <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <p className="mt-2 text-xs font-medium text-[var(--amber)]">
                    Domain candidates will appear after discovery.
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3 rounded-xl bg-[var(--amber-soft)] p-3 text-xs leading-5 text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[var(--amber)]" />
            Crawled pages and email content are treated as untrusted evidence,
            never as instructions.
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                Human review queue
              </p>
              <h3 className="mt-2 font-semibold">
                {proposals?.page.length ?? 0} proposal
                {proposals?.page.length === 1 ? '' : 's'} waiting
              </h3>
            </div>
            {!canApprove ? (
              <Badge className="bg-[var(--amber-soft)] text-[var(--amber)]">
                Owner/admin approval required
              </Badge>
            ) : null}
          </div>
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <output className="mt-4 block rounded-xl bg-[var(--sage-soft)] px-3 py-2 text-sm text-[var(--sage)]">
              {notice}
            </output>
          ) : null}

          {proposals?.page.length ? (
            <div className="mt-4 grid gap-4">
              {proposals.page.map((proposal) => {
                const payload = payloadStrings(proposal.payload);
                const isEditing = editingId === proposal._id;
                const isPending = pending?.startsWith(proposal._id);
                return (
                  <article
                    key={proposal._id}
                    className="rounded-2xl border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-[var(--ribbon-soft)] text-[var(--ribbon)]">
                        Review required
                      </Badge>
                      <Badge variant="outline">
                        {proposal.confidence} confidence
                      </Badge>
                    </div>
                    {isEditing ? (
                      <div className="mt-4 grid gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor={`proposal-title-${proposal._id}`}>
                            Requirement title
                          </Label>
                          <Input
                            id={`proposal-title-${proposal._id}`}
                            value={edits.title}
                            onChange={(event) =>
                              setEdits((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`proposal-agency-${proposal._id}`}>
                            Agency
                          </Label>
                          <Input
                            id={`proposal-agency-${proposal._id}`}
                            value={edits.agency}
                            onChange={(event) =>
                              setEdits((current) => ({
                                ...current,
                                agency: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`proposal-action-${proposal._id}`}>
                            Next action
                          </Label>
                          <Input
                            id={`proposal-action-${proposal._id}`}
                            value={edits.nextAction}
                            onChange={(event) =>
                              setEdits((current) => ({
                                ...current,
                                nextAction: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="mt-3 font-semibold">{proposal.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {proposal.summary}
                        </p>
                        <p className="mt-3 text-xs">
                          <span className="font-semibold">Agency:</span>{' '}
                          {payload.agency || 'Needs review'}
                        </p>
                        <p className="mt-1 text-xs">
                          <span className="font-semibold">Next action:</span>{' '}
                          {payload.nextAction || 'Define during review'}
                        </p>
                      </>
                    )}
                    {payload.questions.length ? (
                      <div className="mt-3 rounded-xl bg-[var(--amber-soft)] px-3 py-2 text-xs leading-5">
                        <span className="font-semibold text-[var(--amber)]">
                          Open question:
                        </span>{' '}
                        {payload.questions.join(' ')}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {proposal.citations.map((citation) => (
                        <a
                          key={`${proposal._id}-${citation.url}`}
                          href={citation.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                        >
                          <ExternalLink className="size-3" />
                          {citation.title}
                        </a>
                      ))}
                    </div>
                    {canApprove ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => accept(proposal, 'start', true)}
                              disabled={isPending}
                            >
                              <Check />
                              Save & accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                              disabled={isPending}
                            >
                              <X />
                              Cancel edit
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => accept(proposal, 'start')}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <LoaderCircle className="animate-spin" />
                              ) : (
                                <Check />
                              )}
                              Accept & create task
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => beginEditing(proposal)}
                              disabled={isPending}
                            >
                              <Pencil />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => accept(proposal, 'not_applicable')}
                              disabled={isPending}
                            >
                              Not applicable
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[var(--danger)]"
                              onClick={() => reject(proposal)}
                              disabled={isPending}
                            >
                              <X />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : latest?.run && !runActive ? (
            <div className="mt-4 rounded-2xl border border-dashed bg-[var(--paper-strong)] px-5 py-8 text-center">
              <CheckCircle2 className="mx-auto size-7 text-[var(--sage)]" />
              <p className="mt-3 text-sm font-semibold">No proposals waiting</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Run research again or review the confirmed record below.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed bg-[var(--paper-strong)] px-5 py-8 text-center">
              <FileSearch className="mx-auto size-7 text-[var(--ribbon)]" />
              <p className="mt-3 text-sm font-semibold">Preview is ready</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Approve the source scope to create cited proposals.
              </p>
            </div>
          )}

          {latest?.run?.errorMessage ? (
            <p className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-xs leading-5 text-[var(--danger)]">
              {latest.run.errorMessage}
            </p>
          ) : null}
          {requirements?.page.length ? (
            <div className="mt-6 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                Confirmed record
              </p>
              <div className="mt-3 grid gap-2">
                {requirements.page.slice(0, 6).map((requirement) => (
                  <div
                    key={requirement._id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-[var(--paper-strong)] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{requirement.title}</p>
                      <a
                        href={requirement.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--ribbon)] hover:underline"
                      >
                        {requirement.sourceTitle}
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <Badge variant="outline">
                      {requirement.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
