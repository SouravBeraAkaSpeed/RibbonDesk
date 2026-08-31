import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return <LegalPage eyebrow="Trust & safety" title="Privacy, in plain language" updated="August 31, 2026" sections={[
    { title: 'What RibbonDesk handles', paragraphs: ['A workspace may store account details, business and location profiles, business-readiness records, documents, tasks, and case-inbox correspondence that you choose to provide. RibbonDesk does not create a sample workspace inside your account.'] },
    { title: 'Why the data is used', paragraphs: ['RibbonDesk uses workspace data to organize requirements, prepare application materials, surface deadlines, coordinate a team, and generate reviewable AI proposals. Compliance-impacting proposals do not become confirmed records without human approval.'] },
    { title: 'Control and retention', paragraphs: ['Workspace records remain available until an organization owner deletes the workspace. Deletion removes the live case inbox first, then app records, stored files, inbox mappings, Agent threads, and scheduled work in bounded batches. Signed provider-webhook receipt identifiers expire after 30 days. External providers may retain data under their own published policies.'] },
    { title: 'Service providers', paragraphs: ['Convex provides the backend and realtime data layer. OpenAI models accessed through OpenRouter, Firecrawl, AgentMail, and ChatGPT Sites support specific product workflows. Secrets stay in server environments and are never placed in the public client or build log.'] },
  ]} />;
}
