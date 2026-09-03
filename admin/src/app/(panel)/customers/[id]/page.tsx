'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Wallet,
  Sparkles,
  Ticket,
  MapPin,
  ShoppingBag,
  ShieldCheck,
  Plus,
  Minus,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, ModuleBadge, StatusBadge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/PageHeader';
import { CardSkeleton, Skeleton, StatSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { useCustomer, useCustomerMutations } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { dateOnly, dateTime, initials, money, num, timeAgo, titleCase } from '@/lib/format';

type LedgerTab = 'wallet' | 'loyalty' | 'coupons' | 'addresses' | 'orders';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { user: admin } = useAuth();
  const { data, isLoading, isError, error, refetch } = useCustomer(id);
  const { wallet, loyalty, role } = useCustomerMutations(id);

  const [tab, setTab] = useState<LedgerTab>('orders');
  const [walletOpen, setWalletOpen] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [walletForm, setWalletForm] = useState({ type: 'credit', amount: '', note: '' });
  const [loyaltyForm, setLoyaltyForm] = useState({ type: 'earned', points: '', note: '' });
  const [formError, setFormError] = useState('');

  const customer = data?.customer;

  const submitWallet = async () => {
    setFormError('');
    const amount = Number(walletForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter an amount greater than 0');
      return;
    }
    try {
      await wallet.mutateAsync({ type: walletForm.type as 'credit' | 'debit', amount, note: walletForm.note });
      logActivity({
        actor: admin?.name ?? 'admin',
        action: `Wallet ${walletForm.type} ₹${amount}`,
        target: customer?.name ?? id,
        detail: walletForm.note,
      });
      toast.success(`Wallet ${walletForm.type === 'credit' ? 'credited' : 'debited'} by ${money(amount)}`);
      setWalletOpen(false);
      setWalletForm({ type: 'credit', amount: '', note: '' });
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const submitLoyalty = async () => {
    setFormError('');
    const points = Number(loyaltyForm.points);
    if (!Number.isFinite(points) || points <= 0) {
      setFormError('Enter a point value greater than 0');
      return;
    }
    try {
      await loyalty.mutateAsync({ type: loyaltyForm.type as 'earned' | 'redeemed', points, note: loyaltyForm.note });
      logActivity({
        actor: admin?.name ?? 'admin',
        action: `Loyalty ${loyaltyForm.type} ${points} pts`,
        target: customer?.name ?? id,
        detail: loyaltyForm.note,
      });
      toast.success('Loyalty points updated');
      setLoyaltyOpen(false);
      setLoyaltyForm({ type: 'earned', points: '', note: '' });
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const toggleRole = async () => {
    if (!customer) return;
    const next = customer.role === 'admin' ? 'customer' : 'admin';
    try {
      await role.mutateAsync({ role: next });
      logActivity({ actor: admin?.name ?? 'admin', action: `Role → ${next}`, target: customer.name });
      toast.success(`${customer.name} is now ${next === 'admin' ? 'an admin' : 'a customer'}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <StatSkeleton count={4} />
        <div className="grid gap-4 lg:grid-cols-3">
          <CardSkeleton lines={6} className="lg:col-span-2" />
          <CardSkeleton lines={6} />
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <Card padded={false}>
        <ErrorState message={(error as Error)?.message ?? 'Customer not found'} onRetry={() => refetch()} />
      </Card>
    );
  }

  const tabs = [
    { key: 'orders', label: 'Orders', count: data?.orders.length },
    { key: 'wallet', label: 'Wallet ledger', count: customer.walletTxs?.length },
    { key: 'loyalty', label: 'Loyalty ledger', count: customer.loyaltyTxs?.length },
    { key: 'coupons', label: 'Coupons', count: customer.coupons?.length },
    { key: 'addresses', label: 'Addresses', count: customer.addresses?.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.push('/customers')}>
            <ArrowLeft size={18} />
          </Button>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-[15px] font-semibold text-white">
            {initials(customer.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-[-0.01em] text-ink-900">{customer.name}</h1>
              <Badge tone={customer.role === 'admin' ? 'brand' : 'neutral'}>{titleCase(customer.role)}</Badge>
            </div>
            <p className="text-[12.5px] text-ink-500">
              {customer.phone} · joined {dateOnly(customer.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Wallet size={16} />} onClick={() => setWalletOpen(true)}>
            Adjust wallet
          </Button>
          <Button variant="secondary" icon={<Sparkles size={16} />} onClick={() => setLoyaltyOpen(true)}>
            Adjust points
          </Button>
          <Button variant="secondary" icon={<ShieldCheck size={16} />} loading={role.isPending} onClick={toggleRole}>
            {customer.role === 'admin' ? 'Revoke admin' : 'Make admin'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Lifetime value" value={money(data?.stats.spent)} icon={ShoppingBag} tone="success" />
        <StatCard
          label="Orders"
          value={num(data?.stats.orders)}
          hint={`${num(data?.stats.cancelled)} cancelled`}
          icon={ShoppingBag}
          tone="brand"
        />
        <StatCard label="Wallet balance" value={money(customer.wallet)} icon={Wallet} tone="info" />
        <StatCard label="Loyalty points" value={num(customer.loyaltyPoints)} icon={Sparkles} tone="warning" />
      </div>

      {customer.partnerApplication ? (
        <Card className="border-l-[3px] border-l-brand-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-ink-900">
                {titleCase(customer.partnerApplication.kind)} partner application
              </p>
              <p className="text-[12.5px] text-ink-500">
                {customer.partnerApplication.city || 'City not provided'} · applied{' '}
                {dateOnly(customer.partnerApplication.appliedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  customer.partnerApplication.status === 'approved'
                    ? 'success'
                    : customer.partnerApplication.status === 'rejected'
                      ? 'danger'
                      : 'warning'
                }
              >
                {titleCase(customer.partnerApplication.status)}
              </Badge>
              <Link href="/partners" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
                Review
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <Card padded={false}>
        <div className="p-4 sm:p-5">
          <Tabs items={tabs} active={tab} onChange={(key) => setTab(key as LedgerTab)} />
        </div>

        <div className="border-t border-[var(--color-line)]">
          {tab === 'orders' ? (
            <ul className="divide-y divide-[var(--color-line)]">
              {(data?.orders ?? []).map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-ink-50 sm:px-5"
                  >
                    <span className="font-mono text-[12.5px] font-medium text-ink-800">{order.code}</span>
                    <ModuleBadge module={order.module} />
                    <StatusBadge status={order.status} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-500">
                      {order.items.length} item{order.items.length === 1 ? '' : 's'} · {timeAgo(order.placedAt)}
                    </span>
                    <span className="text-[13px] font-semibold text-ink-900 tabular">{money(order.total)}</span>
                  </Link>
                </li>
              ))}
              {(data?.orders ?? []).length === 0 ? (
                <li className="px-5 py-10 text-center text-[13px] text-ink-400">No orders yet.</li>
              ) : null}
            </ul>
          ) : null}

          {tab === 'wallet' || tab === 'loyalty' ? (
            <ul className="divide-y divide-[var(--color-line)]">
              {(tab === 'wallet' ? customer.walletTxs ?? [] : customer.loyaltyTxs ?? []).map((tx) => {
                const positive = tx.type === 'credit' || tx.type === 'earned';
                return (
                  <li key={tx.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        positive
                          ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                          : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                      }`}
                    >
                      {positive ? <Plus size={15} /> : <Minus size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink-900">{tx.title}</p>
                      <p className="truncate text-[12px] text-ink-400">
                        {tx.note ? `${tx.note} · ` : ''}
                        {dateTime(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[13.5px] font-semibold tabular ${
                          positive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                        }`}
                      >
                        {positive ? '+' : '−'}
                        {tab === 'wallet' ? money(tx.amount) : `${tx.points} pts`}
                      </p>
                      <p className="text-[11.5px] text-ink-400 tabular">
                        bal {tab === 'wallet' ? money(tx.balanceAfter) : `${tx.balanceAfter} pts`}
                      </p>
                    </div>
                  </li>
                );
              })}
              {(tab === 'wallet' ? customer.walletTxs : customer.loyaltyTxs).length === 0 ? (
                <li className="px-5 py-10 text-center text-[13px] text-ink-400">No entries yet.</li>
              ) : null}
            </ul>
          ) : null}

          {tab === 'coupons' ? (
            <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
              {(customer.coupons ?? []).map((coupon) => (
                <li key={coupon.id} className="rounded-xl bg-ink-50 p-4 ring-1 ring-[var(--color-line)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold text-ink-900">
                      <Ticket size={14} className="text-brand-600" />
                      {coupon.code}
                    </span>
                    <Badge tone={coupon.usedAt ? 'neutral' : 'success'}>{coupon.usedAt ? 'Used' : 'Available'}</Badge>
                  </div>
                  <p className="mt-2 text-[13px] text-ink-700">{coupon.title}</p>
                  <p className="mt-1 text-[12px] text-ink-400">
                    Min order {money(coupon.minOrder)} · expires {dateOnly(coupon.expiresAt)}
                  </p>
                </li>
              ))}
              {(customer.coupons ?? []).length === 0 ? (
                <li className="col-span-full py-10 text-center text-[13px] text-ink-400">No coupons.</li>
              ) : null}
            </ul>
          ) : null}

          {tab === 'addresses' ? (
            <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {(customer.addresses ?? []).map((address) => (
                <li key={address.id} className="rounded-xl bg-ink-50 p-4 ring-1 ring-[var(--color-line)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-900">
                      <MapPin size={14} className="text-ink-400" />
                      {address.label}
                    </span>
                    {address.isDefault ? <Badge tone="brand">Default</Badge> : null}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                    {address.line}, {address.city} — {address.pin}
                  </p>
                </li>
              ))}
              {(customer.addresses ?? []).length === 0 ? (
                <li className="col-span-full py-10 text-center text-[13px] text-ink-400">No saved addresses.</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </Card>

      {/* Wallet adjustment */}
      <Modal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        title="Adjust wallet balance"
        subtitle={`Current balance ${money(customer.wallet)}`}
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setWalletOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitWallet} loading={wallet.isPending}>
              Apply
            </Button>
          </>
        }
      >
        {formError ? (
          <p className="mb-4 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">
            {formError}
          </p>
        ) : null}
        <div className="space-y-4">
          <Field label="Direction">
            <Select value={walletForm.type} onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value })}>
              <option value="credit">Credit (add money)</option>
              <option value="debit">Debit (remove money)</option>
            </Select>
          </Field>
          <Field label="Amount (₹)" required>
            <Input
              type="number"
              min={1}
              value={walletForm.amount}
              onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })}
            />
          </Field>
          <Field label="Reason" hint="Stored on the customer's ledger entry.">
            <Textarea
              value={walletForm.note}
              placeholder="Goodwill refund for order AUR-1042"
              onChange={(e) => setWalletForm({ ...walletForm, note: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {/* Loyalty adjustment */}
      <Modal
        open={loyaltyOpen}
        onClose={() => setLoyaltyOpen(false)}
        title="Adjust loyalty points"
        subtitle={`Current balance ${num(customer.loyaltyPoints)} pts`}
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLoyaltyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitLoyalty} loading={loyalty.isPending}>
              Apply
            </Button>
          </>
        }
      >
        {formError ? (
          <p className="mb-4 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">
            {formError}
          </p>
        ) : null}
        <div className="space-y-4">
          <Field label="Direction">
            <Select value={loyaltyForm.type} onChange={(e) => setLoyaltyForm({ ...loyaltyForm, type: e.target.value })}>
              <option value="earned">Grant points</option>
              <option value="redeemed">Deduct points</option>
            </Select>
          </Field>
          <Field label="Points" required>
            <Input
              type="number"
              min={1}
              value={loyaltyForm.points}
              onChange={(e) => setLoyaltyForm({ ...loyaltyForm, points: e.target.value })}
            />
          </Field>
          <Field label="Reason">
            <Textarea
              value={loyaltyForm.note}
              placeholder="Compensation for a late delivery"
              onChange={(e) => setLoyaltyForm({ ...loyaltyForm, note: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
