'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import { Field, Input, Textarea, Toggle } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAppSettings, useAppSettingsMutation } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import type { AppSettingsDoc } from '@/lib/types';

function num(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numList(value: string): number[] {
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n));
}

function strList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="text-[14px] font-semibold text-ink-900">{title}</h2>
      <p className="mb-4 mt-0.5 text-[12.5px] text-ink-400">{hint}</p>
      <div className="grid gap-3">{children}</div>
    </Card>
  );
}

export default function AppConfigPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useAppSettings();
  const save = useAppSettingsMutation();

  const [form, setForm] = useState<AppSettingsDoc | null>(null);
  const [terms, setTerms] = useState('');
  const [presets, setPresets] = useState('');
  const [tips, setTips] = useState('');
  const [foodTrending, setFoodTrending] = useState('');
  const [shopTrending, setShopTrending] = useState('');
  const [dirty, setDirty] = useState(false);

  const reset = (settings: AppSettingsDoc | null | undefined) => {
    if (!settings) return;
    setForm(JSON.parse(JSON.stringify(settings)) as AppSettingsDoc);
    setTerms((settings.referral.terms ?? []).join('\n'));
    setPresets((settings.wallet.topupPresets ?? []).join(', '));
    setTips((settings.checkout.tips ?? []).join(', '));
    setFoodTrending((settings.search.food ?? []).join(', '));
    setShopTrending((settings.search.shop ?? []).join(', '));
    setDirty(false);
  };

  useEffect(() => {
    if (data?.settings && !form) reset(data.settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const patch = (updater: (draft: AppSettingsDoc) => void) => {
    setForm((prev) => {
      if (!prev) return prev;
      const draft = { ...prev };
      updater(draft);
      return draft;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form) return;
    const body = {
      referral: { ...form.referral, terms: strList(terms) },
      loyalty: form.loyalty,
      wallet: { ...form.wallet, topupPresets: numList(presets) },
      support: form.support,
      payments: form.payments,
      checkout: { tips: numList(tips) },
      search: {
        food: foodTrending.split(',').map((s) => s.trim()).filter(Boolean),
        shop: shopTrending.split(',').map((s) => s.trim()).filter(Boolean),
      },
      delivery: form.delivery,
      cityCenters: form.cityCenters,
    };
    try {
      await save.mutateAsync(body);
      logActivity({ actor: user?.name ?? 'admin', action: 'Updated app configuration', target: 'app-settings' });
      toast.success('App configuration saved — live in the app within a minute.');
      setDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    }
  };

  if (isLoading || (!form && !isError)) {
    return (
      <div className="space-y-4">
        <PageHeader title="App configuration" subtitle="Business rules for the customer app: rewards, payments, support and search." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="space-y-4">
        <PageHeader title="App configuration" subtitle="Business rules for the customer app: rewards, payments, support and search." />
        {data?.settings === null ? (
          <ErrorState message="No settings document yet — save once to create it with the current form values." onRetry={() => refetch()} />
        ) : (
          <ErrorState message={(error as Error)?.message ?? 'Could not load settings.'} onRetry={() => refetch()} />
        )}
      </div>
    );
  }

  const tiers = form.loyalty.tiers ?? [];
  const cities = Object.entries(form.cityCenters ?? {});

  return (
    <div className="space-y-4">
      <PageHeader
        title="App configuration"
        subtitle="Business rules for the customer app: rewards, payments, support and search."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<RotateCcw size={16} />}
              onClick={() => reset(data?.settings)}
              disabled={!dirty}
            >
              Discard
            </Button>
            <Button icon={<Save size={16} />} onClick={() => void handleSave()} loading={save.isPending} disabled={!dirty}>
              {dirty ? 'Save changes' : 'Saved'}
            </Button>
          </>
        }
      />

      <Section title="Referral rewards" hint="Credited by POST /users/me/referral/apply; shown on the Refer & earn sheet.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Friend wallet (₹)">
            <Input
              type="number"
              min={0}
              value={form.referral.walletReward}
              onChange={(e) => patch((d) => { d.referral = { ...d.referral, walletReward: num(e.target.value, 0) }; })}
            />
          </Field>
          <Field label="Friend + referrer points">
            <Input
              type="number"
              min={0}
              value={form.referral.pointsReward}
              onChange={(e) => patch((d) => { d.referral = { ...d.referral, pointsReward: num(e.target.value, 0) }; })}
            />
          </Field>
          <Field label="Referrer wallet (₹)">
            <Input
              type="number"
              min={0}
              value={form.referral.referrerWallet}
              onChange={(e) => patch((d) => { d.referral = { ...d.referral, referrerWallet: num(e.target.value, 0) }; })}
            />
          </Field>
        </div>
        <Field label="Terms" hint="One per line, shown under the invite button.">
          <Textarea value={terms} rows={4} onChange={(e) => { setTerms(e.target.value); setDirty(true); }} />
        </Field>
      </Section>

      <Section title="Loyalty programme" hint="Earn rule runs on every order; redeem rule gates POST /users/me/loyalty/redeem.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Points per ₹100" hint="Rounded down per order.">
            <Input
              type="number"
              min={0}
              value={form.loyalty.earnPer100}
              onChange={(e) => patch((d) => { d.loyalty = { ...d.loyalty, earnPer100: num(e.target.value, 0) }; })}
            />
          </Field>
          <Field label="Redeem step (points)">
            <Input
              type="number"
              min={1}
              value={form.loyalty.redeemPoints}
              onChange={(e) => patch((d) => { d.loyalty = { ...d.loyalty, redeemPoints: num(e.target.value, 100) }; })}
            />
          </Field>
          <Field label="Value per step (₹)">
            <Input
              type="number"
              min={0}
              value={form.loyalty.redeemValue}
              onChange={(e) => patch((d) => { d.loyalty = { ...d.loyalty, redeemValue: num(e.target.value, 0) }; })}
            />
          </Field>
        </div>
        <div className="grid gap-2.5">
          {tiers.map((tier, index) => (
            <div key={index} className="grid items-end gap-2.5 rounded-xl border border-[var(--color-line)] p-3 sm:grid-cols-[1fr_140px_160px_40px]">
              <Field label={index === 0 ? 'Tier name' : undefined}>
                <Input
                  value={tier.name}
                  onChange={(e) =>
                    patch((d) => {
                      d.loyalty = { ...d.loyalty, tiers: d.loyalty.tiers.map((t, i) => (i === index ? { ...t, name: e.target.value } : t)) };
                    })
                  }
                />
              </Field>
              <Field label={index === 0 ? 'Min points' : undefined}>
                <Input
                  type="number"
                  min={0}
                  value={tier.min}
                  onChange={(e) =>
                    patch((d) => {
                      d.loyalty = { ...d.loyalty, tiers: d.loyalty.tiers.map((t, i) => (i === index ? { ...t, min: num(e.target.value, 0) } : t)) };
                    })
                  }
                />
              </Field>
              <Field label={index === 0 ? 'Color' : undefined}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tier.color || '#C2703D'}
                    onChange={(e) =>
                      patch((d) => {
                        d.loyalty = { ...d.loyalty, tiers: d.loyalty.tiers.map((t, i) => (i === index ? { ...t, color: e.target.value } : t)) };
                      })
                    }
                    className="h-10 w-12 cursor-pointer rounded-lg border border-[var(--color-line-strong)] bg-white p-1"
                  />
                  <Input
                    value={tier.color}
                    onChange={(e) =>
                      patch((d) => {
                        d.loyalty = { ...d.loyalty, tiers: d.loyalty.tiers.map((t, i) => (i === index ? { ...t, color: e.target.value } : t)) };
                      })
                    }
                  />
                </div>
              </Field>
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 size={15} />}
                aria-label={`Remove ${tier.name}`}
                onClick={() => patch((d) => { d.loyalty = { ...d.loyalty, tiers: d.loyalty.tiers.filter((_, i) => i !== index) }; })}
              >
                {''}
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            icon={<Plus size={16} />}
            className="justify-self-start"
            onClick={() =>
              patch((d) => {
                d.loyalty = { ...d.loyalty, tiers: [...(d.loyalty.tiers ?? []), { name: 'New tier', min: 0, color: '#64748B' }] };
              })
            }
          >
            Add tier
          </Button>
        </div>
      </Section>

      <Section title="Wallet top-ups" hint="Presets on the Add money sheet; bounds are enforced by the API.">
        <Field label="Preset chips (₹)" hint="Comma-separated.">
          <Input value={presets} onChange={(e) => { setPresets(e.target.value); setDirty(true); }} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Minimum top-up (₹)">
            <Input
              type="number"
              min={1}
              value={form.wallet.minTopup}
              onChange={(e) => patch((d) => { d.wallet = { ...d.wallet, minTopup: num(e.target.value, 1) }; })}
            />
          </Field>
          <Field label="Maximum top-up (₹)">
            <Input
              type="number"
              min={1}
              value={form.wallet.maxTopup}
              onChange={(e) => patch((d) => { d.wallet = { ...d.wallet, maxTopup: num(e.target.value, 25000) }; })}
            />
          </Field>
        </div>
      </Section>

      <Section title="Support channels" hint="Contact cards on Help & support; the phone number also feeds WhatsApp.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone (E.164)" hint="Used for tel: and wa.me links.">
            <Input value={form.support.phone} onChange={(e) => patch((d) => { d.support = { ...d.support, phone: e.target.value }; })} />
          </Field>
          <Field label="Display phone">
            <Input value={form.support.displayPhone} onChange={(e) => patch((d) => { d.support = { ...d.support, displayPhone: e.target.value }; })} />
          </Field>
          <Field label="Support email">
            <Input value={form.support.email} onChange={(e) => patch((d) => { d.support = { ...d.support, email: e.target.value }; })} />
          </Field>
          <Field label="Hours line">
            <Input value={form.support.hours} onChange={(e) => patch((d) => { d.support = { ...d.support, hours: e.target.value }; })} />
          </Field>
        </div>
        <Field label="First-response target (minutes)" hint="Shown next to “Write to us”.">
          <Input
            type="number"
            min={0}
            value={form.support.slaMinutes}
            onChange={(e) => patch((d) => { d.support = { ...d.support, slaMinutes: num(e.target.value, 0) }; })}
            className="sm:max-w-52"
          />
        </Field>
      </Section>

      <Section title="Payment methods" hint="Checkout renders these in order; disabled rows show their note as the reason.">
        {form.payments.map((method, index) => (
          <div key={method.key} className="grid items-end gap-2.5 rounded-xl border border-[var(--color-line)] p-3 sm:grid-cols-[110px_1fr_1.4fr_120px_90px]">
            <Field label={index === 0 ? 'Key' : undefined}>
              <Input value={method.key} disabled aria-label="Method key" />
            </Field>
            <Field label={index === 0 ? 'Label' : undefined}>
              <Input
                value={method.label}
                onChange={(e) =>
                  patch((d) => {
                    d.payments = d.payments.map((m, i) => (i === index ? { ...m, label: e.target.value } : m));
                  })
                }
              />
            </Field>
            <Field label={index === 0 ? 'Sub note' : undefined}>
              <Input
                value={method.sub}
                onChange={(e) =>
                  patch((d) => {
                    d.payments = d.payments.map((m, i) => (i === index ? { ...m, sub: e.target.value } : m));
                  })
                }
              />
            </Field>
            <Field label={index === 0 ? 'Icon' : undefined}>
              <Input
                value={method.icon}
                onChange={(e) =>
                  patch((d) => {
                    d.payments = d.payments.map((m, i) => (i === index ? { ...m, icon: e.target.value } : m));
                  })
                }
              />
            </Field>
            <div className="flex h-10 items-center">
              <Toggle
                checked={method.enabled}
                label={`${method.label} enabled`}
                onChange={(next) =>
                  patch((d) => {
                    d.payments = d.payments.map((m, i) => (i === index ? { ...m, enabled: next } : m));
                  })
                }
              />
            </div>
          </div>
        ))}
        <Field label="Delivery-partner tips (₹)" hint="Comma-separated; 0 renders as “No tip”.">
          <Input value={tips} onChange={(e) => { setTips(e.target.value); setDirty(true); }} />
        </Field>
      </Section>

      <Section title="Search & delivery" hint="Trending chips on the search screen and fallback ETAs.">
        <Field label="Food trending" hint="Comma-separated.">
          <Input value={foodTrending} onChange={(e) => { setFoodTrending(e.target.value); setDirty(true); }} />
        </Field>
        <Field label="Shop trending" hint="Comma-separated.">
          <Input value={shopTrending} onChange={(e) => { setShopTrending(e.target.value); setDirty(true); }} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Default ETA (min)">
            <Input
              type="number"
              min={1}
              value={form.delivery.defaultEta}
              onChange={(e) => patch((d) => { d.delivery = { ...d.delivery, defaultEta: num(e.target.value, 20) }; })}
            />
          </Field>
          <Field label="Min ETA (min)">
            <Input
              type="number"
              min={1}
              value={form.delivery.minEta}
              onChange={(e) => patch((d) => { d.delivery = { ...d.delivery, minEta: num(e.target.value, 10) }; })}
            />
          </Field>
          <Field label="Max ETA (min)">
            <Input
              type="number"
              min={1}
              value={form.delivery.maxEta}
              onChange={(e) => patch((d) => { d.delivery = { ...d.delivery, maxEta: num(e.target.value, 90) }; })}
            />
          </Field>
        </div>
      </Section>

      <Section title="City centres" hint="Map pins for cities on the location screen. Outlet cities without a centre still list, but show no pin.">
        {cities.map(([name]) => {
          const centre = form.cityCenters[name] ?? { lat: 0, lng: 0 };
          return (
            <div key={name} className="grid items-end gap-2.5 rounded-xl border border-[var(--color-line)] p-3 sm:grid-cols-[1fr_140px_140px_40px]">
              <Field label="City">
                <Input value={name} disabled />
              </Field>
              <Field label="Latitude">
                <Input
                  type="number"
                  step="any"
                  value={centre.lat}
                  onChange={(e) =>
                    patch((d) => {
                      d.cityCenters = { ...d.cityCenters, [name]: { lat: Number(e.target.value), lng: d.cityCenters[name]?.lng ?? 0 } };
                    })
                  }
                />
              </Field>
              <Field label="Longitude">
                <Input
                  type="number"
                  step="any"
                  value={centre.lng}
                  onChange={(e) =>
                    patch((d) => {
                      d.cityCenters = { ...d.cityCenters, [name]: { lat: d.cityCenters[name]?.lat ?? 0, lng: Number(e.target.value) } };
                    })
                  }
                />
              </Field>
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 size={15} />}
                aria-label={`Remove ${name}`}
                onClick={() =>
                  patch((d) => {
                    const next = { ...d.cityCenters };
                    delete next[name];
                    d.cityCenters = next;
                  })
                }
              >
                {''}
              </Button>
            </div>
          );
        })}
        <AddCityRow
          onAdd={(name, lat, lng) =>
            patch((d) => {
              d.cityCenters = { ...d.cityCenters, [name]: { lat, lng } };
            })
          }
        />
      </Section>
    </div>
  );
}

function AddCityRow({ onAdd }: { onAdd: (name: string, lat: number, lng: number) => void }) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  return (
    <div className="grid items-end gap-2.5 rounded-xl border border-dashed border-[var(--color-line-strong)] p-3 sm:grid-cols-[1fr_140px_140px_auto]">
      <Field label="New city">
        <Input value={name} placeholder="Durg" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Latitude">
        <Input type="number" step="any" value={lat} placeholder="21.19" onChange={(e) => setLat(e.target.value)} />
      </Field>
      <Field label="Longitude">
        <Input type="number" step="any" value={lng} placeholder="81.2849" onChange={(e) => setLng(e.target.value)} />
      </Field>
      <Button
        variant="secondary"
        icon={<Plus size={16} />}
        disabled={!name.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))}
        onClick={() => {
          onAdd(name.trim(), Number(lat), Number(lng));
          setName('');
          setLat('');
          setLng('');
        }}
      >
        Add
      </Button>
    </div>
  );
}
