import type { Metadata } from 'next';

import { AuthWorkspace } from '../auth-workspace';

export const metadata: Metadata = {
  title: 'Your business route',
  description:
    'See the required, optional, and after-opening steps RibbonDesk found for your business.',
};

export default function RoadmapPage() {
  return <AuthWorkspace />;
}
