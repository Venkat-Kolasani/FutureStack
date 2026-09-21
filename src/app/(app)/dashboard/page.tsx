import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Dashboard');

export default function Page() {
  return (
    <div className="min-h-screen bg-white dark:bg-black p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        Workspace routes land in the follow-up App Router PR.
      </p>
    </div>
  );
}
