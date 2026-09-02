'use client';

import { Database, Server, User as UserIcon, LogOut, Activity, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader, StatCard } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { useStats, useSystemInfo } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { initials, num } from '@/lib/format';

function uptime(seconds?: number): string {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const system = useSystemInfo();
  const stats = useStats(0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="Your admin session and the health of the connected Aurasure API."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} className={system.isFetching ? 'spin' : undefined} />}
            onClick={() => {
              void system.refetch();
              void stats.refetch();
            }}
          >
            Re-check
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Signed in as" />
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-base font-semibold text-white">
              {user ? initials(user.name) : <UserIcon size={20} />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink-900">{user?.name}</p>
              <p className="truncate text-[13px] text-ink-500">{user?.phone}</p>
              <Badge tone="brand" className="mt-1.5">
                Administrator
              </Badge>
            </div>
          </div>
          <Button variant="secondary" icon={<LogOut size={16} />} className="mt-5 w-full justify-center" onClick={logout}>
            Sign out
          </Button>
        </Card>

        {system.isLoading ? (
          <CardSkeleton lines={6} className="lg:col-span-2" />
        ) : system.isError ? (
          <Card padded={false} className="lg:col-span-2">
            <ErrorState message={(system.error as Error).message} onRetry={() => system.refetch()} />
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader
              title="API connection"
              subtitle="Requests are proxied by Next.js to the Node.js server, so the browser never talks to it directly."
              action={
                <Badge tone={system.data?.database.state === 'connected' ? 'success' : 'danger'} dot>
                  {system.data?.database.state === 'connected' ? 'Healthy' : 'Database offline'}
                </Badge>
              }
            />
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                { icon: Server, label: 'Service', value: `${system.data?.service} v${system.data?.version}` },
                { icon: Activity, label: 'Environment', value: system.data?.env },
                { icon: Server, label: 'Node runtime', value: system.data?.node },
                { icon: Activity, label: 'Uptime', value: uptime(system.data?.uptimeSeconds) },
                { icon: Database, label: 'Database', value: system.data?.database.name ?? '—' },
                { icon: Database, label: 'Host', value: system.data?.database.host ?? '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2.5">
                  <row.icon size={16} className="shrink-0 text-ink-400" />
                  <div className="min-w-0">
                    <dt className="text-[11.5px] tracking-wide text-ink-400 uppercase">{row.label}</dt>
                    <dd className="truncate text-[13.5px] font-medium text-ink-800">{String(row.value ?? '—')}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Users" value={num(stats.data?.users)} tone="brand" />
        <StatCard label="Orders" value={num(stats.data?.orders)} tone="info" />
        <StatCard label="Food items" value={num(stats.data?.foodItems)} tone="food" />
        <StatCard label="Shop products" value={num(stats.data?.products)} tone="neutral" />
      </div>

      <Card>
        <CardHeader title="How this panel is wired" />
        <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-ink-600">
          <li>
            • The browser calls <span className="font-mono text-[12.5px] text-ink-800">/api/backend/…</span>, which Next.js
            rewrites to <span className="font-mono text-[12.5px] text-ink-800">$ADMIN_API_URL/api/v1/…</span>.
          </li>
          <li>
            • Authentication uses the same JWT as the mobile app; only accounts with the{' '}
            <span className="font-medium text-ink-800">admin</span> role can sign in here.
          </li>
          <li>
            • Catalogue screens read and write the exact collections the Expo app consumes, so a change here is live in the
            app on its next refresh.
          </li>
          <li>
            • Lists refresh on a 30 s stale time; the Live Ops board polls every 15 s while it is open.
          </li>
        </ul>
      </Card>
    </div>
  );
}
