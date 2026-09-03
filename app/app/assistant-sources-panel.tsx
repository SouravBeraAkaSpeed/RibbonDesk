'use client';

import {
  ArrowRight,
  Bot,
  Check,
  Clock3,
  ExternalLink,
  FileDiff,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type FormSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>;
type ReviewRole = 'owner' | 'admin' | 'contributor' | 'viewer';

function messageFrom(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The action could not be completed. Please try again.';
}

function dateTime(value?: number) {
  return value
    ? new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(value)
    : 'Not checked yet';
}

function AssistantMarkdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-6 text-[var(--ink)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: heading }) => (
            <h3 className="pt-1 font-heading text-lg font-semibold">
              {heading}
            </h3>
          ),
          h2: ({ children: heading }) => (
            <h3 className="pt-1 font-heading text-base font-semibold">
              {heading}
            </h3>
          ),
          h3: ({ children: heading }) => (
            <h4 className="pt-1 text-sm font-semibold">{heading}</h4>
          ),
          p: ({ children: paragraph }) => <p>{paragraph}</p>,
          ul: ({ children: items }) => (
            <ul className="ml-5 list-disc space-y-1">{items}</ul>
          ),
          ol: ({ children: items }) => (
            <ol className="ml-5 list-decimal space-y-1">{items}</ol>
          ),
          li: ({ children: item }) => <li className="pl-1">{item}</li>,
          strong: ({ children: text }) => (
            <strong className="font-semibold text-[var(--ink)]">{text}</strong>
          ),
          a: ({ href, children: label }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--ribbon)] underline decoration-[var(--ribbon)]/35 underline-offset-2 hover:decoration-[var(--ribbon)]"
            >
              {label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ),
          blockquote: ({ children: quote }) => (
            <blockquote className="border-l-2 border-[var(--ribbon)] pl-3 text-muted-foreground">
              {quote}
            </blockquote>
          ),
          code: ({ children: code }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
              {code}
            </code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function AssistantSourcesPanel({
  locationId,
  role,
}: {
  locationId: Id<'locations'>;
  role: ReviewRole;
}) {
  const threads = useQuery(api.assistant.listThreads, {
    locationId,
    paginationOpts: { numItems: 10, cursor: null },
  });
  const activeThreadId = threads?.page[0]?._id;
  const messages = useQuery(
    api.assistant.listMessages,
    activeThreadId
      ? {
          assistantThreadId: activeThreadId,
          paginationOpts: { numItems: 40, cursor: null },
        }
      : 'skip',
  );
  const setup = useQuery(api.sourceMonitor.getSetup, { locationId });
  const integrations = useQuery(api.integrations.status);
  const changes = useQuery(api.sourceMonitor.listChanges, {
    locationId,
    paginationOpts: { numItems: 12, cursor: null },
  });
  const createThread = useMutation(api.assistant.createThread);
  const askAssistant = useAction(api.assistant.ask);
  const startResearch = useMutation(api.research.start);
  const acceptChange = useMutation(api.sourceMonitor.acceptChange);
  const rejectChange = useMutation(api.sourceMonitor.rejectChange);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canApprove = role === 'owner' || role === 'admin';
  const transcript = [...(messages?.page ?? [])].sort(
    (left, right) =>
      left.order - right.order || left.stepOrder - right.stepOrder,
  );

  async function run(
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
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

  async function submitQuestion(event: FormSubmitEvent) {
    event.preventDefault();
    if (!activeThreadId || question.trim().length < 3) return;
    const prompt = question;
    setQuestion('');
    await run(
      'assistant-ask',
      () =>
        askAssistant({ assistantThreadId: activeThreadId, question: prompt }),
      'Ribbon Assistant answered from the current workspace record.',
    );
  }

  return (
    <section
      id="ribbon-assistant"
      data-testid="assistant-sources"
      className="mt-7 overflow-hidden rounded-[1.5rem] border bg-background"
      aria-labelledby="assistant-title"
    >
      <div className="grid xl:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b p-5 sm:p-6 xl:border-r xl:border-b-0">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <Badge className="bg-[var(--ribbon-soft)] text-[var(--ribbon)]">
                <Bot />
                Grounded copilot
              </Badge>
              <h2
                id="assistant-title"
                className="mt-4 font-heading text-2xl font-semibold"
              >
                Ask the desk, not the open web.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Ribbon Assistant reads confirmed requirements, tasks,
                applications, agency messages, inspections, renewals, and
                reviewed source evidence. It cannot change state or send
                anything.
              </p>
            </div>
            <Badge variant="outline">
              {integrations?.ai && integrations.mode === 'live'
                ? 'Live OpenAI'
                : 'Live OpenAI required'}
            </Badge>
          </div>

          {!activeThreadId ? (
            <div className="mt-5 rounded-2xl border border-dashed bg-[var(--paper-strong)] p-6 text-center">
              <MessageSquareText className="mx-auto size-7 text-[var(--ribbon)]" />
              <p className="mt-3 text-sm font-semibold">
                Start a private workspace thread
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                Each teammate gets a separate durable thread grounded in this
                location.
              </p>
              <Button
                data-testid="assistant-create"
                className="mt-4"
                onClick={() =>
                  void run(
                    'assistant-create',
                    () => createThread({ locationId }),
                    'Assistant thread created.',
                  )
                }
                disabled={
                  pending === 'assistant-create' ||
                  !integrations?.ai ||
                  integrations.mode !== 'live'
                }
              >
                {pending === 'assistant-create' ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                Start Assistant thread
              </Button>
            </div>
          ) : (
            <>
              <div
                data-testid="assistant-transcript"
                aria-live="polite"
                className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl border bg-[var(--paper-strong)] p-4"
              >
                {transcript.length ? (
                  transcript.map((message) => {
                    const assistant = message.message?.role === 'assistant';
                    return (
                      <article
                        key={message._id}
                        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${assistant ? 'mr-auto border bg-background' : 'ml-auto bg-[var(--ink)] text-white'}`}
                      >
                        <p
                          className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${assistant ? 'text-[var(--ribbon)]' : 'text-white/60'}`}
                        >
                          {assistant ? 'Ribbon Assistant' : 'You'}
                        </p>
                        {message.text ? (
                          assistant ? (
                            <AssistantMarkdown>
                              {message.text}
                            </AssistantMarkdown>
                          ) : (
                            <p className="whitespace-pre-wrap">
                              {message.text}
                            </p>
                          )
                        ) : (
                          <p>
                            {message.status === 'pending'
                              ? 'Thinking from the workspace record…'
                              : 'Message unavailable.'}
                          </p>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <p className="py-7 text-center text-xs text-muted-foreground">
                    Ask what blocks opening, what is due next, or what to
                    clarify with an agency.
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  'What blocks opening?',
                  'What should I ask the Health Department?',
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setQuestion(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
              <form
                onSubmit={submitQuestion}
                className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
              >
                <Textarea
                  data-testid="assistant-question"
                  aria-label="Ask Ribbon Assistant"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask a grounded question about this location…"
                  className="min-h-20 flex-1"
                  maxLength={2_000}
                  required
                />
                <Button
                  data-testid="assistant-submit"
                  type="submit"
                  className="sm:h-10"
                  disabled={
                    pending === 'assistant-ask' ||
                    question.trim().length < 3 ||
                    !integrations?.ai ||
                    integrations.mode !== 'live'
                  }
                >
                  {pending === 'assistant-ask' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ArrowRight />
                  )}
                  Ask
                </Button>
              </form>
            </>
          )}
          <div className="mt-4 flex gap-3 rounded-xl bg-[var(--sage-soft)] p-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" />
            Answers distinguish confirmed records from uncertainty, cite
            official sources when available, and remain human-reviewable.
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <Badge className="bg-[var(--amber-soft)] text-[var(--amber)]">
                <FileDiff />
                Source watch
              </Badge>
              <h3 className="mt-4 font-heading text-xl font-semibold">
                Know when official guidance moves.
              </h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Weekly while opening; monthly after opening. A change becomes
                evidence and a proposal, never an automatic rule edit.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void run(
                  'source-refresh',
                  () => startResearch({ locationId, sourceRefresh: true }),
                  'Official-source refresh queued. Progress is visible in the research desk.',
                )
              }
              disabled={
                pending === 'source-refresh' ||
                integrations?.researchReady === false
              }
            >
              {pending === 'source-refresh' ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Refresh now
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border bg-[var(--paper-strong)] p-4 text-xs">
            <div>
              <p className="text-muted-foreground">Last checked</p>
              <p className="mt-1 font-semibold">
                {dateTime(setup?.lastSourceCheckAt)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Next scheduled</p>
              <p className="mt-1 font-semibold">
                {dateTime(setup?.nextSourceCheckAt)}
              </p>
            </div>
          </div>
          <div data-testid="source-change-list" className="mt-4 grid gap-3">
            {changes?.page.length ? (
              changes.page.map(({ change, before, after }) => (
                <article key={change._id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      className={
                        change.status === 'pending'
                          ? 'bg-[var(--amber-soft)] text-[var(--amber)]'
                          : change.status === 'accepted'
                            ? 'bg-[var(--sage-soft)] text-[var(--sage)]'
                            : 'bg-muted text-muted-foreground'
                      }
                    >
                      {change.status.replaceAll('_', ' ')}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Intl.DateTimeFormat('en', {
                        dateStyle: 'medium',
                      }).format(change.detectedAt)}
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold">{after.title}</h4>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {change.summary}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/55 p-3">
                      <p className="font-semibold">Before</p>
                      <p className="mt-1 line-clamp-4 text-muted-foreground">
                        {before.excerpt || 'No excerpt captured.'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--amber-soft)] p-3">
                      <p className="font-semibold text-[var(--amber)]">
                        Latest capture
                      </p>
                      <p className="mt-1 line-clamp-4 text-muted-foreground">
                        {after.excerpt || 'No excerpt captured.'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={after.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ribbon)] hover:underline"
                  >
                    Open official source <ExternalLink className="size-3" />
                  </a>
                  {change.status === 'pending' && canApprove ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        data-testid="source-accept"
                        size="sm"
                        onClick={() =>
                          void run(
                            `source-accept:${change._id}`,
                            () => acceptChange({ sourceChangeId: change._id }),
                            'Change accepted for review; linked records now need attention and a blocking task was created.',
                          )
                        }
                        disabled={pending?.endsWith(change._id)}
                      >
                        <Check />
                        Accept for review
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[var(--danger)]"
                        onClick={() =>
                          void run(
                            `source-reject:${change._id}`,
                            () => rejectChange({ sourceChangeId: change._id }),
                            'Change rejected; requirements were left untouched.',
                          )
                        }
                        disabled={pending?.endsWith(change._id)}
                      >
                        <X />
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center">
                <Clock3 className="mx-auto size-6 text-[var(--sage)]" />
                <p className="mt-3 text-sm font-semibold">
                  No source changes waiting
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Scheduled checks will preserve evidence here when official
                  content changes.
                </p>
              </div>
            )}
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
        </div>
      </div>
    </section>
  );
}
