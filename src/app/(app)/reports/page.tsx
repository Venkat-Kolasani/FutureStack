import type { Metadata } from 'next';
import View from '@/views/Reports';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Reports');

export default function Page() {
  return <View />;
}
