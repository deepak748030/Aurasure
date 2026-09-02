'use client';

import type { ReactNode } from 'react';
import { Star } from 'lucide-react';
import { imageUrl, money } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

/** Small square thumbnail + name, the first column of most catalogue tables. */
export function NameCell({
  image,
  name,
  meta,
  fallback = '—',
}: {
  image?: unknown;
  name?: unknown;
  meta?: ReactNode;
  fallback?: string;
}) {
  const src = imageUrl(image);
  const label = String(name ?? fallback);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-100 text-[11px] font-semibold text-ink-400">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          label.slice(0, 2).toUpperCase()
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-medium text-ink-900">{label}</span>
        {meta ? <span className="block truncate text-[12px] text-ink-400">{meta}</span> : null}
      </span>
    </div>
  );
}

export function RatingCell({ rating, reviews }: { rating?: unknown; reviews?: unknown }) {
  const value = Number(rating ?? 0);
  if (!value) return <span className="text-ink-300">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-ink-700 tabular">
      <Star size={13} className="fill-[#f5a623] text-[#f5a623]" />
      {value.toFixed(1)}
      {reviews ? <span className="text-ink-400">({String(reviews)})</span> : null}
    </span>
  );
}

export function PriceCell({ price, mrp }: { price?: unknown; mrp?: unknown }) {
  const p = Number(price ?? 0);
  const m = Number(mrp ?? 0);
  return (
    <span className="inline-flex items-baseline gap-1.5 tabular">
      <span className="font-semibold text-ink-900">{money(p)}</span>
      {m > p ? <span className="text-[12px] text-ink-400 line-through">{money(m)}</span> : null}
    </span>
  );
}

export function BoolCell({ value, yes = 'Yes', no = 'No' }: { value?: unknown; yes?: string; no?: string }) {
  return <Badge tone={value ? 'success' : 'neutral'}>{value ? yes : no}</Badge>;
}

export function TagsCell({ value }: { value?: unknown }) {
  const tags = Array.isArray(value) ? (value as string[]) : [];
  if (!tags.length) return <span className="text-ink-300">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.slice(0, 3).map((tag) => (
        <Badge key={tag} tone="neutral">
          {tag}
        </Badge>
      ))}
      {tags.length > 3 ? <Badge tone="neutral">+{tags.length - 3}</Badge> : null}
    </span>
  );
}
