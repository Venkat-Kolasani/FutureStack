import type { Metadata } from 'next';
import View from '@/views/InterviewPrepDetail';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Interview prep');

export default function Page() {
  return <View />;
}
