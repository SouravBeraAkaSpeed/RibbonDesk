import { passkey } from '@better-auth/passkey';
import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex, crossDomain } from '@convex-dev/better-auth/plugins';
import { requireActionCtx } from '@convex-dev/better-auth/utils';
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal';
import { v } from 'convex/values';

import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { env, internalAction, query } from './_generated/server';
import authConfig from './auth.config';
import authSchema from './betterAuth/schema';

const siteUrl = env.SITE_URL ?? 'http://localhost:3000';
const authBaseUrl = env.CONVEX_SITE_URL;

async function queueSecurityEmail(
  ctx: GenericCtx<DataModel>,
  args: {
    to: string;
    subject: string;
    text: string;
    kind: 'verification' | 'password_reset';
  },
) {
  await requireActionCtx(ctx).runMutation(internal.authEmail.queue, {
    recipient: args.to,
    subject: args.subject,
    text: args.text,
    kind: args.kind,
  });
}

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: { schema: authSchema },
});

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    appName: 'RibbonDesk',
    baseURL: authBaseUrl,
    trustedOrigins: [siteUrl, 'https://appleid.apple.com'],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 3_600,
      sendResetPassword: async ({ user, url }) => {
        await queueSecurityEmail(ctx, {
          to: user.email,
          subject: 'Reset your RibbonDesk password',
          text: `A password reset was requested for your RibbonDesk account.\n\nReset it within one hour:\n${url}\n\nIf you did not request this, you can ignore this message.`,
          kind: 'password_reset',
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: true,
      expiresIn: 3_600,
      sendVerificationEmail: async ({ user, url }) => {
        await queueSecurityEmail(ctx, {
          to: user.email,
          subject: 'Verify your RibbonDesk email',
          text: `Welcome to RibbonDesk.\n\nConfirm this email address within one hour:\n${url}\n\nIf you did not create this account, you can ignore this message.`,
          kind: 'verification',
        });
      },
    },
    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID.trim(),
              clientSecret: env.GOOGLE_CLIENT_SECRET.trim(),
            },
          }
        : {}),
      ...(env.APPLE_CLIENT_ID?.trim() && env.APPLE_CLIENT_SECRET?.trim()
        ? {
            apple: {
              clientId: env.APPLE_CLIENT_ID.trim(),
              clientSecret: env.APPLE_CLIENT_SECRET.trim(),
            },
          }
        : {}),
    },
    plugins: [
      passkey({
        rpName: 'RibbonDesk',
        rpID: new URL(siteUrl).hostname,
        origin: siteUrl,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'required',
        },
        registration: {
          requireSession: true,
        },
      }),
      crossDomain({ siteUrl }),
      convex({ authConfig }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));

export const getAuthCapabilities = query({
  args: {},
  returns: v.object({
    emailAndPassword: v.boolean(),
    emailVerification: v.boolean(),
    passkey: v.boolean(),
    google: v.boolean(),
    apple: v.boolean(),
  }),
  handler: async () => ({
    emailAndPassword: true,
    emailVerification: Boolean(env.AUTH_EMAIL_INBOX_ID?.trim()),
    passkey: true,
    google: Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()),
    apple: Boolean(env.APPLE_CLIENT_ID?.trim() && env.APPLE_CLIENT_SECRET?.trim()),
  }),
});

export const rotateKeys = internalAction({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      publicKey: v.string(),
      privateKey: v.string(),
      createdAt: v.number(),
      expiresAt: v.optional(v.nullable(v.number())),
      alg: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => await createAuth(ctx).api.rotateKeys(),
});

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      name: v.string(),
      email: v.string(),
      emailVerified: v.boolean(),
      image: v.optional(v.nullable(v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});
