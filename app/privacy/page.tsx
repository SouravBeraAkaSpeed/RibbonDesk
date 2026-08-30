import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return <LegalPage eyebrow="Trust & safety" title="Privacy, in plain language" updated="August 31, 2026" sections={[
    { title: 'What RibbonDesk handles', paragraphs: ['A real workspace may store account details, business and location profiles, compliance records, documents, tasks, and case-inbox correspondence that you choose to provide. The public demo uses synthetic data and is isolated from live provider integrations.'] },
    { title: 'Why the data is used', paragraphs: ['RibbonDesk uses workspace data to organize requirements, prepare application materials, surface deadlines, coordinate a team, and generate reviewable AI proposals. Compliance-impacting proposals do not become confirmed records without human approval.'] },
    { title: 'Control and retention', paragraphs: ['Organization owners can request an export or deletion. Production deletion is designed to remove app records, stored files, inbox mappings, and scheduled work in bounded, auditable batches. Beta retention details will be finalized before accepting real customer data.'] },
    { title: 'Service providers', paragraphs: ['Convex provides the backend and realtime data layer. OpenAI, Firecrawl, AgentMail, and ChatGPT Sites support specific product workflows. Secrets stay in server environments and are never placed in the public client or build log.'] },
  ]} />;
}
