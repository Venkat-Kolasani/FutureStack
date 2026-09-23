import type { Metadata } from 'next';
import View from '@/views/HackathonDetail';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Hackathon');

export default function Page() {
  return <View />;
}
