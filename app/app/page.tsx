import type { Metadata } from 'next';

import { AuthWorkspace } from './auth-workspace';

export const metadata: Metadata = {
  title: 'Your desk',
  description: 'Create or unlock a secure RibbonDesk workspace with a passkey.',
};

export default function AppEntryPage() {
  return <AuthWorkspace />;
}
