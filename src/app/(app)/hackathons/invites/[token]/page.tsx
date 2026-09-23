import type { Metadata } from 'next';
import View from '@/views/AcceptTeamInvite';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata('Team invite');

export default function Page() {
  return <View />;
}
