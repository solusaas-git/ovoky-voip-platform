'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { RatesTabs } from '@/components/rates/RatesTabs';

export default function RatesPage() {
  return (
    <MainLayout>
      <PageLayout
        title="Rates Management"
        description="View and manage your account's rates for calls, numbers, and SMS services"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Rates' }
        ]}
      >
        <RatesTabs />
      </PageLayout>
    </MainLayout>
  );
} 