import { createOpenAI } from '@ai-sdk/openai';

import { env } from '../_generated/server';

export const COMPLEX_MODEL =
  env.OPENAI_MODEL_COMPLEX ?? 'gpt-5.6-terra';
export const FAST_MODEL =
  env.OPENAI_MODEL_FAST ?? 'gpt-5.6-luna';

export function hasAiProvider() {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY?.trim() || 'not-configured',
});

export function requireAiProvider() {
  if (!hasAiProvider()) {
    throw new Error(
      'OpenAI is not configured for live AI features. Set OPENAI_API_KEY on the Convex deployment.',
    );
  }
}

export function openAiProviderOptions(options: {
  reasoningEffort: 'none' | 'minimal' | 'low' | 'medium' | 'high';
  safetyIdentifier?: string;
}) {
  return {
    openai: {
      reasoningEffort: options.reasoningEffort,
      safetyIdentifier: options.safetyIdentifier,
      store: false,
    },
  };
}

export function complexModel(_options?: { structured?: boolean }) {
  return openai.responses(COMPLEX_MODEL);
}

export function fastModel(_options?: { structured?: boolean }) {
  return openai.responses(FAST_MODEL);
}
