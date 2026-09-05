import type { CatalogItem, ImageRef } from '@/types';

/**
 * The reference app has a brand section driven by a `brand` table. This API has
 * no brand collection, but every product carries a `brand` string, so the
 * brand list is derived from the live catalogue instead of being hard-coded.
 */
export interface BrandGroup {
  name: string;
  items: number;
  image: ImageRef | null;
  storeId: string | null;
}

export function groupBrands(products: CatalogItem[]): BrandGroup[] {
  const map = new Map<string, BrandGroup>();
  for (const product of products) {
    const name = (product.brand ?? '').trim();
    if (name.length < 2) continue;
    const existing = map.get(name);
    if (existing) {
      existing.items += 1;
      if (!existing.image && product.image) existing.image = product.image;
    } else {
      map.set(name, { name, items: 1, image: product.image ?? null, storeId: product.storeId ?? null });
    }
  }
  return [...map.values()].sort((a, b) => b.items - a.items || a.name.localeCompare(b.name));
}
