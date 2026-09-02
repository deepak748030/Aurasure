'use client';

import { useMemo, useState } from 'react';
import { Gift, Search, Ticket } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, SearchInput, Select } from '@/components/ui/Input';
import type { Column } from '@/components/ui/DataTable';
import { useCustomers, request } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { logActivity } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { money, dateOnly } from '@/lib/format';
import type { CatalogRecord } from '@/lib/types';

/* ------------------------------ helpers -------------------------------- */

function discountLabel(row: CatalogRecord): string {
  const value = Number(row.offValue ?? 0);
  if (row.offType === 'percent') {
    const cap = Number(row.maxDiscount ?? 0);
    return `${value}% off${cap > 0 ? ` up to ${money(cap)}` : ''}`;
  }
  return `${money(value)} off`;
}

type PromoState = { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' };

function promoState(row: CatalogRecord): PromoState {
  const now = Date.now();
  const starts = row.startsAt ? new Date(String(row.startsAt)).getTime() : null;
  const expires = row.expiresAt ? new Date(String(row.expiresAt)).getTime() : null;
  const limit = Number(row.usageLimit ?? 0);
  const issued = Number(row.issuedCount ?? 0);

  if (!row.active) return { label: 'Paused', tone: 'neutral' };
  if (expires && expires < now) return { label: 'Expired', tone: 'danger' };
  if (starts && starts > now) return { label: 'Scheduled', tone: 'warning' };
  if (limit > 0 && issued >= limit) return { label: 'Exhausted', tone: 'warning' };
  return { label: 'Live', tone: 'success' };
}

/* ------------------------------- columns -------------------------------- */

const columns: Column<CatalogRecord>[] = [
  {
    key: 'code',
    label: 'Promo code',
    primary: true,
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Ticket size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-mono text-[13px] font-semibold tracking-wide text-ink-900">
            {String(row.code ?? '')}
          </p>
          <p className="truncate text-[12px] text-ink-400">{String(row.title ?? row.id)}</p>
        </div>
      </div>
    ),
    value: (row) => String(row.code ?? ''),
  },
  {
    key: 'offValue',
    label: 'Discount',
    render: (row) => <span className="text-[13px] font-medium text-ink-800">{discountLabel(row)}</span>,
    value: (row) => discountLabel(row),
  },
  {
    key: 'minOrder',
    label: 'Min order',
    align: 'right',
    hideOnMobile: true,
    render: (row) => <span className="tabular">{Number(row.minOrder ?? 0) > 0 ? money(Number(row.minOrder)) : '—'}</span>,
    value: (row) => String(row.minOrder ?? 0),
  },
  {
    key: 'module',
    label: 'Applies to',
    hideOnMobile: true,
    render: (row) => (
      <Badge tone={row.module === 'food' ? 'food' : row.module === 'shop' ? 'info' : 'neutral'}>
        {row.module === 'all' ? 'Both apps' : String(row.module ?? 'all')}
      </Badge>
    ),
    value: (row) => String(row.module ?? 'all'),
  },
  {
    key: 'expiresAt',
    label: 'Validity',
    hideOnMobile: true,
    render: (row) => (
      <span className="text-[12.5px] text-ink-500">
        {row.startsAt ? dateOnly(String(row.startsAt)) : 'Now'} → {row.expiresAt ? dateOnly(String(row.expiresAt)) : 'No end'}
      </span>
    ),
    value: (row) => String(row.expiresAt ?? ''),
  },
  {
    key: 'issuedCount',
    label: 'Issued',
    align: 'right',
    render: (row) => (
      <span className="tabular text-[13px] text-ink-700">
        {Number(row.issuedCount ?? 0)}
        {Number(row.usageLimit ?? 0) > 0 ? ` / ${Number(row.usageLimit)}` : ''}
      </span>
    ),
    value: (row) => String(row.issuedCount ?? 0),
  },
  {
    key: 'active',
    label: 'Status',
    render: (row) => {
      const state = promoState(row);
      return <Badge tone={state.tone}>{state.label}</Badge>;
    },
    value: (row) => promoState(row).label,
  },
];

/* -------------------------------- fields -------------------------------- */

const fields: FieldDef[] = [
  { name: 'code', label: 'Promo code', type: 'text', required: true, placeholder: 'WELCOME50', hint: 'Customers type this at checkout — saved in capitals.' },
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: '₹50 off your first order' },
  { name: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'On orders above ₹199' },
  {
    name: 'module',
    label: 'Applies to',
    type: 'select',
    defaultValue: 'all',
    options: [
      { value: 'all', label: 'Both apps' },
      { value: 'food', label: 'Food only' },
      { value: 'shop', label: 'Shop only' },
    ],
  },
  {
    name: 'offType',
    label: 'Discount type',
    type: 'select',
    defaultValue: 'flat',
    options: [
      { value: 'flat', label: 'Flat ₹ off' },
      { value: 'percent', label: '% off' },
    ],
  },
  { name: 'offValue', label: 'Discount value', type: 'number', required: true, placeholder: '50', hint: 'Rupees for flat, percentage for %.' },
  { name: 'maxDiscount', label: 'Max discount (₹)', type: 'number', hint: 'Cap for % codes. 0 = no cap.' },
  { name: 'minOrder', label: 'Minimum order (₹)', type: 'number', hint: '0 = no minimum.' },
  { name: 'startsAt', label: 'Starts on', type: 'date', hint: 'Empty = live immediately.' },
  { name: 'expiresAt', label: 'Expires on', type: 'date', hint: 'Empty = never expires.' },
  { name: 'usageLimit', label: 'Total usage limit', type: 'number', hint: '0 = unlimited.' },
  { name: 'perUserLimit', label: 'Per customer limit', type: 'number', defaultValue: 1 },
  { name: 'description', label: 'Terms / description', type: 'textarea', placeholder: 'Valid once per customer. Cannot be clubbed with other offers.' },
  { name: 'selfClaim', label: 'Customers can claim it themselves', type: 'toggle', defaultValue: true, hint: 'Off = only handed out from this panel.' },
  { name: 'active', label: 'Active', type: 'toggle', defaultValue: true },
];

/* --------------------------------- page --------------------------------- */

export default function PromoCodesPage() {
  const toast = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [issuing, setIssuing] = useState<CatalogRecord | null>(null);
  const [target, setTarget] = useState<'all' | 'selected'>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const customers = useCustomers({ q: customerSearch || undefined, limit: 50, page: 1 });

  const issue = useMutation({
    mutationFn: (body: { target: string; userIds?: string[] }) =>
      request<{ issued: number; skipped: number; message: string }>(`/admin/promos/${issuing?.id}/issue`, {
        method: 'POST',
        body,
      }),
    onSuccess: (result) => {
      toast.success(result.message);
      logActivity({
        actor: user?.name ?? 'admin',
        action: 'Issued promo code',
        target: `${String(issuing?.code ?? '')} → ${result.issued} customers`,
      });
      void qc.invalidateQueries({ queryKey: ['resource', 'promos'] });
      void qc.invalidateQueries({ queryKey: ['customers'] });
      closeIssue();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeIssue = () => {
    setIssuing(null);
    setTarget('all');
    setPicked([]);
    setCustomerSearch('');
  };

  const rows = customers.data?.customers ?? [];
  const canSubmit = target === 'all' || picked.length > 0;
  const summary = useMemo(
    () => (target === 'all' ? 'every customer account' : `${picked.length} selected customer${picked.length === 1 ? '' : 's'}`),
    [target, picked.length],
  );

  return (
    <>
      <ResourcePage<CatalogRecord>
        title="Promo codes"
        subtitle="Create discount campaigns and drop them straight into customer wallets."
        path="promos"
        responseKey="promos"
        singular="Promo code"
        columns={columns}
        fields={fields}
        searchPlaceholder="Search by code or title…"
        filters={[
          {
            key: 'status',
            label: 'All statuses',
            options: [
              { value: 'live', label: 'Live' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'expired', label: 'Expired' },
            ],
          },
          {
            key: 'module',
            label: 'All modules',
            options: [
              { value: 'all', label: 'Both apps' },
              { value: 'food', label: 'Food' },
              { value: 'shop', label: 'Shop' },
            ],
          },
          {
            key: 'offType',
            label: 'Any discount',
            options: [
              { value: 'flat', label: 'Flat ₹' },
              { value: 'percent', label: 'Percentage' },
            ],
          },
        ]}
        rowActions={(row) => (
          <Button size="sm" variant="ghost" icon={<Gift size={15} />} onClick={() => setIssuing(row)}>
            Issue
          </Button>
        )}
      />

      <Modal
        open={Boolean(issuing)}
        onClose={closeIssue}
        width="lg"
        title={`Issue ${String(issuing?.code ?? '')}`}
        subtitle="A copy lands in each customer's coupon wallet — they can spend it at checkout."
        footer={
          <>
            <Button variant="secondary" onClick={closeIssue}>
              Cancel
            </Button>
            <Button
              onClick={() => issue.mutate(target === 'all' ? { target: 'all' } : { target: 'selected', userIds: picked })}
              loading={issue.isPending}
              disabled={!canSubmit}
            >
              Issue to {summary}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Who gets it">
            <Select value={target} onChange={(event) => setTarget(event.target.value as 'all' | 'selected')}>
              <option value="all">All customers</option>
              <option value="selected">Pick customers</option>
            </Select>
          </Field>

          {target === 'selected' ? (
            <div className="space-y-2">
              <SearchInput value={customerSearch} onChange={setCustomerSearch} placeholder="Search name, phone or email…" />
              <div className="scroll-thin max-h-64 divide-y divide-[var(--color-line)] overflow-y-auto rounded-xl ring-1 ring-[var(--color-line)]">
                {customers.isLoading ? (
                  <div className="space-y-2 p-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-9 rounded-lg" />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <p className="flex items-center gap-2 p-4 text-[13px] text-ink-400">
                    <Search size={15} /> No customers match that search.
                  </p>
                ) : (
                  rows.map((row) => {
                    const checked = picked.includes(row.id);
                    return (
                      <label
                        key={row.id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-ink-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setPicked((prev) => (checked ? prev.filter((id) => id !== row.id) : [...prev, row.id]))
                          }
                          className="h-4 w-4 accent-[var(--color-brand-600)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink-900">{row.name}</span>
                          <span className="block truncate text-[12px] text-ink-400">{row.phone}</span>
                        </span>
                        {row.role === 'admin' ? <Badge tone="warning">Admin</Badge> : null}
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[12px] text-ink-400">
                Showing the first 50 matches — search to narrow it down. {picked.length} selected.
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-ink-50 px-3 py-2.5 text-[12.5px] text-ink-500">
              Every customer account receives one copy. Anyone who already holds this code (up to its per-customer
              limit) is skipped, so you can safely run this again after new sign-ups.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
