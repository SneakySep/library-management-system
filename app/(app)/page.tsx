'use client';

import { useAuth } from '@/hooks/useAuth';
import { AdminOverview } from '@/components/dashboard/AdminOverview';
import { MemberDashboard } from '@/components/dashboard/MemberDashboard';
import { PageContainer } from '@/components/layout/PageContainer';

/** Role-aware home: librarians get the admin overview, members get their dashboard. */
export default function HomePage() {
  const { loading, isLibrarian } = useAuth();

  if (loading) {
    return (
      <PageContainer>
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return isLibrarian ? <AdminOverview /> : <MemberDashboard />;
}
