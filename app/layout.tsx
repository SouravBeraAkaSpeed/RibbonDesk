import type { Metadata } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';

import { ConvexClientProvider } from '@/components/convex-client-provider';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'RibbonDesk — Open right. Stay ready.',
    template: '%s · RibbonDesk',
  },
  description:
    'One live desk for permits, applications, inspections, agency email, evidence, and renewals.',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'RibbonDesk — Open right. Stay ready.',
    description: 'From red tape to ribbon cutting—and every renewal after.',
    type: 'website',
    images: [
      {
        url: '/og-playful.png',
        width: 1672,
        height: 941,
        alt: 'RibbonDesk — Open right. Stay ready.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RibbonDesk — Open right. Stay ready.',
    description: 'From red tape to ribbon cutting—and every renewal after.',
    images: ['/og-playful.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} depth-ui antialiased`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
