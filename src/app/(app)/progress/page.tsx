import type { Metadata } from 'next';
import View from '@/views/Progress';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Progress');

export default function Page() {
  return <View />;
}
