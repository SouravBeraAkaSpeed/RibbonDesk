import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return <LegalPage eyebrow="Beta terms" title="Use RibbonDesk responsibly" updated="September 1, 2026" sections={[
    { title: 'The service', paragraphs: ['RibbonDesk is a beta information-organizing and compliance-operations tool. It helps prepare and track work, but it does not file government applications, guarantee approval, or replace instructions from the responsible authority.'] },
    { title: 'Your responsibility', paragraphs: ['You are responsible for protecting your account, passkeys, email access, and recovery links, and for reviewing requirements, citations, deadlines, prepared packets, recipient details, and outgoing messages before approval. Do not upload content you lack permission to use or attempt to access another organization.'] },
    { title: 'Acceptable use', paragraphs: ['Do not use RibbonDesk to send spam, misrepresent your identity, interfere with the service, introduce malicious files or instructions, or make automated decisions that require professional judgment. Beta quotas may limit research, AI operations, email, locations, and storage.'] },
    { title: 'Availability and change', paragraphs: ['This hackathon beta may change, pause, or end. Features that involve external agencies and providers can be delayed or unavailable. Important compliance work should always retain an independent record and fallback.'] },
  ]} />;
}
