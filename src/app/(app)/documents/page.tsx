import type { Metadata } from 'next';
import View from '@/views/Documents';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Documents');

export default function Page() {
  return <View />;
}
