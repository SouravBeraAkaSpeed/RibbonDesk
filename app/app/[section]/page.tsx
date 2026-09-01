import type { Metadata } from 'next';

import { AuthWorkspace } from '../auth-workspace';

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'Run opening and ongoing business-readiness work in RibbonDesk.',
};

export default function WorkspaceSectionPage() {
  return <AuthWorkspace />;
}
