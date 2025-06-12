'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { CdrReports } from '@/components/calls/CdrReports';

export default function CdrsPage() {
  return (
    <MainLayout>
      <PageLayout
        title="CDR Reports"
        description="View and analyze call detail records with advanced filtering and export capabilities"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CDR Reports' }
        ]}
      >
        <CdrReports />
      </PageLayout>
    </MainLayout>
  );
} 