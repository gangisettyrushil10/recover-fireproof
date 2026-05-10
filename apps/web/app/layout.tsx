import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { ServiceWorkerRegister } from '@/components/sw-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fireproof',
  description: 'Fire and life-safety exception operations.',
  applicationName: 'Fireproof',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
