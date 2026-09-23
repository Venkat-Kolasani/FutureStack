import type { Metadata } from 'next';
import View from '@/views/HackathonList';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Hackathons');

export default function Page() {
  return <View />;
}
