import type { Metadata } from 'next';
import View from '@/views/Calendar';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Calendar');

export default function Page() {
  return <View />;
}
