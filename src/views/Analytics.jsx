'use client';

import dynamic from 'next/dynamic';
import { PageSkeleton } from '../components/common/PageSkeleton';

const AnalyticsDashboard = dynamic(() => import('./AnalyticsDashboard'), {
  ssr: false,
  loading: () => <PageSkeleton variant="analytics" />,
});

export default function Analytics() {
  return <AnalyticsDashboard />;
}
