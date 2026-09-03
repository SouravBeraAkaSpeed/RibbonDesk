import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Trust & safety"
      title="Privacy, in plain language"
      updated="September 1, 2026"
      sections={[
        {
          title: 'What RibbonDesk handles',
          paragraphs: [
            'A workspace may store account details, business and location profiles, business-readiness records, documents, tasks, and case-inbox correspondence that you choose to provide. Authentication may process a verified email address, a password hash, passkey public credentials, sessions, and security-email delivery state. RibbonDesk does not create a sample workspace inside your account.',
          ],
        },
        {
          title: 'Why the data is used',
          paragraphs: [
            'RibbonDesk uses workspace data to research current public sources, build a step-by-step business journey, explain legal and tax topics, prepare materials, surface deadlines, and keep files and messages connected to the right step. Filings, payments, attestations, and external sends always require your deliberate action.',
          ],
        },
        {
          title: 'Control and retention',
          paragraphs: [
            'Workspace records remain available until an organization owner deletes the workspace. Deletion removes the live case inbox first, then app records, stored files, inbox mappings, Agent threads, and scheduled work in bounded batches. Signed provider-webhook receipt identifiers expire after 30 days. External providers may retain data under their own published policies.',
          ],
        },
        {
          title: 'Service providers',
          paragraphs: [
            'Convex provides the backend, authentication storage, and realtime data layer. Better Auth manages authentication logic. OpenAI, Exa, Firecrawl, AgentMail, and ChatGPT Sites support specific product workflows. AgentMail also delivers verification and password-reset messages. OpenAI requests disable response storage and do not include app-identifying metadata. Secrets stay in server environments and are never placed in the public client or build log.',
          ],
        },
      ]}
    />
  );
}
