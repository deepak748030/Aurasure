'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useStats } from '@/lib/queries';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { Skeleton, StatSkeleton } from '@/components/ui/Skeleton';

/** Shell for every authenticated screen: sidebar + topbar + content. */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const enabled = status === 'authenticated';
  const { data: stats } = useStats(enabled ? 60000 : 0);

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen lg:pl-[264px]">
        <div className="fixed inset-y-0 left-0 hidden w-[264px] border-r border-[var(--color-line)] bg-white p-4 lg:block">
          <Skeleton className="h-9 w-32" />
          <div className="mt-6 space-y-2.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div className="h-16 border-b border-[var(--color-line)] bg-white" />
        <main className="p-4 sm:p-6">
          <Skeleton className="h-6 w-48" />
          <div className="mt-5">
            <StatSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:pl-[264px]">
      <Sidebar open={drawer} onClose={() => setDrawer(false)} stats={stats} />
      <Topbar onMenu={() => setDrawer(true)} live={stats?.liveOrders} />
      <main className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6 lg:px-7">{children}</main>
    </div>
  );
}
