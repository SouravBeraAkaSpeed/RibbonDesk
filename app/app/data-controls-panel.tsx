'use client';

import {
  AlertTriangle,
  Download,
  LoaderCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useConvex, useMutation } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Role = 'owner' | 'admin' | 'contributor' | 'viewer';
const exportDomains = [
  'memberships',
  'invitations',
  'businesses',
  'locations',
  'researchRuns',
  'sourceSnapshots',
  'sourceChanges',
  'requirements',
  'requirementEdges',
  'tasks',
  'applications',
  'applicationAnswers',
  'applicationPackets',
  'inspections',
  'renewalCycles',
  'documents',
  'documentLinks',
  'inboxBindings',
  'caseMessages',
  'outboundDrafts',
  'sendApprovals',
  'messageLinks',
  'aiRuns',
  'assistantThreads',
  'proposals',
  'notifications',
  'notificationPreferences',
  'activityEvents',
  'usageMeters',
] as const;

function messageFrom(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The operation could not be completed.';
}

export function DataControlsPanel({
  organizationId,
  organizationName,
  role,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
  role: Role;
}) {
  const convex = useConvex();
  const queueDeletion = useMutation(api.dataControls.queueDeletion);
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState<'export' | 'delete' | null>(null);
  const [message, setMessage] = useState<{
    tone: 'error' | 'success';
    text: string;
  } | null>(null);
  const owner = role === 'owner';

  async function exportWorkspace() {
    setPending('export');
    setMessage(null);
    try {
      const metadata = await convex.query(api.dataControls.exportMetadata, {
        organizationId,
      });
      const exportedAt = Date.now();
      const records: Record<string, unknown[]> = {};
      for (const domain of exportDomains) {
        let cursor: string | null = null;
        let done = false;
        records[domain] = [];
        while (!done) {
          const page: {
            page: unknown[];
            continueCursor: string;
            isDone: boolean;
          } = await convex.query(api.dataControls.exportPage, {
            organizationId,
            domain,
            paginationOpts: { numItems: 100, cursor },
          });
          records[domain].push(...page.page);
          cursor = page.continueCursor;
          done = page.isDone;
        }
      }
      const blob = new Blob(
        [
          JSON.stringify(
            { metadata: { ...metadata, exportedAt }, records },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${metadata.slug}-ribbondesk-export-${new Date(exportedAt).toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage({
        tone: 'success',
        text: 'Workspace export downloaded with all paginated app records and no provider secrets.',
      });
    } catch (error) {
      setMessage({ tone: 'error', text: messageFrom(error) });
    } finally {
      setPending(null);
    }
  }

  async function removeWorkspace() {
    setPending('delete');
    setMessage(null);
    try {
      await queueDeletion({ organizationId, confirmationName: confirmation });
      setMessage({
        tone: 'success',
        text: 'Deletion queued. The live case inbox, app records, stored files, inbox mappings, and Agent threads are being removed safely.',
      });
      window.setTimeout(() => window.location.reload(), 1_200);
    } catch (error) {
      setMessage({ tone: 'error', text: messageFrom(error) });
      setPending(null);
    }
  }

  return (
    <section
      id="data-controls"
      data-testid="data-controls"
      className="mt-7 rounded-[1.5rem] border bg-background p-5 sm:p-6"
      aria-labelledby="data-controls-title"
    >
      <Badge variant="outline">
        <ShieldCheck />
        Data controls
      </Badge>
      <h2
        id="data-controls-title"
        className="mt-4 font-heading text-2xl font-semibold"
      >
        Take the record with you. Remove it when you are done.
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        Exports are assembled through owner-authorized paginated queries.
        Deletion is an irreversible owner-only workflow that clears
        its live case inbox first, then organization-scoped app tables and
        Convex files in bounded batches; scheduled callbacks safely no-op after
        their records disappear.
      </p>
      {message ? (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${message.tone === 'error' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[var(--sage-soft)] text-[var(--sage)]'}`}
        >
          {message.text}
        </p>
      ) : null}
      {owner ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-[var(--paper-strong)] p-4">
            <p className="text-sm font-semibold">Portable JSON export</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Includes workspace records, member profile fields, messages,
              citations, activity, and file metadata. Stored file contents
              remain downloadable from their evidence records.
            </p>
            <Button
              data-testid="export-workspace"
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => void exportWorkspace()}
              disabled={pending !== null}
            >
              {pending === 'export' ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Download />
              )}
              Download export
            </Button>
          </div>
          <div className="rounded-2xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-4">
            <div className="flex items-center gap-2 text-[var(--danger)]">
              <AlertTriangle className="size-4" />
              <p className="text-sm font-semibold">Delete workspace</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              This cannot be undone. Type <strong>{organizationName}</strong>{' '}
              exactly.
            </p>
            <div className="mt-3 grid gap-1.5">
              <Label htmlFor="delete-confirmation">Workspace name</Label>
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="mt-3"
              onClick={() => void removeWorkspace()}
              disabled={pending !== null || confirmation !== organizationName}
            >
              {pending === 'delete' ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              Queue permanent deletion
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
          Only the organization owner can export or permanently delete the
          workspace.
        </p>
      )}
    </section>
  );
}
