'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareText, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/EmptyState';
import { Field, SearchInput, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { useTicketMutation, useTickets } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import type { SupportTicket, TicketStatus } from '@/lib/types';

const STATUS_TONE = { open: 'danger', in_progress: 'warning', resolved: 'success' } as const;
const STATUS_LABEL: Record<TicketStatus, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };

const columns: Column<SupportTicket>[] = [
  {
    key: 'message',
    label: 'Message',
    primary: true,
    render: (row) => (
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13.5px] text-ink-900">{row.message}</p>
        <p className="mt-0.5 truncate text-[12px] text-ink-400">
          {row.name || 'Customer'} · {row.phone || 'no phone'}
          {row.orderCode ? ` · ${row.orderCode}` : ''}
        </p>
      </div>
    ),
    value: (row) => row.message,
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <Badge tone={STATUS_TONE[row.status]} dot={row.status !== 'resolved'}>
        {STATUS_LABEL[row.status]}
      </Badge>
    ),
    value: (row) => row.status,
  },
  {
    key: 'response',
    label: 'Reply',
    hideOnMobile: true,
    render: (row) =>
      row.response ? (
        <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-500">
          <CheckCircle2 size={13} className="text-[var(--color-success)]" /> Sent
        </span>
      ) : (
        <span className="text-ink-300">—</span>
      ),
    value: (row) => (row.response ? 'sent' : ''),
  },
  {
    key: 'createdAt',
    label: 'Received',
    hideOnMobile: true,
    render: (row) => (
      <span className="text-[12.5px] text-ink-500 tabular">
        {new Date(row.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    ),
    value: (row) => row.createdAt,
  },
];

export default function SupportPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useTickets({
    status: status || undefined,
    q: debounced || undefined,
    page,
    limit: 20,
  });
  const { update } = useTicketMutation();

  const openTicket = (ticket: SupportTicket) => {
    setSelected(ticket);
    setReply(ticket.response || '');
  };

  const save = async (next: { status?: TicketStatus; response?: string; resolve?: boolean }) => {
    if (!selected) return;
    const body: Record<string, unknown> = {};
    if (next.status) body.status = next.status;
    if (next.response !== undefined) body.response = next.response;
    if (next.resolve) body.status = 'resolved';
    try {
      await update.mutateAsync({ id: selected.id, body });
      logActivity({ actor: user?.name ?? 'admin', action: 'Replied to ticket', target: `${selected.id} → ${String(body.status ?? selected.status)}` });
      toast.success(next.response !== undefined ? 'Reply sent — the customer is notified in-app.' : 'Ticket updated.');
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the ticket.');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Support inbox"
        subtitle="“Write to us” messages from the app Help centre. Replies notify the customer."
      />

      <Tabs
        items={[
          { key: '', label: 'All' },
          { key: 'open', label: 'Open' },
          { key: 'in_progress', label: 'In progress' },
          { key: 'resolved', label: 'Resolved' },
        ]}
        active={status}
        onChange={(key) => {
          setStatus(key);
          setPage(1);
        }}
      />

      <Card padded={false}>
        <div className="p-4 sm:p-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search messages, phones, order codes…" />
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
              emptyTitle="Inbox zero"
              emptyMessage="No tickets match. New “write to us” messages land here."
              onRowClick={openTicket}
              actions={(row) => (
                <Button size="sm" variant="ghost" icon={<MessageSquareText size={15} />} onClick={() => openTicket(row)}>
                  {row.response ? 'View' : 'Reply'}
                </Button>
              )}
            />
          )}
        </div>

        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Ticket ${selected.id}` : 'Ticket'}
        subtitle={
          selected
            ? `${selected.name || 'Customer'} · ${selected.phone || 'no phone'} · ${new Date(selected.createdAt).toLocaleString('en-IN')}`
            : undefined
        }
        width="lg"
        footer={
          <>
            <Select
              aria-label="Status"
              value={selected?.status ?? 'open'}
              onChange={(event) => selected && void save({ status: event.target.value as TicketStatus })}
              className="sm:w-44"
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </Select>
            <span className="flex-1" />
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button
              icon={<CheckCircle2 size={16} />}
              onClick={() => void save({ response: reply.trim(), resolve: true })}
              loading={update.isPending}
              disabled={!reply.trim()}
            >
              Reply & resolve
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="grid gap-4">
            <div className="rounded-lg bg-ink-50 p-3.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-400">
                <UserRound size={13} /> Customer wrote
                {selected.orderCode ? ` · order ${selected.orderCode}` : ''}
              </p>
              <p className="text-[13.5px] leading-relaxed text-ink-800">{selected.message}</p>
            </div>
            {selected.response && selected.response === reply ? (
              <p className="text-[12.5px] text-ink-400">Current reply is shown below — editing it sends a new notification.</p>
            ) : null}
            <Field label="Your reply" hint="Sending notifies the customer in-app under Notifications → Support.">
              <Textarea
                value={reply}
                rows={4}
                maxLength={1000}
                placeholder="Hi! We checked with the store…"
                onChange={(event) => setReply(event.target.value)}
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
