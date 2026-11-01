'use client';

import { usePathname } from 'next/navigation';

// Renders the global chrome (navbar/footer/assistant) everywhere EXCEPT the
// standalone embeddable widget route.
export default function ChromeOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed')) return null;
  return <>{children}</>;
}
