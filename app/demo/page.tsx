import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Start your workspace',
  description: 'Create a real RibbonDesk workspace for your own business.',
};

export default function DemoPage() {
  redirect('/app');
}
