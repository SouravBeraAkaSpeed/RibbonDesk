'use client';

import {
  Bot,
  Check,
  CheckCircle2,
  CornerUpLeft,
  FileText,
  Inbox,
  LoaderCircle,
  Mail,
  MailCheck,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Draft = Doc<'outboundDrafts'>;
type CaseMessage = Doc<'caseMessages'>;
type FormSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>;

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'The action could not be completed. Please try again.';
}

function proposalPayload(value: unknown) {
  const payload = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    dueAt: typeof payload.dueAt === 'number' ? payload.dueAt : undefined,
    taskTitle: typeof payload.taskTitle === 'string' ? payload.taskTitle : '',
  };
}

function statusTone(status: string) {
  if (['delivered', 'processed', 'active'].includes(status)) return 'bg-[var(--sage-soft)] text-[var(--sage)]';
  if (['failed', 'bounced'].includes(status)) return 'bg-[var(--danger-soft)] text-[var(--danger)]';
  if (['needs_review', 'pending_approval', 'approved'].includes(status)) return 'bg-[var(--amber-soft)] text-[var(--amber)]';
  return 'bg-[var(--ribbon-soft)] text-[var(--ribbon)]';
}

const emptyCompose = { to: '', cc: '', subject: '', body: '' };

export function CaseInboxPanel({ locationId }: { locationId: Id<'locations'> }) {
  const setup = useQuery(api.inbox.getSetup, { locationId });
  const integrations = useQuery(api.integrations.status);
  const messages = useQuery(api.inbox.listMessages, { locationId, paginationOpts: { numItems: 30, cursor: null } });
  const drafts = useQuery(api.inbox.listDrafts, { locationId, paginationOpts: { numItems: 20, cursor: null } });
  const proposals = useQuery(api.inbox.listInboundProposals, { locationId, paginationOpts: { numItems: 20, cursor: null } });
  const provisionInbox = useMutation(api.inbox.provision);
  const createDraft = useMutation(api.inbox.createDraft);
  const updateDraft = useMutation(api.inbox.updateDraft);
  const requestApproval = useMutation(api.inbox.requestApproval);
  const approveSend = useMutation(api.inbox.approveSend);
  const returnDraft = useMutation(api.inbox.returnDraft);
  const approveProposal = useMutation(api.inbox.approveInboundProposal);
  const rejectProposal = useMutation(api.inbox.rejectInboundProposal);
  const [compose, setCompose] = useState(emptyCompose);
  const [editingDraftId, setEditingDraftId] = useState<Id<'outboundDrafts'> | null>(null);
  const [requirementId, setRequirementId] = useState<Id<'requirements'> | ''>('');
  const [attachmentIds, setAttachmentIds] = useState<Id<'documents'>[]>([]);
  const [replyContext, setReplyContext] = useState<{ threadId?: string; messageId?: string }>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canApprove = setup?.role === 'owner' || setup?.role === 'admin';
  const canContribute = canApprove || setup?.role === 'contributor';

  function clearMessages() {
    setError(null);
    setNotice(null);
  }

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setPending(key);
    clearMessages();
    try {
      await action();
      setNotice(success);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function saveDraft(event: FormSubmitEvent) {
    event.preventDefault();
    const payload = {
      toAddresses: compose.to.split(',').map((value) => value.trim()).filter(Boolean),
      ccAddresses: compose.cc.split(',').map((value) => value.trim()).filter(Boolean),
      subject: compose.subject,
      bodyText: compose.body,
      requirementId: requirementId || undefined,
      attachmentDocumentIds: attachmentIds,
      providerThreadId: replyContext.threadId,
      replyToMessageId: replyContext.messageId,
    };
    await run('save-draft', async () => {
      if (editingDraftId) await updateDraft({ draftId: editingDraftId, ...payload });
      else await createDraft({ locationId, ...payload });
      setCompose(emptyCompose);
      setEditingDraftId(null);
      setRequirementId('');
      setAttachmentIds([]);
      setReplyContext({});
    }, editingDraftId ? 'Draft updated. Its approval snapshot will be created only after review.' : 'Draft saved. Submit it for owner/admin review when it is ready.');
  }

  function editDraft(draft: Draft) {
    setEditingDraftId(draft._id);
    setCompose({ to: draft.toAddresses.join(', '), cc: draft.ccAddresses.join(', '), subject: draft.subject, body: draft.bodyText });
    setRequirementId(draft.requirementId ?? '');
    setAttachmentIds(draft.attachmentDocumentIds);
    setReplyContext({ threadId: draft.providerThreadId, messageId: draft.replyToMessageId });
    document.querySelector('#case-compose')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function draftReply(message: CaseMessage) {
    setEditingDraftId(null);
    setCompose({ to: message.fromAddress.includes('@') ? message.fromAddress : '', cc: '', subject: message.subject.toLowerCase().startsWith('re:') ? message.subject : `Re: ${message.subject}`, body: 'Thank you for the update. We reviewed the request and will follow up with the requested information.' });
    setReplyContext({ threadId: message.providerThreadId, messageId: message.providerMessageId });
    document.querySelector('#case-compose')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <section id="case-inbox" data-testid="case-inbox" className="mt-7 overflow-hidden rounded-[1.5rem] border bg-background" aria-labelledby="case-inbox-title">
      <div className="flex flex-col justify-between gap-4 border-b px-5 py-6 sm:flex-row sm:items-start sm:px-6">
        <div><Badge className="bg-[var(--ribbon-soft)] text-[var(--ribbon)]"><Inbox />Case inbox</Badge><h2 id="case-inbox-title" className="mt-4 font-heading text-2xl font-semibold">Agency mail becomes reviewed work.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Inbound messages are summarized into proposals. Outbound mail requires an immutable owner/admin approval before delivery.</p></div>
        {setup?.binding ? <div className="text-right"><Badge className={statusTone(setup.binding.status)}>{setup.binding.status}</Badge><p className="mt-2 text-xs font-medium">{setup.binding.emailAddress ?? 'Provisioning address…'}</p><p className="mt-1 text-[11px] text-muted-foreground">{setup.binding.providerMode === 'live' ? 'Live AgentMail' : 'Development replay disabled'}</p></div> : null}
      </div>

      {error ? <p role="alert" className="mx-5 mt-5 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)] sm:mx-6">{error}</p> : null}
      {notice ? <output className="mx-5 mt-5 block rounded-xl bg-[var(--sage-soft)] px-3 py-2 text-sm text-[var(--sage)] sm:mx-6">{notice}</output> : null}

      {!setup?.binding ? <div className="m-5 rounded-2xl border border-dashed bg-[var(--paper-strong)] p-7 text-center sm:m-6"><Mail className="mx-auto size-7 text-[var(--ribbon)]" /><p className="mt-3 font-semibold">Create this location’s dedicated case inbox</p><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-muted-foreground">A live AgentMail inbox receives real agency messages through a signed webhook. RibbonDesk never substitutes a synthetic thread.</p>{integrations && !integrations.inboxReady ? <p className="mx-auto mt-3 max-w-xl rounded-xl bg-[var(--amber-soft)] px-3 py-2 text-xs text-[var(--amber)]">Live AgentMail and OpenAI credentials are not configured yet.</p> : null}<Button className="mt-4 bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]" onClick={() => void run('provision', () => provisionInbox({ locationId }), 'Case inbox requested. Its status updates here in realtime.')} disabled={!canApprove || pending === 'provision' || integrations?.inboxReady === false}>{pending === 'provision' ? <LoaderCircle className="animate-spin" /> : <Plus />}Create live case inbox</Button></div> : <>
        {setup.binding.status === 'failed' ? <p className="mx-5 mt-5 rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)] sm:mx-6">{setup.binding.errorMessage ?? 'Inbox provisioning failed. Check the live integration configuration.'}</p> : null}
        <div className="grid xl:grid-cols-[1.08fr_0.92fr]">
          <div className="border-b p-5 sm:p-6 xl:border-r xl:border-b-0">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">Reactive thread</p><h3 className="mt-2 font-semibold">Messages</h3></div><Badge variant="outline"><MailCheck />{setup.binding.providerMode === 'live' ? 'Webhook live' : 'Live webhook required'}</Badge></div>
            <div className="mt-4 grid gap-3">
              {messages?.page.length ? messages.page.map((message) => <article key={message._id} className={`rounded-2xl border p-4 ${message.direction === 'inbound' ? 'bg-[var(--paper-strong)]' : 'ml-5 bg-background'}`}><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{message.subject}</p><p className="mt-1 truncate text-xs text-muted-foreground">{message.direction === 'inbound' ? `From ${message.fromAddress}` : `To ${message.toAddresses.join(', ')}`}</p></div><div className="flex gap-1"><Badge variant="outline">{message.direction}</Badge><Badge className={statusTone(message.status)}>{message.status.replaceAll('_', ' ')}</Badge></div></div><p className="mt-3 text-sm leading-6">{message.aiSummary ?? message.preview}</p>{message.attachments.length ? <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="size-3" />{message.attachments.map((attachment) => attachment.fileName).join(', ')}</p> : null}{message.direction === 'inbound' && canContribute ? <Button size="sm" variant="ghost" className="mt-2" onClick={() => draftReply(message)}><CornerUpLeft />Draft reply</Button> : null}</article>) : <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">No messages yet.</p>}
            </div>

            {proposals?.page.length ? <div className="mt-6"><div className="flex items-center gap-2"><Bot className="size-4 text-[var(--ribbon)]" /><p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">AI proposals · human decision</p></div><div className="mt-3 grid gap-3">{proposals.page.map((proposal) => { const payload = proposalPayload(proposal.payload); return <article key={proposal._id} className="rounded-2xl border border-[var(--amber)]/30 bg-[var(--amber-soft)] p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{proposal.title}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{proposal.summary}</p></div><Badge variant="outline">{proposal.confidence}</Badge></div><div className="mt-3 rounded-xl bg-background/70 p-3 text-xs"><p className="font-semibold">Proposed task: {payload.taskTitle}</p>{payload.dueAt ? <p className="mt-1 text-muted-foreground">Due {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(payload.dueAt)}</p> : null}</div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => void run(`proposal:${proposal._id}:approve`, () => approveProposal({ proposalId: proposal._id }), 'Proposal approved. The follow-up now appears in Today.')} disabled={!canApprove || pending?.startsWith(`proposal:${proposal._id}`)}><Check />Approve change</Button><Button size="sm" variant="outline" onClick={() => void run(`proposal:${proposal._id}:reject`, () => rejectProposal({ proposalId: proposal._id, reason: 'Not applicable after review.' }), 'Proposal rejected; the message remains in the case record.')} disabled={!canApprove || pending?.startsWith(`proposal:${proposal._id}`)}><X />Reject</Button></div></article>; })}</div></div> : null}
          </div>

          <div className="p-5 sm:p-6">
            <form id="case-compose" onSubmit={saveDraft} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">Editable outbound</p><h3 className="mt-2 font-semibold">{editingDraftId ? 'Edit draft' : replyContext.messageId ? 'Draft reply' : 'New message'}</h3></div>{editingDraftId ? <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingDraftId(null); setCompose(emptyCompose); setAttachmentIds([]); setRequirementId(''); setReplyContext({}); }}><X />Cancel</Button> : null}</div>
              <div className="mt-4 grid gap-3"><div className="grid gap-1.5"><Label htmlFor="case-to">To</Label><Input id="case-to" type="text" placeholder="agency@example.gov" value={compose.to} onChange={(event) => setCompose((current) => ({ ...current, to: event.target.value }))} required /></div><div className="grid gap-1.5"><Label htmlFor="case-cc">CC <span className="font-normal text-muted-foreground">optional, comma-separated</span></Label><Input id="case-cc" value={compose.cc} onChange={(event) => setCompose((current) => ({ ...current, cc: event.target.value }))} /></div><div className="grid gap-1.5"><Label htmlFor="case-subject">Subject</Label><Input id="case-subject" value={compose.subject} onChange={(event) => setCompose((current) => ({ ...current, subject: event.target.value }))} required /></div><div className="grid gap-1.5"><Label htmlFor="case-body">Message</Label><Textarea id="case-body" rows={6} value={compose.body} onChange={(event) => setCompose((current) => ({ ...current, body: event.target.value }))} required /></div>
                <div className="grid gap-1.5"><Label htmlFor="case-requirement">Linked requirement</Label><select id="case-requirement" className="h-9 rounded-lg border bg-background px-3 text-sm" value={requirementId} onChange={(event) => setRequirementId(event.target.value as Id<'requirements'> | '')}><option value="">No requirement</option>{setup.requirements.map((requirement) => <option key={requirement._id} value={requirement._id}>{requirement.title}</option>)}</select></div>
                {setup.documents.length ? <fieldset className="rounded-xl bg-[var(--paper-strong)] p-3"><legend className="px-1 text-xs font-semibold">Safety-checked attachments</legend><div className="mt-1 grid gap-2">{setup.documents.slice(0, 8).map((document) => <label key={document._id} className="flex items-center gap-2 text-xs"><Checkbox checked={attachmentIds.includes(document._id)} onCheckedChange={(checked) => setAttachmentIds((current) => checked === true ? [...new Set([...current, document._id])] : current.filter((id) => id !== document._id))} /><FileText className="size-3" />{document.fileName}</label>)}</div></fieldset> : null}
              </div>
              <Button type="submit" size="sm" className="mt-4" disabled={!canContribute || pending === 'save-draft'}>{pending === 'save-draft' ? <LoaderCircle className="animate-spin" /> : editingDraftId ? <Check /> : <Pencil />}{editingDraftId ? 'Save changes' : 'Save draft'}</Button>
            </form>

            <div className="mt-5"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--sage)]" /><p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">Approval & delivery</p></div><div className="mt-3 grid gap-3">{drafts?.page.length ? drafts.page.map((draft) => <article key={draft._id} data-testid="outbound-draft" className="rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{draft.subject}</p><p className="mt-1 truncate text-xs text-muted-foreground">To {draft.toAddresses.join(', ')}</p></div><Badge className={statusTone(draft.status)}>{draft.status.replaceAll('_', ' ')}</Badge></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{draft.bodyText}</p>{draft.attachmentDocumentIds.length ? <p className="mt-2 flex items-center gap-1 text-xs"><Paperclip className="size-3" />{draft.attachmentDocumentIds.length} reviewed attachment{draft.attachmentDocumentIds.length === 1 ? '' : 's'}</p> : null}{draft.errorMessage ? <p className="mt-2 rounded-lg bg-[var(--danger-soft)] p-2 text-xs text-[var(--danger)]">{draft.errorMessage}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{draft.status === 'draft' ? <><Button size="sm" variant="outline" onClick={() => editDraft(draft)}><Pencil />Edit</Button><Button size="sm" onClick={() => void run(`request:${draft._id}`, () => requestApproval({ draftId: draft._id }), 'Draft locked and submitted for owner/admin approval.')} disabled={!canContribute || pending === `request:${draft._id}`}><ShieldCheck />Request approval</Button></> : null}{draft.status === 'pending_approval' ? <><Button size="sm" onClick={() => void run(`approve:${draft._id}`, () => approveSend({ draftId: draft._id }), 'Approval recorded. Delivery state will update here in realtime.')} disabled={!canApprove || pending === `approve:${draft._id}`}><Send />Approve & send</Button><Button size="sm" variant="outline" onClick={() => void run(`return:${draft._id}`, () => returnDraft({ draftId: draft._id, reason: 'Returned for edits before sending.' }), 'Draft returned for edits.')} disabled={!canApprove || pending === `return:${draft._id}`}><RotateCcw />Return</Button></> : null}{draft.status === 'delivered' ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--sage)]"><CheckCircle2 className="size-4" />Delivery confirmed</span> : null}</div></article>) : <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">No outbound drafts yet.</p>}</div></div>
          </div>
        </div>
      </>}
    </section>
  );
}
