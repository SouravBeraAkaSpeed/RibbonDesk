import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { env } from '../_generated/server';

export const COMPLEX_MODEL =
  env.OPENROUTER_MODEL_COMPLEX ?? 'openai/gpt-5.6-terra';
export const FAST_MODEL =
  env.OPENROUTER_MODEL_FAST ?? 'openai/gpt-5.6-luna';

export function hasAiProvider() {
  return Boolean(env.OPENROUTER_API_KEY?.trim());
}

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY?.trim() || 'not-configured',
  compatibility: 'strict',
});

export function requireAiProvider() {
  if (!hasAiProvider()) {
    throw new Error(
      'OpenRouter is not configured for live AI features. Set OPENROUTER_API_KEY on the Convex deployment.',
    );
  }
}

export function complexModel(options?: { structured?: boolean }) {
  return openrouter(COMPLEX_MODEL, {
    plugins: options?.structured ? [{ id: 'response-healing' }] : undefined,
    usage: { include: true },
  });
}

export function fastModel(options?: { structured?: boolean }) {
  return openrouter(FAST_MODEL, {
    plugins: options?.structured ? [{ id: 'response-healing' }] : undefined,
    usage: { include: true },
  });
}
