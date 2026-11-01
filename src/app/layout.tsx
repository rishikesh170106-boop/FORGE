import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Assistant from '@/components/Assistant';
import ChromeOnly from '@/components/ChromeOnly';
import PwaRegister from '@/components/PwaRegister';
import OfflineQueue from '@/components/OfflineQueue';
import Toaster from '@/components/Toaster';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'CIVIC SENSE — Smarter communities. Better cities.',
  description:
    'Smarter communities. Better cities. Report, validate, track and resolve local civic issues with autonomous AI triage, live maps, transparent SLA tracking, and civic participation.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'CIVIC SENSE', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#702D3B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <ChromeOnly>
          <Navbar />
        </ChromeOnly>
        <main id="main" className="main-content">{children}</main>
        <ChromeOnly>
          <Footer />
          <Assistant />
          <OfflineQueue />
        </ChromeOnly>
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
