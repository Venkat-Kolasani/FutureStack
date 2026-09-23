import type { Metadata } from 'next';
import View from '@/views/PublicSharePage';
import { noIndexMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = noIndexMetadata('Shared progress');

export default function Page() {
  return <View />;
}
