import type { Metadata } from 'next';

import { AuthWorkspace } from '../../auth-workspace';

export const metadata: Metadata = {
  title: 'Business opening step',
  description:
    'Complete one evidence-backed business step with a RibbonDesk AI guide.',
};

export default function JourneyStepPage() {
  return <AuthWorkspace />;
}
