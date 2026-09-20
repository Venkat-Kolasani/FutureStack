import type { Metadata } from 'next';
import View from '@/views/Analytics';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Analytics');

export default function Page() {
  return <View />;
}
