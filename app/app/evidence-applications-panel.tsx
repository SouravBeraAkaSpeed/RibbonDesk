'use client';

import {
  Archive,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Link2,
  LoaderCircle,
  PackageCheck,
  Paperclip,
  Send,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useMemo, useState, type SyntheticEvent } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Application = Doc<'applications'>;
type DocumentRecord = Doc<'documents'>;
type FormSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>;

function messageFrom(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'The action could not be completed. Please try again.';
}

function defaultClassification(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.includes('insurance')) return 'Insurance certificate';
  if (lower.includes('receipt')) return 'Submission receipt';
  if (lower.includes('permit')) return 'Permit evidence';
  return 'Application attachment';
}

export function EvidenceApplicationsPanel({ locationId }: { locationId: Id<'locations'> }) {
  const documents = useQuery(api.documents.list, { locationId, paginationOpts: { numItems: 30, cursor: null } });
  const requirements = useQuery(api.requirements.list, { locationId, paginationOpts: { numItems: 50, cursor: null } });
  const applications = useQuery(api.applications.list, { locationId, paginationOpts: { numItems: 20, cursor: null } });
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveUpload = useMutation(api.documents.saveUpload);
  const confirmDocument = useMutation(api.documents.confirm);
  const linkDocument = useMutation(api.documents.link);
  const createApplication = useMutation(api.applications.create);
  const saveAnswers = useMutation(api.applications.saveAnswers);
  const updatePreparation = useMutation(api.applications.updatePreparation);
  const setReadinessCheck = useMutation(api.applications.setReadinessCheck);
  const generatePacket = useMutation(api.applications.generatePacket);
  const recordSubmission = useMutation(api.applications.recordSubmission);
  const [selectedApplicationId, setSelectedApplicationId] = useState<Id<'applications'> | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<Id<'requirements'> | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [classification, setClassification] = useState<Record<string, string>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [answers, setAnswerValues] = useState<Partial<{ legal_name: string; contact_name: string; business_address: string }>>({});
  const [submission, setSubmission] = useState({ date: new Date().toISOString().slice(0, 10), reference: '' });

  const confirmedRequirements = useMemo(
    () => requirements?.page.filter((requirement) => requirement.confirmedAt && !['proposed', 'conflicted', 'not_applicable'].includes(requirement.status)) ?? [],
    [requirements],
  );
  const activeApplicationId = selectedApplicationId ?? applications?.page[0]?._id ?? null;
  const activeRequirementId = selectedRequirementId || confirmedRequirements[0]?._id || '';
  const workspace = useQuery(api.applications.getWorkspace, activeApplicationId ? { applicationId: activeApplicationId } : 'skip');
  const latestPacket = workspace?.packets[0];
  const packetDownloads = useQuery(api.applications.getPacketDownloads, latestPacket ? { packetId: latestPacket._id } : 'skip');
  const answerByKey = new Map(workspace?.answers.map((answer) => [answer.key, answer.value]) ?? []);

  function clearMessages() {
    setError(null);
    setNotice(null);
  }

  async function uploadEvidence(event: FormSubmitEvent) {
    event.preventDefault();
    if (!file) return;
    setPending('upload');
    clearMessages();
    try {
      const uploadUrl = await generateUploadUrl({ locationId });
      const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!response.ok) throw new Error('The file upload did not complete.');
      const result = (await response.json()) as { storageId?: Id<'_storage'> };
      if (!result.storageId) throw new Error('Convex did not return a storage reference.');
      const saved = await saveUpload({ locationId, storageId: result.storageId, fileName: file.name });
      setFile(null);
      const input = document.querySelector<HTMLInputElement>('#evidence-file');
      if (input) input.value = '';
      setNotice(saved.status === 'processing' ? 'Uploaded. RibbonDesk is checking the actual file type and active content.' : saved.reason ?? 'The file was rejected.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function confirm(record: DocumentRecord) {
    setPending(`${record._id}:confirm`);
    clearMessages();
    try {
      const expiryDate = expiryDates[record._id];
      await confirmDocument({
        documentId: record._id,
        classification: classification[record._id] ?? defaultClassification(record.fileName),
        expiresAt: expiryDate ? new Date(`${expiryDate}T12:00:00`).getTime() : undefined,
      });
      setNotice('Document type confirmed. It can now be linked as evidence or an attachment.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function link(record: DocumentRecord, target: 'requirement' | 'application') {
    setPending(`${record._id}:link`);
    clearMessages();
    try {
      if (target === 'application' && activeApplicationId) {
        await linkDocument({ documentId: record._id, applicationId: activeApplicationId, linkType: 'attachment' });
      } else if (activeRequirementId) {
        await linkDocument({ documentId: record._id, requirementId: activeRequirementId, linkType: 'evidence' });
      } else {
        throw new Error('Choose a confirmed requirement or application first.');
      }
      setNotice(target === 'application' ? 'Document linked to the selected application.' : 'Document linked to the confirmed requirement.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function addApplication() {
    if (!activeRequirementId) return;
    setPending('create-application');
    clearMessages();
    try {
      const applicationId = await createApplication({ requirementId: activeRequirementId });
      setSelectedApplicationId(applicationId);
      setPortalUrl(null);
      setAnswerValues({});
      setNotice('Application workspace created from the confirmed requirement.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function saveApplicationAnswers(event: FormSubmitEvent) {
    event.preventDefault();
    if (!activeApplicationId) return;
    setPending('answers');
    clearMessages();
    try {
      await saveAnswers({
        applicationId: activeApplicationId,
        answers: [
          { key: 'legal_name', label: 'Legal business name', value: answers.legal_name ?? answerByKey.get('legal_name') ?? '', reusable: true },
          { key: 'contact_name', label: 'Primary contact', value: answers.contact_name ?? answerByKey.get('contact_name') ?? '', reusable: true },
          { key: 'business_address', label: 'Business address', value: answers.business_address ?? answerByKey.get('business_address') ?? '', reusable: true },
        ],
      });
      setNotice('Reusable business answers saved.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function saveChecklist(checks: Application['readinessChecks'], questions = workspace?.application.unresolvedQuestions ?? []) {
    if (!workspace) return;
    setPending('checklist');
    clearMessages();
    try {
      const status = await updatePreparation({
        applicationId: workspace.application._id,
        officialPortalUrl: portalUrl ?? workspace.application.officialPortalUrl,
        requiredAttachments: workspace.application.requiredAttachments,
        unresolvedQuestions: questions,
        readinessChecks: checks,
      });
      setNotice(status === 'ready' ? 'Application preparation is ready for final external submission.' : 'Preparation checklist saved.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function toggleCheck(key: string, complete: boolean) {
    if (!workspace) return;
    setPending(`check:${key}`);
    clearMessages();
    try {
      const status = await setReadinessCheck({
        applicationId: workspace.application._id,
        key,
        complete,
        officialPortalUrl: portalUrl ?? workspace.application.officialPortalUrl,
      });
      setNotice(status === 'ready' ? 'Application preparation is ready for final external submission.' : 'Readiness check saved.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function requestPacket() {
    if (!activeApplicationId) return;
    setPending('packet');
    clearMessages();
    try {
      await generatePacket({ applicationId: activeApplicationId });
      setNotice('Generating a versioned PDF summary and ZIP attachment bundle in Convex storage.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function submitRecord(event: FormSubmitEvent) {
    event.preventDefault();
    if (!activeApplicationId) return;
    setPending('submission');
    clearMessages();
    try {
      await recordSubmission({
        applicationId: activeApplicationId,
        submittedAt: new Date(`${submission.date}T12:00:00`).getTime(),
        referenceNumber: submission.reference,
      });
      setNotice('External submission recorded. RibbonDesk did not file it; the reference is now part of the case record.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <section data-testid="evidence-applications" className="mt-7 rounded-[1.5rem] border bg-background" aria-labelledby="evidence-applications-title">
      <div className="flex flex-col justify-between gap-4 border-b px-5 py-6 sm:flex-row sm:items-start sm:px-6">
        <div><Badge className="bg-[var(--sage-soft)] text-[var(--sage)]"><ShieldCheck />Evidence & applications</Badge><h2 id="evidence-applications-title" className="mt-4 font-heading text-2xl font-semibold">Build the file once. Keep the proof attached.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Upload safe evidence, reuse business answers, prepare versioned packets, and record what you file externally.</p></div>
        <Badge variant="outline" className="w-fit"><Archive />Convex file storage</Badge>
      </div>
      {error ? <p role="alert" className="mx-5 mt-5 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)] sm:mx-6">{error}</p> : null}
      {notice ? <output className="mx-5 mt-5 block rounded-xl bg-[var(--sage-soft)] px-3 py-2 text-sm text-[var(--sage)] sm:mx-6">{notice}</output> : null}
      <div className="grid xl:grid-cols-[0.78fr_1.32fr]">
        <div className="border-b p-5 sm:p-6 xl:border-r xl:border-b-0">
          <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">Evidence locker</p>
          <form onSubmit={uploadEvidence} className="mt-4 rounded-2xl border border-dashed bg-[var(--paper-strong)] p-4">
            <Label htmlFor="evidence-file">PDF, DOCX, TXT, PNG, or JPEG · 10 MB max</Label>
            <Input id="evidence-file" type="file" className="mt-3" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
            <Button type="submit" size="sm" className="mt-3" disabled={!file || pending === 'upload'}>{pending === 'upload' ? <LoaderCircle className="animate-spin" /> : <Upload />}Upload & check</Button>
          </form>
          <div className="mt-4 grid gap-3">
            {documents?.page.length ? documents.page.map((record) => {
              const isPending = pending?.startsWith(record._id);
              return <article key={record._id} className="rounded-xl border p-3"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"><FileText className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{record.fileName}</p><p className="mt-1 text-xs text-muted-foreground">{(record.sizeBytes / 1024).toFixed(1)} KB · {record.status.replaceAll('_', ' ')}</p></div><Badge variant="outline">{record.classification ?? 'unclassified'}</Badge></div>
                {record.rejectionReason ? <p className="mt-3 rounded-lg bg-[var(--danger-soft)] p-2 text-xs text-[var(--danger)]">{record.rejectionReason}</p> : null}
                {record.status === 'processing' ? <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-3 animate-spin" />Inspecting actual file content…</p> : null}
                {record.status === 'needs_review' ? <div className="mt-3 grid gap-2"><Input aria-label={`Document type for ${record.fileName}`} value={classification[record._id] ?? defaultClassification(record.fileName)} onChange={(event) => setClassification((current) => ({ ...current, [record._id]: event.target.value }))} /><div className="flex flex-col gap-2 sm:flex-row"><Input type="date" aria-label={`Expiry date for ${record.fileName}`} value={expiryDates[record._id] ?? ''} onChange={(event) => setExpiryDates((current) => ({ ...current, [record._id]: event.target.value }))} /><Button size="sm" onClick={() => confirm(record)} disabled={isPending}><Check />Confirm type</Button></div><p className="text-[11px] text-muted-foreground">Expiry is optional. Add it for licenses, insurance, and certificates so renewals can be scheduled.</p></div> : null}
                {record.status === 'ready' && record.expiresAt ? <p className="mt-3 text-xs font-medium text-[var(--amber)]">Expires {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(record.expiresAt)}</p> : null}
                {record.status === 'ready' ? <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => link(record, 'requirement')} disabled={!activeRequirementId || isPending}><Link2 />Link evidence</Button><Button size="sm" variant="outline" onClick={() => link(record, 'application')} disabled={!activeApplicationId || isPending}><Paperclip />Attach to app</Button></div> : null}
              </article>;
            }) : <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">No evidence uploaded yet.</p>}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">Application preparation</p><h3 className="mt-2 font-semibold">Prepared here. Filed by you.</h3></div><div className="flex flex-wrap gap-2"><select aria-label="Confirmed requirement" className="h-9 max-w-64 rounded-lg border bg-background px-3 text-sm" value={activeRequirementId} onChange={(event) => setSelectedRequirementId(event.target.value as Id<'requirements'>)}>{confirmedRequirements.map((requirement) => <option key={requirement._id} value={requirement._id}>{requirement.title}</option>)}</select><Button size="sm" variant="outline" onClick={addApplication} disabled={!activeRequirementId || pending === 'create-application'}><FileCheck2 />Create application</Button></div></div>
          {applications?.page.length ? <div className="mt-4 flex flex-wrap gap-2">{applications.page.map((application) => <button key={application._id} onClick={() => { setSelectedApplicationId(application._id); setPortalUrl(null); setAnswerValues({}); }} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${activeApplicationId === application._id ? 'border-[var(--ribbon)] bg-[var(--ribbon-soft)] text-[var(--ribbon)]' : 'hover:bg-muted'}`}>{application.name}</button>)}</div> : null}

          {workspace ? <div className="mt-5 grid gap-5">
            <div className="rounded-2xl border bg-[var(--paper-strong)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{workspace.application.name}</p><p className="mt-1 text-xs text-muted-foreground">{workspace.application.agency}</p></div><Badge className={workspace.application.status === 'ready' ? 'bg-[var(--sage-soft)] text-[var(--sage)]' : 'bg-[var(--amber-soft)] text-[var(--amber)]'}>{workspace.application.status.replaceAll('_', ' ')}</Badge></div><a href={workspace.requirement.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ribbon)] hover:underline">Review cited official source <ExternalLink className="size-3" /></a></div>

            <form onSubmit={saveApplicationAnswers} className="grid gap-3 rounded-2xl border p-4"><p className="text-sm font-semibold">Reusable business answers</p><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="legal-name">Legal business name</Label><Input id="legal-name" value={answers.legal_name ?? answerByKey.get('legal_name') ?? ''} onChange={(event) => setAnswerValues((current) => ({ ...current, legal_name: event.target.value }))} /></div><div className="grid gap-1.5"><Label htmlFor="contact-name">Primary contact</Label><Input id="contact-name" value={answers.contact_name ?? answerByKey.get('contact_name') ?? ''} onChange={(event) => setAnswerValues((current) => ({ ...current, contact_name: event.target.value }))} /></div></div><div className="grid gap-1.5"><Label htmlFor="business-address">Business address</Label><Input id="business-address" value={answers.business_address ?? answerByKey.get('business_address') ?? ''} onChange={(event) => setAnswerValues((current) => ({ ...current, business_address: event.target.value }))} /></div><Button type="submit" size="sm" variant="outline" className="w-fit" disabled={pending === 'answers'}><Check />Save answers</Button></form>

            <div className="rounded-2xl border p-4"><div className="grid gap-1.5"><Label htmlFor="portal-url">Official portal link</Label><Input id="portal-url" type="url" placeholder="https://…" value={portalUrl ?? workspace.application.officialPortalUrl ?? ''} onChange={(event) => setPortalUrl(event.target.value)} /></div><div className="mt-4 grid gap-2">{workspace.application.readinessChecks.map((check) => <label key={check.key} className="flex items-center gap-3 rounded-lg bg-[var(--paper-strong)] p-3 text-sm"><Checkbox checked={check.complete} onCheckedChange={(checked) => void toggleCheck(check.key, checked === true)} disabled={pending === `check:${check.key}`} />{check.label}</label>)}</div>{workspace.application.unresolvedQuestions.length ? <div className="mt-4 rounded-xl bg-[var(--amber-soft)] p-3"><p className="text-xs font-semibold text-[var(--amber)]">Unresolved before filing</p>{workspace.application.unresolvedQuestions.map((question) => <p key={question} className="mt-1 text-xs leading-5">{question}</p>)}<Button size="sm" variant="outline" className="mt-3" onClick={() => saveChecklist(workspace.application.readinessChecks, [])} disabled={pending === 'checklist'}><CheckCircle2 />Mark reviewed & resolved</Button></div> : null}</div>

            <div className="rounded-2xl border bg-[var(--ink)] p-4 text-white"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><Badge className="bg-white/10 text-white"><PackageCheck />Versioned packet</Badge><p className="mt-3 font-semibold">PDF summary + ZIP attachments</p><p className="mt-1 text-xs leading-5 text-white/60">Every export is labeled prepared, not filed.</p></div><Button size="sm" onClick={requestPacket} disabled={pending === 'packet' || latestPacket?.status === 'generating'} className="bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]">{latestPacket?.status === 'generating' ? <LoaderCircle className="animate-spin" /> : <PackageCheck />}{latestPacket?.status === 'generating' ? 'Generating…' : 'Generate packet'}</Button></div>{latestPacket ? <div className="mt-4 flex flex-wrap items-center gap-2"><Badge className="bg-white/10 text-white">v{latestPacket.version} · {latestPacket.status}</Badge>{packetDownloads?.pdfUrl ? <a href={packetDownloads.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 px-3 text-xs font-semibold hover:bg-white/10"><Download className="size-3.5" />PDF</a> : null}{packetDownloads?.zipUrl ? <a href={packetDownloads.zipUrl} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 px-3 text-xs font-semibold hover:bg-white/10"><Download className="size-3.5" />ZIP</a> : null}{latestPacket.errorMessage ? <span className="text-xs text-red-200">{latestPacket.errorMessage}</span> : null}</div> : null}</div>

            <form onSubmit={submitRecord} className="grid gap-3 rounded-2xl border p-4"><div><p className="text-sm font-semibold">Record an external submission</p><p className="mt-1 text-xs text-muted-foreground">RibbonDesk records your receipt; it does not submit to the portal.</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="submission-date">Submission date</Label><Input id="submission-date" type="date" value={submission.date} onChange={(event) => setSubmission((current) => ({ ...current, date: event.target.value }))} required /></div><div className="grid gap-1.5"><Label htmlFor="submission-reference">Receipt/reference number</Label><Input id="submission-reference" value={submission.reference} onChange={(event) => setSubmission((current) => ({ ...current, reference: event.target.value }))} required /></div></div><Button type="submit" size="sm" variant="outline" className="w-fit" disabled={pending === 'submission'}><Send />Record submission</Button></form>
          </div> : <div className="mt-5 rounded-2xl border border-dashed bg-[var(--paper-strong)] p-8 text-center"><FileCheck2 className="mx-auto size-7 text-[var(--ribbon)]" /><p className="mt-3 text-sm font-semibold">Choose a confirmed requirement</p><p className="mt-1 text-xs text-muted-foreground">Create an application workspace to collect answers, evidence, and packet versions.</p></div>}
        </div>
      </div>
    </section>
  );
}
