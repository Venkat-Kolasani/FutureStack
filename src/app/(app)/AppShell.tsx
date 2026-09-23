'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/common/Navbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const hideNavbar = pathname.startsWith('/hackathons/invites/');

  return (
    <div className="min-h-screen font-sans transition-colors duration-300">
      {hideNavbar ? null : <Navbar />}
      <main id="main-content" role="main">
        {children}
      </main>
    </div>
  );
}
