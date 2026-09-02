import type { Metadata } from 'next';

import { AuthWorkspace } from '../../auth-workspace';

export const metadata: Metadata = {
  title: 'Workspace tools',
  description: 'Open RibbonDesk messages, files, team, and settings.',
};

export default function WorkspaceToolPage() {
  return <AuthWorkspace />;
}
