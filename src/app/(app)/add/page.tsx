import type { Metadata } from 'next';
import View from '@/views/AddOpportunity';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Add opportunity');

export default function Page() {
  return <View />;
}
