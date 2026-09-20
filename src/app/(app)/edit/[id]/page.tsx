import type { Metadata } from 'next';
import View from '@/views/EditOpportunity';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Edit opportunity');

export default function Page() {
  return <View />;
}
