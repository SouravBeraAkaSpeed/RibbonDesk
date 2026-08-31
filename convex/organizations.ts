import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import {
  recordActivity,
  requireIdentity,
  requireMembership,
} from './lib/permissions';
import { roleValidator } from './lib/validators';
import schema from './schema';

function organizationSlug(name: string) {
  const base = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '-')
    .slice(0, 42);
  return base || 'workspace';
}

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

async function tokenHash(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export const create = mutation({
  args: { name: v.string(), displayName: v.optional(v.string()) },
  returns: v.id('organizations'),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new ConvexError({
        code: 'INVALID_NAME',
        message: 'Organization names must be 2–80 characters.',
      });
    }

    const now = Date.now();
    const slugBase = organizationSlug(name);
    let slug = slugBase;
    for (let suffix = 2; suffix <= 20; suffix += 1) {
      const existing = await ctx.db
        .query('organizations')
        .withIndex('by_slug', (query) => query.eq('slug', slug))
        .unique();
      if (!existing) break;
      slug = `${slugBase}-${suffix}`;
    }
    const collision = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (query) => query.eq('slug', slug))
      .unique();
    if (collision) {
      throw new ConvexError({
        code: 'SLUG_UNAVAILABLE',
        message: 'Please choose a more distinctive organization name.',
      });
    }

    const organizationId = await ctx.db.insert('organizations', {
      name,
      slug,
      createdBy: identity.tokenIdentifier,
      storedBytes: 0,
      deletionStatus: 'active',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('memberships', {
      organizationId,
      userTokenIdentifier: identity.tokenIdentifier,
      role: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_tokenIdentifier', (query) =>
        query.eq('tokenIdentifier', identity.tokenIdentifier),
      )
      .unique();
    if (!profile) {
      await ctx.db.insert('profiles', {
        tokenIdentifier: identity.tokenIdentifier,
        normalizedEmail: identity.email?.trim().toLowerCase(),
        displayName: args.displayName?.trim() || identity.name,
        createdAt: now,
        updatedAt: now,
      });
    }
    await recordActivity(ctx, {
      organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'organization.created',
      entityType: 'organization',
      entityId: organizationId,
      after: { name, slug },
    });
    return organizationId;
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      membership: schema.doc('memberships'),
      organization: v.union(schema.doc('organizations'), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const page = await ctx.db
      .query('memberships')
      .withIndex('by_userTokenIdentifier', (query) =>
        query.eq('userTokenIdentifier', identity.tokenIdentifier),
      )
      .order('desc')
      .paginate(args.paginationOpts);
    const enriched = await Promise.all(
      page.page.map(async (membership) => ({
        membership,
        organization: await ctx.db.get(membership.organizationId),
      })),
    );
    return {
      ...page,
      page: enriched.map((item) => ({
        ...item,
        organization:
          item.organization?.deletionStatus === 'active'
            ? item.organization
            : null,
      })),
    };
  },
});

export const get = query({
  args: { organizationId: v.id('organizations') },
  returns: v.object({
    organization: schema.doc('organizations'),
    role: roleValidator,
  }),
  handler: async (ctx, args) => {
    const { membership } = await requireMembership(ctx, args.organizationId);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization || organization.deletionStatus !== 'active') {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Organization not found.',
      });
    }
    return { organization, role: membership.role };
  },
});

export const listMembers = query({
  args: {
    organizationId: v.id('organizations'),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(
    v.object({
      membership: schema.doc('memberships'),
      profile: v.union(schema.doc('profiles'), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const page = await ctx.db
      .query('memberships')
      .withIndex('by_organizationId', (query) =>
        query.eq('organizationId', args.organizationId),
      )
      .order('asc')
      .paginate(args.paginationOpts);
    const members = await Promise.all(
      page.page.map(async (membership) => ({
        membership,
        profile: await ctx.db
          .query('profiles')
          .withIndex('by_tokenIdentifier', (query) =>
            query.eq('tokenIdentifier', membership.userTokenIdentifier),
          )
          .unique(),
      })),
    );
    return { ...page, page: members };
  },
});

export const listInvitations = query({
  args: {
    organizationId: v.id('organizations'),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(
    v.object({
      _id: v.id('invitations'),
      normalizedEmail: v.string(),
      role: roleValidator,
      status: v.union(
        v.literal('pending'),
        v.literal('accepted'),
        v.literal('revoked'),
        v.literal('expired'),
      ),
      expiresAt: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, 'admin');
    const page = await ctx.db
      .query('invitations')
      .withIndex('by_organizationId_and_status', (index) =>
        index.eq('organizationId', args.organizationId).eq('status', 'pending'),
      )
      .order('desc')
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((invitation) => ({
        _id: invitation._id,
        normalizedEmail: invitation.normalizedEmail,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt,
      })),
    };
  },
});

export const createInvitation = mutation({
  args: {
    organizationId: v.id('organizations'),
    email: v.string(),
    role: v.union(
      v.literal('admin'),
      v.literal('contributor'),
      v.literal('viewer'),
    ),
    token: v.string(),
  },
  returns: v.object({
    invitationId: v.id('invitations'),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const { identity, membership } = await requireMembership(
      ctx,
      args.organizationId,
      'admin',
    );
    if (membership.role !== 'owner' && args.role === 'admin')
      throw new ConvexError({
        code: 'OWNER_REQUIRED',
        message: 'Only the owner can invite another admin.',
      });
    const email = normalizedEmail(args.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw new ConvexError({
        code: 'INVALID_EMAIL',
        message: 'Enter a valid work email.',
      });
    if (!/^[A-Za-z0-9_-]{40,120}$/.test(args.token))
      throw new ConvexError({
        code: 'INVALID_TOKEN',
        message: 'The invitation token is invalid.',
      });
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_normalizedEmail', (index) =>
        index.eq('normalizedEmail', email),
      )
      .unique();
    if (profile) {
      const existingMembership = await ctx.db
        .query('memberships')
        .withIndex('by_organizationId_and_userTokenIdentifier', (index) =>
          index
            .eq('organizationId', args.organizationId)
            .eq('userTokenIdentifier', profile.tokenIdentifier),
        )
        .unique();
      if (existingMembership?.status === 'active')
        throw new ConvexError({
          code: 'ALREADY_MEMBER',
          message: 'This person is already an active member.',
        });
    }
    const existingInvitations = await ctx.db
      .query('invitations')
      .withIndex('by_normalizedEmail_and_status', (index) =>
        index.eq('normalizedEmail', email).eq('status', 'pending'),
      )
      .take(100);
    if (
      existingInvitations.some(
        (invitation) =>
          invitation.organizationId === args.organizationId &&
          invitation.expiresAt > Date.now(),
      )
    ) {
      throw new ConvexError({
        code: 'INVITATION_EXISTS',
        message: 'A current invitation already exists for this email.',
      });
    }
    const hash = await tokenHash(args.token);
    if (
      await ctx.db
        .query('invitations')
        .withIndex('by_tokenHash', (index) => index.eq('tokenHash', hash))
        .unique()
    )
      throw new ConvexError({
        code: 'TOKEN_COLLISION',
        message: 'Create a new invitation link and try again.',
      });
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1_000;
    const invitationId = await ctx.db.insert('invitations', {
      organizationId: args.organizationId,
      normalizedEmail: email,
      tokenHash: hash,
      role: args.role,
      status: 'pending',
      invitedBy: identity.tokenIdentifier,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      organizationId: args.organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'invitation.created',
      entityType: 'invitation',
      entityId: invitationId,
      after: { role: args.role, expiresAt },
    });
    return { invitationId, expiresAt };
  },
});

export const revokeInvitation = mutation({
  args: { invitationId: v.id('invitations') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation)
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Invitation not found.',
      });
    const { identity } = await requireMembership(
      ctx,
      invitation.organizationId,
      'admin',
    );
    if (invitation.status !== 'pending')
      throw new ConvexError({
        code: 'ALREADY_DECIDED',
        message: 'This invitation is no longer pending.',
      });
    const now = Date.now();
    await ctx.db.patch(invitation._id, { status: 'revoked', updatedAt: now });
    await recordActivity(ctx, {
      organizationId: invitation.organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'invitation.revoked',
      entityType: 'invitation',
      entityId: invitation._id,
      before: { status: invitation.status },
      after: { status: 'revoked' },
    });
    return null;
  },
});

export const acceptInvitation = mutation({
  args: { token: v.string() },
  returns: v.id('organizations'),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const email = identity.email ? normalizedEmail(identity.email) : '';
    if (!email)
      throw new ConvexError({
        code: 'EMAIL_REQUIRED',
        message:
          'Your passkey account needs an email to accept this invitation.',
      });
    const hash = await tokenHash(args.token);
    const invitation = await ctx.db
      .query('invitations')
      .withIndex('by_tokenHash', (index) => index.eq('tokenHash', hash))
      .unique();
    if (!invitation || invitation.status !== 'pending')
      throw new ConvexError({
        code: 'INVITATION_INVALID',
        message: 'This invitation is invalid or has already been used.',
      });
    if (invitation.expiresAt <= Date.now()) {
      await ctx.db.patch(invitation._id, {
        status: 'expired',
        updatedAt: Date.now(),
      });
      throw new ConvexError({
        code: 'INVITATION_EXPIRED',
        message: 'This invitation has expired. Ask an admin for a new link.',
      });
    }
    if (invitation.normalizedEmail !== email)
      throw new ConvexError({
        code: 'EMAIL_MISMATCH',
        message:
          'Sign in with the email address that received this invitation.',
      });
    const organization = await ctx.db.get(invitation.organizationId);
    if (!organization || organization.deletionStatus !== 'active')
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'The invited workspace is unavailable.',
      });
    const existing = await ctx.db
      .query('memberships')
      .withIndex('by_organizationId_and_userTokenIdentifier', (index) =>
        index
          .eq('organizationId', invitation.organizationId)
          .eq('userTokenIdentifier', identity.tokenIdentifier),
      )
      .unique();
    const now = Date.now();
    let membershipId = existing?._id;
    if (existing)
      await ctx.db.patch(existing._id, {
        status: 'active',
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        updatedAt: now,
      });
    else
      membershipId = await ctx.db.insert('memberships', {
        organizationId: invitation.organizationId,
        userTokenIdentifier: identity.tokenIdentifier,
        role: invitation.role,
        status: 'active',
        invitedBy: invitation.invitedBy,
        createdAt: now,
        updatedAt: now,
      });
    await ctx.db.patch(invitation._id, {
      status: 'accepted',
      acceptedBy: identity.tokenIdentifier,
      updatedAt: now,
    });
    const profileRecord = await ctx.db
      .query('profiles')
      .withIndex('by_tokenIdentifier', (index) =>
        index.eq('tokenIdentifier', identity.tokenIdentifier),
      )
      .unique();
    if (profileRecord)
      await ctx.db.patch(profileRecord._id, {
        normalizedEmail: email,
        displayName: profileRecord.displayName ?? identity.name,
        updatedAt: now,
      });
    else
      await ctx.db.insert('profiles', {
        tokenIdentifier: identity.tokenIdentifier,
        normalizedEmail: email,
        displayName: identity.name,
        createdAt: now,
        updatedAt: now,
      });
    await recordActivity(ctx, {
      organizationId: invitation.organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'invitation.accepted',
      entityType: 'membership',
      entityId: membershipId!,
      before: { invitationStatus: invitation.status },
      after: { invitationStatus: 'accepted', role: invitation.role },
    });
    return invitation.organizationId;
  },
});

export const changeRole = mutation({
  args: {
    organizationId: v.id('organizations'),
    membershipId: v.id('memberships'),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { identity } = await requireMembership(
      ctx,
      args.organizationId,
      'owner',
    );
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Member not found.',
      });
    }
    if (membership.role === 'owner' || args.role === 'owner') {
      throw new ConvexError({
        code: 'OWNER_TRANSFER_REQUIRED',
        message: 'Ownership changes require the dedicated transfer flow.',
      });
    }
    await ctx.db.patch(args.membershipId, {
      role: args.role,
      updatedAt: Date.now(),
    });
    await recordActivity(ctx, {
      organizationId: args.organizationId,
      actorSubject: identity.tokenIdentifier,
      action: 'membership.role_changed',
      entityType: 'membership',
      entityId: args.membershipId,
      before: { role: membership.role },
      after: { role: args.role },
    });
    return null;
  },
});
