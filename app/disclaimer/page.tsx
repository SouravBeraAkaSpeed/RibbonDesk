import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Disclaimer' };

export default function DisclaimerPage() {
  return <LegalPage eyebrow="Important disclaimer" title="Information organizer, not legal advice" updated="August 31, 2026" sections={[
    { title: 'Verify before acting', paragraphs: ['RibbonDesk summarizes public guidance and information you provide. Requirements can vary by jurisdiction, business activity, site conditions, and agency interpretation. Confirm consequential decisions with current official sources and, where appropriate, a qualified professional.'] },
    { title: 'AI proposes; people decide', paragraphs: ['AI-generated research, extraction, summaries, drafts, and suggested changes may be incomplete or wrong. RibbonDesk shows citations, confidence, conflicts, and unanswered questions so an authorized person can review the underlying evidence before confirming a change.'] },
    { title: 'Prepared, not filed', paragraphs: ['Application packets and attachment bundles are labeled prepared, not filed. RibbonDesk does not autonomously submit to government portals or claim that an agency has received, accepted, or approved an item unless a user records evidence of that outcome.'] },
    { title: 'Deadlines and notices', paragraphs: ['Reminders are a convenience, not a guarantee. Agency notices and official records control. Maintain direct access to your accounts and do not rely on RibbonDesk as the sole copy of time-sensitive or legally significant material.'] },
  ]} />;
}
