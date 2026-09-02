'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Check, X, Pause, MessageSquareWarning } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea, Field } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/EmptyState';
import { useVendor, useVendorMutations } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { titleCase } from '@/lib/format';

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useVendor(id);
  const { decide, verifyDoc } = useVendorMutations(id);
  const [note, setNote] = useState('');
  const [action, setAction] = useState<'approved' | 'rejected' | 'needs_info' | 'suspended' | null>(null);

  const vendor = data?.vendor;

  const run = async () => {
    if (!action || !vendor) return;
    try {
      await decide.mutateAsync({ status: action, note });
      logActivity({
        actor: user?.name ?? 'admin',
        action: `Vendor ${action}`,
        target: vendor.outletName || vendor.phone,
        detail: note,
      });
      toast.success(`Vendor ${action.replace('_', ' ')}`);
      setAction(null);
      setNote('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const toggleDoc = async (key: string, verified: boolean) => {
    try {
      await verifyDoc.mutateAsync({ key, verified });
      toast.success(verified ? 'Document verified' : 'Verification removed');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !vendor) {
    return <p className="p-6 text-sm text-ink-500">Loading vendor…</p>;
  }

  const docsOk = vendor.documents.filter((d) => d.verified).length;
  const docsN = vendor.documents.length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={vendor.outletName || 'Untitled outlet'}
        subtitle={`${vendor.ownerName} · ${vendor.phone} · ${vendor.module === 'food' ? 'Food kitchen' : 'Shop'} · one module locked`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<MessageSquareWarning size={15} />} onClick={() => setAction('needs_info')}>
              Request info
            </Button>
            <Button size="sm" variant="secondary" icon={<X size={15} />} onClick={() => setAction('rejected')}>
              Reject
            </Button>
            <Button size="sm" variant="secondary" icon={<Pause size={15} />} onClick={() => setAction('suspended')}>
              Suspend
            </Button>
            <Button size="sm" variant="success" icon={<Check size={15} />} onClick={() => setAction('approved')}>
              Approve live
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink-900">KYC documents</h2>
            <Badge tone={docsOk === docsN && docsN > 0 ? 'success' : 'warning'}>
              {docsOk}/{docsN} verified — approve blocked until 100%
            </Badge>
          </div>
          <ul className="space-y-3">
            {vendor.documents.map((doc) => (
              <li key={doc.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-line)] p-3">
                {doc.uri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.uri} alt={doc.label} className="h-16 w-16 rounded-lg object-cover bg-ink-100" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-ink-50 text-[11px] text-ink-400">
                    Empty
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink-900">{doc.label}</p>
                  <p className="truncate text-[12px] text-ink-400">{doc.uri || 'Not uploaded'}</p>
                  {doc.note ? <p className="text-[12px] text-amber-700">{doc.note}</p> : null}
                </div>
                {doc.uri ? (
                  <a href={doc.uri} target="_blank" rel="noreferrer" className="text-[12.5px] text-brand-700">
                    Open
                  </a>
                ) : null}
                <Button
                  size="sm"
                  variant={doc.verified ? 'success' : 'secondary'}
                  onClick={() => toggleDoc(doc.key, !doc.verified)}
                  loading={verifyDoc.isPending}
                >
                  {doc.verified ? 'Verified' : 'Mark verified'}
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-[15px] font-semibold text-ink-900">Outlet & tax</h2>
          <dl className="space-y-2 text-[13px]">
            {[
              ['Status', titleCase(vendor.status.replace('_', ' '))],
              ['Legal name', vendor.legalName],
              ['Address', `${vendor.address}, ${vendor.city} ${vendor.pin}`],
              ['GSTIN', vendor.gstin],
              ['PAN', vendor.pan],
              ['FSSAI', vendor.fssai],
              ['Trade license', vendor.tradeLicense],
              ['Hours', vendor.hours ? `${vendor.hours.open} – ${vendor.hours.close}` : '—'],
              ['Bank', vendor.bank ? `${vendor.bank.accountName} · ${vendor.bank.bankName} · ${vendor.bank.ifsc}` : '—'],
              ['UPI', vendor.bank?.upi],
              ['Reviewer', vendor.reviewedBy],
              ['Payout wallet', `₹${Math.round(vendor.payoutBalance || 0)} (5% fee already out)`],
              ['Note', vendor.reviewNote],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt className="text-[11px] uppercase tracking-wide text-ink-400">{k}</dt>
                <dd className="text-ink-800">{v || '—'}</dd>
              </div>
            ))}
          </dl>
          <Link href="/customers" className="text-[12.5px] text-brand-700">
            User id {vendor.userId}
          </Link>
        </Card>
      </div>

      {data?.orders?.length ? (
        <Card className="p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Recent orders</h2>
          <ul className="divide-y divide-[var(--color-line)] text-[13px]">
            {data.orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/orders/${o.id}`} className="font-mono text-brand-700">
                  {o.code}
                </Link>
                <span className="text-ink-500">{o.status}</span>
                <span className="font-semibold">₹{o.total}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {vendor.issues?.length ? (
        <Card className="p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Vendor-raised issues</h2>
          <ul className="space-y-2">
            {vendor.issues.map((iss) => (
              <li key={iss.id} className="rounded-lg bg-ink-50 p-3 text-[13px]">
                <p className="font-medium">{iss.title}</p>
                <p className="text-ink-500">{iss.body}</p>
                <p className="mt-1 text-[11px] text-ink-400">{iss.status}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        title={action ? titleCase(action.replace('_', ' ')) : ''}
        subtitle="Vendors only go live after every document is verified."
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button loading={decide.isPending} onClick={run}>
              Confirm
            </Button>
          </>
        }
      >
        <Field label="Note to vendor">
          <Textarea value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} placeholder="Visible in the vendor app" />
        </Field>
      </Modal>
    </div>
  );
}
