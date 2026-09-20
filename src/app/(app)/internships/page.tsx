import type { Metadata } from 'next';
import View from '@/views/InternshipList';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Internships');

export default function Page() {
  return <View />;
}
