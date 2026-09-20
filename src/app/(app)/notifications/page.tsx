import type { Metadata } from 'next';
import View from '@/views/Notifications';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Notifications');

export default function Page() {
  return <View />;
}
