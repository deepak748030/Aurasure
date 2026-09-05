'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/EmptyState';
import { Field, Input, SearchInput, Select, Textarea } from '@/components/ui/Input';
import { Badge, ModuleBadge } from '@/components/ui/Badge';
import { useBroadcastMutation, useNotifications } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import type { NotificationRow } from '@/lib/types';

const TONE_TONE = { primary: 'brand', success: 'success', warning: 'warning', danger: 'danger', muted: 'neutral' } as const;

const columns: Column<NotificationRow>[] = [
  {
    key: 'title',
    label: 'Message',
    primary: true,
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-ink-900">{row.title}</p>
        <p className="truncate text-[12px] text-ink-400">{row.body}</p>
      </div>
    ),
    value: (row) => row.title,
  },
  {
    key: 'audience',
    label: 'Audience',
    render: (row) =>
      row.broadcast ? (
        row.module === 'all' ? (
          <Badge tone="brand">Everyone</Badge>
        ) : (
          <ModuleBadge module={row.module} />
        )
      ) : (
        <span className="text-[12.5px] text-ink-500 tabular">{row.userId || '—'}</span>
      ),
    value: (row) => (row.broadcast ? row.module : (row.userId ?? '')),
  },
  {
    key: 'tone',
    label: 'Tone',
    hideOnMobile: true,
    render: (row) => <Badge tone={TONE_TONE[row.tone] ?? 'neutral'}>{row.tone}</Badge>,
    value: (row) => row.tone,
  },
  {
    key: 'kind',
    label: 'Tab',
    hideOnMobile: true,
    render: (row) => <span className="text-[12.5px] text-ink-500 capitalize">{row.kind}</span>,
    value: (row) => row.kind,
  },
  {
    key: 'createdAt',
    label: 'Sent',
    hideOnMobile: true,
    render: (row) => (
      <span className="text-[12.5px] text-ink-500 tabular">
        {new Date(row.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    ),
    value: (row) => row.createdAt,
  },
];

export default function NotificationsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [audience, setAudience] = useState('');
  const [composing, setComposing] = useState(false);
  const [deleting, setDeleting] = useState<NotificationRow | null>(null);
  const [form, setForm] = useState({ title: '', body: '', module: 'all', tone: 'primary', icon: 'megaphone' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useNotifications({
    q: debounced || undefined,
    broadcast: audience || undefined,
    page,
    limit: 20,
  });
  const { broadcast, remove } = useBroadcastMutation();

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('A title and a message are both required.');
      return;
    }
    try {
      await broadcast.mutateAsync({ ...form, title: form.title.trim(), body: form.body.trim() });
      logActivity({ actor: user?.name ?? 'admin', action: 'Sent broadcast', target: form.title.trim() });
      toast.success('Broadcast sent to the customer app.');
      setComposing(false);
      setForm({ title: '', body: '', module: 'all', tone: 'primary', icon: 'megaphone' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the broadcast.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      logActivity({ actor: user?.name ?? 'admin', action: 'Deleted notification', target: deleting.title });
      toast.success('Notification deleted.');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete it.');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle="Broadcasts land in every customer's inbox; direct messages come from support replies."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setComposing(true)}>
            New broadcast
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:p-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search messages…"
            className="flex-1"
          />
          <Select
            aria-label="Audience"
            value={audience}
            onChange={(event) => {
              setAudience(event.target.value);
              setPage(1);
            }}
            className="sm:w-52"
          >
            <option value="">All messages</option>
            <option value="true">Broadcasts</option>
            <option value="false">Direct</option>
          </Select>
        </div>

        <div className="border-t border-[var(--color-line)]">
          {isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.rows ?? []}
              rowKey={(row) => row.id}
              loading={isLoading}
              refreshing={isFetching && !isLoading}
              emptyTitle="No notifications yet"
              emptyMessage="Broadcasts you send appear here and in the app inbox."
              emptyAction={
                <Button icon={<Megaphone size={16} />} onClick={() => setComposing(true)}>
                  New broadcast
                </Button>
              }
              actions={(row) => (
                <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => setDeleting(row)}>
                  Delete
                </Button>
              )}
            />
          )}
        </div>

        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>

      <Modal
        open={composing}
        onClose={() => setComposing(false)}
        title="New broadcast"
        subtitle="Sent immediately to every signed-in customer."
        footer={
          <>
            <Button variant="secondary" onClick={() => setComposing(false)}>
              Cancel
            </Button>
            <Button icon={<Megaphone size={16} />} onClick={() => void send()} loading={broadcast.isPending}>
              Send broadcast
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Title" required>
            <Input
              value={form.title}
              maxLength={120}
              placeholder="Weekend sale is live"
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </Field>
          <Field label="Message" required>
            <Textarea
              value={form.body}
              rows={3}
              maxLength={400}
              placeholder="Flat ₹100 OFF above ₹399, this weekend only."
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Audience">
              <Select value={form.module} onChange={(event) => setForm((prev) => ({ ...prev, module: event.target.value }))}>
                <option value="all">Everyone</option>
                <option value="food">Food</option>
                <option value="shop">Shop</option>
              </Select>
            </Field>
            <Field label="Tone">
              <Select value={form.tone} onChange={(event) => setForm((prev) => ({ ...prev, tone: event.target.value }))}>
                <option value="primary">Primary</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
                <option value="muted">Muted</option>
              </Select>
            </Field>
            <Field label="Icon">
              <Input
                value={form.icon}
                maxLength={40}
                placeholder="megaphone"
                onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this notification?"
        message={deleting ? `“${deleting.title}” will disappear from every inbox.` : ''}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
