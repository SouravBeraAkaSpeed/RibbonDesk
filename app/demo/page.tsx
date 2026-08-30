import type { Metadata } from 'next';

import { DemoWorkspace } from './workspace';

export const metadata: Metadata = {
  title: 'Interactive demo',
  description:
    'Explore a safe, synthetic RibbonDesk workspace for a New York City café.',
};

export default function DemoPage() {
  return <DemoWorkspace />;
}
