import type { Metadata } from 'next';
import Navbar from '@/components/common/Navbar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen font-sans transition-colors duration-300">
      <Navbar />
      <main id="main-content" role="main">
        {children}
      </main>
    </div>
  );
}
