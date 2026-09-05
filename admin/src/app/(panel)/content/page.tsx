'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useContentMutation, useContents } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import type { ContentDoc } from '@/lib/types';

const KEY_LABELS: Record<string, { label: string; hint: string }> = {
  faqs: { label: 'Help centre FAQs', hint: 'Searchable answers in Help & support.' },
  'policy-cancellation': { label: 'Cancellation policy', hint: 'Shown from Profile → Policies.' },
  'policy-refund': { label: 'Refund policy', hint: 'Shown from Profile → Policies.' },
  'policy-privacy': { label: 'Privacy policy', hint: 'Shown from Profile → Policies.' },
  'policy-terms': { label: 'Terms of use', hint: 'Shown from Profile → Policies.' },
  'partner-perks': { label: 'Partner perks', hint: 'Hero + perks on Become a partner.' },
};

interface FaqItem {
  q: string;
  a: string;
  match: string[];
  icon: string;
}

interface PolicySection {
  heading: string;
  body: string;
}

interface Perk {
  icon: string;
  title: string;
  body: string;
}

function asFaqs(data: Record<string, unknown>): FaqItem[] {
  const items = (data.items as FaqItem[] | undefined) ?? [];
  return items.map((item) => ({
    q: item.q ?? '',
    a: item.a ?? '',
    match: Array.isArray(item.match) ? item.match : [],
    icon: item.icon ?? 'info',
  }));
}

function asSections(data: Record<string, unknown>): PolicySection[] {
  const sections = (data.sections as PolicySection[] | undefined) ?? [];
  return sections.map((s) => ({ heading: s.heading ?? '', body: s.body ?? '' }));
}

function asPerks(data: Record<string, unknown>): Perk[] {
  const perks = (data.perks as Perk[] | undefined) ?? [];
  return perks.map((p) => ({ icon: p.icon ?? 'info', title: p.title ?? '', body: p.body ?? '' }));
}

export default function ContentPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { data: docs, isLoading, isError, error, refetch } = useContents();
  const save = useContentMutation();

  const [activeKey, setActiveKey] = useState<string>('');
  const [docTitle, setDocTitle] = useState('');
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [policy, setPolicy] = useState({ title: '', icon: '', updated: '', intro: '' });
  const [sections, setSections] = useState<PolicySection[]>([]);
  const [hero, setHero] = useState({ title: '', subtitle: '' });
  const [perks, setPerks] = useState<Perk[]>([]);
  const [dirty, setDirty] = useState(false);

  const active = useMemo(() => docs?.find((d) => d.key === activeKey) ?? null, [docs, activeKey]);
  const kind: 'faqs' | 'policy' | 'perks' | 'unknown' = activeKey === 'faqs'
    ? 'faqs'
    : activeKey === 'partner-perks'
      ? 'perks'
      : activeKey.startsWith('policy-')
        ? 'policy'
        : 'unknown';

  useEffect(() => {
    if (!activeKey && docs?.length) setActiveKey(docs[0].key);
  }, [docs, activeKey]);

  useEffect(() => {
    if (!active) return;
    setDocTitle(active.title);
    setFaqs(asFaqs(active.data));
    setPolicy({
      title: String(active.data.title ?? ''),
      icon: String(active.data.icon ?? ''),
      updated: String(active.data.updated ?? ''),
      intro: String(active.data.intro ?? ''),
    });
    setSections(asSections(active.data));
    const heroData = (active.data.hero as { title?: string; subtitle?: string } | undefined) ?? {};
    setHero({ title: heroData.title ?? '', subtitle: heroData.subtitle ?? '' });
    setPerks(asPerks(active.data));
    setDirty(false);
  }, [active]);

  const touch = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!active) return;
    const data: Record<string, unknown> =
      kind === 'faqs'
        ? { items: faqs.filter((f) => f.q.trim() && f.a.trim()) }
        : kind === 'policy'
          ? { ...policy, sections: sections.filter((s) => s.heading.trim() && s.body.trim()) }
          : { hero, perks: perks.filter((p) => p.title.trim() && p.body.trim()) };
    try {
      await save.mutateAsync({ key: active.key, body: { title: docTitle.trim() || active.title, data } });
      logActivity({ actor: user?.name ?? 'admin', action: 'Updated content page', target: active.key });
      toast.success('Content saved — the app picks it up immediately.');
      setDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Content pages" subtitle="FAQs, policies and partner perks shown in the customer app." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Content pages" subtitle="FAQs, policies and partner perks shown in the customer app." />
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Content pages"
        subtitle="Every word the app shows for help, policies and partner perks — no app update needed."
        actions={
          <Button icon={<Save size={16} />} onClick={() => void handleSave()} loading={save.isPending} disabled={!dirty || !active}>
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card padded={false}>
          <ul className="space-y-0.5 p-2.5">
            {(docs ?? []).map((doc) => {
              const selected = doc.key === activeKey;
              return (
                <li key={doc.key}>
                  <button
                    type="button"
                    onClick={() => setActiveKey(doc.key)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors ${
                      selected ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <FileText size={15} className={selected ? 'text-brand-600' : 'text-ink-300'} />
                    <span className="min-w-0">
                      <span className="block truncate">{KEY_LABELS[doc.key]?.label ?? doc.title}</span>
                      <span className="block truncate text-[11.5px] font-normal text-ink-400">
                        {KEY_LABELS[doc.key]?.hint ?? doc.key}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          {!active ? (
            <p className="text-[13px] text-ink-400">Pick a page on the left to edit it.</p>
          ) : (
            <div className="grid gap-4">
              <Field label="Admin title" hint="Internal name for this document.">
                <Input value={docTitle} maxLength={120} onChange={(e) => touch(setDocTitle, e.target.value)} />
              </Field>

              {kind === 'faqs' ? (
                <>
                  {faqs.map((faq, index) => (
                    <div key={index} className="grid gap-2.5 rounded-xl border border-[var(--color-line)] p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-ink-400 tabular">QUESTION {index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 size={14} />}
                          onClick={() => touch(setFaqs, faqs.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                      <Field label="Question">
                        <Input
                          value={faq.q}
                          onChange={(e) => touch(setFaqs, faqs.map((f, i) => (i === index ? { ...f, q: e.target.value } : f)))}
                        />
                      </Field>
                      <Field label="Answer">
                        <Textarea
                          value={faq.a}
                          rows={2}
                          onChange={(e) => touch(setFaqs, faqs.map((f, i) => (i === index ? { ...f, a: e.target.value } : f)))}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-2.5">
                        <Field label="Search keywords" hint="Comma-separated.">
                          <Input
                            value={faq.match.join(', ')}
                            onChange={(e) =>
                              touch(
                                setFaqs,
                                faqs.map((f, i) =>
                                  i === index ? { ...f, match: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : f,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label="Icon name">
                          <Input
                            value={faq.icon}
                            onChange={(e) => touch(setFaqs, faqs.map((f, i) => (i === index ? { ...f, icon: e.target.value } : f)))}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    icon={<Plus size={16} />}
                    onClick={() => touch(setFaqs, [...faqs, { q: '', a: '', match: [], icon: 'info' }])}
                    className="justify-self-start"
                  >
                    Add question
                  </Button>
                </>
              ) : null}

              {kind === 'policy' ? (
                <>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field label="App title">
                      <Input value={policy.title} onChange={(e) => touch(setPolicy, { ...policy, title: e.target.value })} />
                    </Field>
                    <Field label="Header icon">
                      <Input value={policy.icon} onChange={(e) => touch(setPolicy, { ...policy, icon: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="'Updated' line">
                    <Input value={policy.updated} onChange={(e) => touch(setPolicy, { ...policy, updated: e.target.value })} />
                  </Field>
                  <Field label="Intro paragraph">
                    <Textarea value={policy.intro} rows={2} onChange={(e) => touch(setPolicy, { ...policy, intro: e.target.value })} />
                  </Field>
                  {sections.map((section, index) => (
                    <div key={index} className="grid gap-2.5 rounded-xl border border-[var(--color-line)] p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-ink-400 tabular">SECTION {index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 size={14} />}
                          onClick={() => touch(setSections, sections.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                      <Field label="Heading">
                        <Input
                          value={section.heading}
                          onChange={(e) =>
                            touch(setSections, sections.map((s, i) => (i === index ? { ...s, heading: e.target.value } : s)))
                          }
                        />
                      </Field>
                      <Field label="Body">
                        <Textarea
                          value={section.body}
                          rows={3}
                          onChange={(e) => touch(setSections, sections.map((s, i) => (i === index ? { ...s, body: e.target.value } : s)))}
                        />
                      </Field>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    icon={<Plus size={16} />}
                    onClick={() => touch(setSections, [...sections, { heading: '', body: '' }])}
                    className="justify-self-start"
                  >
                    Add section
                  </Button>
                </>
              ) : null}

              {kind === 'perks' ? (
                <>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field label="Hero title">
                      <Input value={hero.title} onChange={(e) => touch(setHero, { ...hero, title: e.target.value })} />
                    </Field>
                    <Field label="Hero subtitle">
                      <Input value={hero.subtitle} onChange={(e) => touch(setHero, { ...hero, subtitle: e.target.value })} />
                    </Field>
                  </div>
                  {perks.map((perk, index) => (
                    <div key={index} className="grid gap-2.5 rounded-xl border border-[var(--color-line)] p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-ink-400 tabular">PERK {index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 size={14} />}
                          onClick={() => touch(setPerks, perks.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-[140px_1fr]">
                        <Field label="Icon">
                          <Input
                            value={perk.icon}
                            onChange={(e) => touch(setPerks, perks.map((p, i) => (i === index ? { ...p, icon: e.target.value } : p)))}
                          />
                        </Field>
                        <Field label="Title">
                          <Input
                            value={perk.title}
                            onChange={(e) => touch(setPerks, perks.map((p, i) => (i === index ? { ...p, title: e.target.value } : p)))}
                          />
                        </Field>
                      </div>
                      <Field label="Body">
                        <Textarea
                          value={perk.body}
                          rows={2}
                          onChange={(e) => touch(setPerks, perks.map((p, i) => (i === index ? { ...p, body: e.target.value } : p)))}
                        />
                      </Field>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    icon={<Plus size={16} />}
                    onClick={() => touch(setPerks, [...perks, { icon: 'info', title: '', body: '' }])}
                    className="justify-self-start"
                  >
                    Add perk
                  </Button>
                </>
              ) : null}

              {kind === 'unknown' ? (
                <p className="text-[13px] text-ink-400">
                  Unknown document shape for “{active.key}” — edit it via the API.
                </p>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
