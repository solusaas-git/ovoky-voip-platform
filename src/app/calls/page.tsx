'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { ActiveCalls } from '@/components/calls/ActiveCalls';

export default function CallsPage() {
  return (
    <MainLayout>
      <PageLayout
        title="Active Calls"
        description="Monitor live calls in real-time with automatic refresh every 5 seconds"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Active Calls' }
        ]}
      >
        <ActiveCalls />
      </PageLayout>
    </MainLayout>
  );
} 