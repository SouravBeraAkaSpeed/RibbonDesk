import { passkey } from '@better-auth/passkey';
import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex, crossDomain } from '@convex-dev/better-auth/plugins';
import { APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal';
import { v } from 'convex/values';

import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { env, internalAction, query } from './_generated/server';
import authConfig from './auth.config';
import authSchema from './betterAuth/schema';

type RegistrationContext = {
  email: string;
  name: string;
};

const siteUrl = env.SITE_URL ?? 'http://localhost:3000';

function parseRegistrationContext(context?: string | null): RegistrationContext {
  if (!context || context.length > 1_000) {
    throw APIError.from('BAD_REQUEST', {
      code: 'REGISTRATION_DETAILS_REQUIRED',
      message: 'Enter your name and email to create a passkey.',
    });
  }

  let input: unknown;
  try {
    input = JSON.parse(context);
  } catch {
    throw APIError.from('BAD_REQUEST', {
      code: 'REGISTRATION_DETAILS_INVALID',
      message: 'The account details could not be read.',
    });
  }

  if (!input || typeof input !== 'object') {
    throw APIError.from('BAD_REQUEST', {
      code: 'REGISTRATION_DETAILS_INCOMPLETE',
      message: 'The account details are incomplete.',
    });
  }

  const record = input as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';

  if (name.length < 2 || name.length > 80) {
    throw APIError.from('BAD_REQUEST', {
      code: 'REGISTRATION_NAME_INVALID',
      message: 'Enter a name between 2 and 80 characters.',
    });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw APIError.from('BAD_REQUEST', {
      code: 'REGISTRATION_EMAIL_INVALID',
      message: 'Enter a valid email address.',
    });
  }

  return { email, name };
}

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: { schema: authSchema },
});

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    appName: 'RibbonDesk',
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: false },
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
          requireSession: false,
          resolveUser: async ({ ctx: endpoint, context }) => {
            const details = parseRegistrationContext(context);
            const existing = await endpoint.context.internalAdapter.findUserByEmail(details.email);

            if (existing?.user) {
              return {
                id: existing.user.id,
                name: existing.user.email,
                displayName: existing.user.name,
              };
            }

            const created = await endpoint.context.internalAdapter.createUser({
              email: details.email,
              emailVerified: false,
              name: details.name,
            });

            return { id: created.id, name: created.email, displayName: created.name };
          },
          afterVerification: async ({ ctx: endpoint, user }) => {
            if (!endpoint.context.session?.user) {
              const createdUser = await endpoint.context.internalAdapter.findUserById(user.id);
              if (!createdUser) {
                throw APIError.from('INTERNAL_SERVER_ERROR', {
                  code: 'ACCOUNT_ACTIVATION_FAILED',
                  message: 'The account could not be activated.',
                });
              }
              const session = await endpoint.context.internalAdapter.createSession(createdUser.id);
              await setSessionCookie(endpoint, { session, user: createdUser });
            }
            return { userId: user.id, name: 'Primary passkey' };
          },
        },
      }),
      crossDomain({ siteUrl }),
      convex({ authConfig }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));

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
