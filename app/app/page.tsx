import type { Metadata } from 'next';

import { AuthWorkspace } from './auth-workspace';

export const metadata: Metadata = {
  title: 'Your desk',
  description: 'Create or unlock RibbonDesk with verified email or a passkey.',
};

export default function AppEntryPage() {
  return <AuthWorkspace />;
}
