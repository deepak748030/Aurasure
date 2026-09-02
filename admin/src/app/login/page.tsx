'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Phone, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(phone, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in, please try again');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-[400px] space-y-4 rounded-[var(--radius-card)] bg-white p-7 shadow-[var(--shadow-card)] ring-1 ring-[var(--color-line)]">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-60" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      {/* Brand panel - solid colour, no gradients */}
      <section className="hidden w-[46%] flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-bold text-brand-700">
            A
          </span>
          <span className="text-lg font-semibold tracking-[-0.01em]">Aurasure</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.02em]">
            One console for the whole marketplace.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-brand-100">
            Track live orders, run food and shop catalogues, manage customers, review partner
            applications and read the numbers — all wired straight into your Node.js API.
          </p>
          <ul className="mt-8 space-y-3 text-[14px] text-brand-100">
            {['Live order board with one-click fulfilment', 'Full catalogue CRUD for food & shop', 'Customer wallet and loyalty controls', 'Revenue, module and payment reporting'].map(
              (line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <ShieldCheck size={17} className="mt-0.5 shrink-0 text-white" />
                  {line}
                </li>
              ),
            )}
          </ul>
        </div>

        <p className="text-[12.5px] text-brand-200">© {new Date().getFullYear()} Aurasure. Admin access is audited.</p>
      </section>

      {/* Form */}
      <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
              A
            </span>
            <span className="text-lg font-semibold tracking-[-0.01em] text-ink-900">Aurasure Admin</span>
          </div>

          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[var(--color-line)] sm:p-7">
            <h1 className="text-[21px] font-semibold tracking-[-0.02em] text-ink-900">Sign in</h1>
            <p className="mt-1 text-[13.5px] text-ink-500">
              Use an account with the <span className="font-medium text-ink-700">admin</span> role.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Phone number" required>
                <div className="relative">
                  <Phone size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-400" />
                  <Input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="8888888888"
                    inputMode="numeric"
                    autoComplete="username"
                    className="pl-9"
                    required
                  />
                </div>
              </Field>

              <Field label="Password" required>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-400" />
                  <Input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10 pl-9"
                    required
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-400 transition-colors hover:text-ink-700"
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {error ? (
                <p
                  role="alert"
                  className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" size="lg" loading={busy} className="w-full justify-center">
                Sign in to console
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-[12.5px] leading-relaxed text-ink-400">
            Seeded demo admin: <span className="font-medium text-ink-600">8888888888</span> /{' '}
            <span className="font-medium text-ink-600">admin@aurasure</span>
          </p>
        </div>
      </section>
    </main>
  );
}
