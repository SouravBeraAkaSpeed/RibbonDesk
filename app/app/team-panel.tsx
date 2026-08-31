'use client';

import {
  Copy,
  Link2,
  LoaderCircle,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Role = 'owner' | 'admin' | 'contributor' | 'viewer';
type FormSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>;

function messageFrom(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The action could not be completed.';
}

function createToken() {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function TeamPanel({
  organizationId,
  role,
}: {
  organizationId: Id<'organizations'>;
  role: Role;
}) {
  const members = useQuery(api.organizations.listMembers, {
    organizationId,
    paginationOpts: { numItems: 50, cursor: null },
  });
  const invitations = useQuery(
    api.organizations.listInvitations,
    role === 'owner' || role === 'admin'
      ? { organizationId, paginationOpts: { numItems: 30, cursor: null } }
      : 'skip',
  );
  const createInvitation = useMutation(api.organizations.createInvitation);
  const revokeInvitation = useMutation(api.organizations.revokeInvitation);
  const changeRole = useMutation(api.organizations.changeRole);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<
    'admin' | 'contributor' | 'viewer'
  >('contributor');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: 'error' | 'success';
    text: string;
  } | null>(null);
  const canInvite = role === 'owner' || role === 'admin';

  async function run(
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
    setPending(key);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: success });
    } catch (error) {
      setMessage({ tone: 'error', text: messageFrom(error) });
    } finally {
      setPending(null);
    }
  }

  async function invite(event: FormSubmitEvent) {
    event.preventDefault();
    const token = createToken();
    await run(
      'invite',
      async () => {
        await createInvitation({
          organizationId,
          email,
          role: inviteRole,
          token,
        });
        const url = new URL('/app', window.location.origin);
        url.searchParams.set('invite', token);
        setInviteLink(url.href);
        setEmail('');
      },
      'Invitation created. Copy the private link for the intended teammate.',
    );
  }

  return (
    <section
      id="team"
      data-testid="team-panel"
      className="mt-7 overflow-hidden rounded-[1.5rem] border bg-background"
      aria-labelledby="team-title"
    >
      <div className="flex flex-col justify-between gap-4 border-b px-5 py-6 sm:flex-row sm:items-start sm:px-6">
        <div>
          <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">
            <Users />
            Team access
          </Badge>
          <h2
            id="team-title"
            className="mt-4 font-heading text-2xl font-semibold"
          >
            The right people, with deliberate authority.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invite links expire after seven days and bind to the exact account
            email. Contributors can work; only owners and admins can approve
            consequential changes.
          </p>
        </div>
        <Badge variant="outline">
          {members?.page.length ?? 0} member
          {members?.page.length === 1 ? '' : 's'}
        </Badge>
      </div>
      {message ? (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`mx-5 mt-5 rounded-xl px-3 py-2 text-sm sm:mx-6 ${message.tone === 'error' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[var(--sage-soft)] text-[var(--sage)]'}`}
        >
          {message.text}
        </p>
      ) : null}
      <div className="grid xl:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b p-5 sm:p-6 xl:border-r xl:border-b-0">
          <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
            Members
          </p>
          <div className="mt-4 grid gap-2">
            {members?.page.map(({ membership, profile }) => (
              <article
                key={membership._id}
                className="flex items-center gap-3 rounded-xl border p-3"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--ribbon-soft)] text-sm font-semibold text-[var(--ribbon)]">
                  {(profile?.displayName ?? 'T').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {profile?.displayName || 'Teammate'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {membership.status}
                  </p>
                </div>
                {role === 'owner' && membership.role !== 'owner' ? (
                  <select
                    aria-label={`Role for ${profile?.displayName || 'teammate'}`}
                    className="h-8 rounded-lg border bg-background px-2 text-xs"
                    value={membership.role}
                    onChange={(event) =>
                      void run(
                        `role:${membership._id}`,
                        () =>
                          changeRole({
                            organizationId,
                            membershipId: membership._id,
                            role: event.target.value as
                              | 'admin'
                              | 'contributor'
                              | 'viewer',
                          }),
                        'Member role updated.',
                      )
                    }
                    disabled={pending === `role:${membership._id}`}
                  >
                    <option value="admin">Admin</option>
                    <option value="contributor">Contributor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <Badge variant="outline">{membership.role}</Badge>
                )}
              </article>
            ))}
          </div>
          <div className="mt-4 flex gap-3 rounded-xl bg-[var(--sage-soft)] p-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" />
            Every protected Convex function rechecks membership and role; the
            interface is not the security boundary.
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
            Invitations
          </p>
          {canInvite ? (
            <form
              onSubmit={invite}
              className="mt-4 grid gap-3 rounded-2xl border bg-[var(--paper-strong)] p-4"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="invite-email">Teammate email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@company.com"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invite-role">Starting role</Label>
                <select
                  id="invite-role"
                  className="h-9 rounded-lg border bg-background px-3 text-sm"
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as typeof inviteRole)
                  }
                >
                  <option value="contributor">Contributor</option>
                  <option value="viewer">Viewer</option>
                  {role === 'owner' ? (
                    <option value="admin">Admin</option>
                  ) : null}
                </select>
              </div>
              <Button
                data-testid="create-invite"
                type="submit"
                size="sm"
                className="w-fit"
                disabled={pending === 'invite'}
              >
                {pending === 'invite' ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <UserPlus />
                )}
                Create private invite
              </Button>
            </form>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
              Only an owner or admin can invite teammates.
            </p>
          )}
          {inviteLink ? (
            <div className="mt-3 rounded-xl border border-[var(--sage)]/30 bg-[var(--sage-soft)] p-3">
              <p className="text-xs font-semibold">Private invite link</p>
              <p
                data-testid="invite-link"
                className="mt-1 break-all text-xs text-muted-foreground"
              >
                {inviteLink}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => void navigator.clipboard.writeText(inviteLink)}
              >
                <Copy />
                Copy link
              </Button>
            </div>
          ) : null}
          <div className="mt-4 grid gap-2">
            {invitations?.page.length ? (
              invitations.page.map((invitation) => (
                <article
                  key={invitation._id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <Link2 className="size-4 shrink-0 text-[var(--ribbon)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {invitation.normalizedEmail}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {invitation.role} · expires{' '}
                      {new Intl.DateTimeFormat('en', {
                        dateStyle: 'medium',
                      }).format(invitation.expiresAt)}
                    </p>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Revoke invitation for ${invitation.normalizedEmail}`}
                    onClick={() =>
                      void run(
                        `revoke:${invitation._id}`,
                        () =>
                          revokeInvitation({ invitationId: invitation._id }),
                        'Invitation revoked.',
                      )
                    }
                    disabled={pending === `revoke:${invitation._id}`}
                  >
                    <X />
                  </Button>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
                No pending invitations.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
