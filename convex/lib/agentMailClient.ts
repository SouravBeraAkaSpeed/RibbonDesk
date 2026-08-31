import { toSendPayload, type ReplyArgs, type SendArgs } from '@agentmail/convex';

import { env } from '../_generated/server';

const DEFAULT_BASE_URL = 'https://api.agentmail.to/v0';
const ERROR_BODY_LIMIT = 1_000;

type RequestOptions = {
  method: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export class AgentMailRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly safeDetail: string,
  ) {
    super(`AgentMail request failed (${status}): ${safeDetail}`);
    this.name = 'AgentMailRequestError';
  }
}

function requireApiKey() {
  const apiKey = env.AGENTMAIL_API_KEY?.trim();
  if (!apiKey) throw new Error('AGENTMAIL_API_KEY is not configured on this Convex deployment.');
  return apiKey;
}

function safeErrorBody(value: string) {
  return value
    .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, ERROR_BODY_LIMIT);
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const baseUrl = (env.AGENTMAIL_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${requireApiKey()}` };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, { method: options.method, headers, body });
  if (!response.ok) {
    const detail = safeErrorBody(await response.text());
    throw new AgentMailRequestError(response.status, detail || response.statusText);
  }
  if (response.status === 204) return null as T;
  const responseBody = await response.text();
  if (!responseBody.trim()) return null as T;
  try {
    return JSON.parse(responseBody) as T;
  } catch {
    throw new AgentMailRequestError(response.status, 'AgentMail returned an invalid JSON response.');
  }
}

export async function listAgentMailInboxes(limit = 1) {
  return await request<unknown>('/inboxes', { method: 'GET', query: { limit } });
}

export async function createAgentMailInbox(args: {
  username: string;
  displayName: string;
  clientId: string;
}) {
  const created = await request<unknown>('/inboxes', {
    method: 'POST',
    body: {
      username: args.username,
      display_name: args.displayName,
      client_id: args.clientId,
    },
  });
  const listing = await request<{ inboxes?: Array<Record<string, unknown>> }>('/inboxes', {
    method: 'GET',
    query: { limit: 100 },
  });
  return listing.inboxes?.find((inbox) => inbox.client_id === args.clientId) ?? created;
}

export async function deleteAgentMailInbox(inboxId: string) {
  try {
    await request<null>(`/inboxes/${encodeURIComponent(inboxId)}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof AgentMailRequestError && error.status === 404) {
      const listing = await request<{ inboxes?: Array<Record<string, unknown>> } | null>('/inboxes', {
        method: 'GET',
        query: { limit: 100 },
      });
      if (!listing?.inboxes) {
        throw new AgentMailRequestError(409, 'Inbox deletion could not yet be verified; deletion will retry.');
      }
      const stillExists = listing.inboxes?.some((inbox) =>
        [inbox.inbox_id, inbox.inboxId, inbox.email, inbox.id].includes(inboxId),
      );
      if (!stillExists) return;
      throw new AgentMailRequestError(409, 'The inbox is still propagating; deletion will retry.');
    }
    throw error;
  }
}

export async function sendAgentMailMessage(
  inboxId: string,
  args: SendArgs | ReplyArgs,
  replyToMessageId?: string,
) {
  const encodedInbox = encodeURIComponent(inboxId);
  const path = replyToMessageId
    ? `/inboxes/${encodedInbox}/messages/${encodeURIComponent(replyToMessageId)}/reply`
    : `/inboxes/${encodedInbox}/messages/send`;
  return await request<{ message_id: string; thread_id: string }>(path, {
    method: 'POST',
    body: toSendPayload(args),
  });
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const combined = (first << 16) | (second << 8) | third;
    output += alphabet[(combined >> 18) & 63];
    output += alphabet[(combined >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? alphabet[combined & 63] : '=';
  }
  return output;
}
