import type { Metadata } from 'next';
import View from '@/views/StatusBoard';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Status board');

export default function Page() {
  return <View />;
}
