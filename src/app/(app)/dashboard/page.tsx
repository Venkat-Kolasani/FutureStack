import type { Metadata } from 'next';
import View from '@/views/Dashboard';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Dashboard');

export default function Page() {
  return <View />;
}
