import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Sheet } from '@/components/sheet/Sheet';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { Price, QtyStepper, RatingPill, Tag, VegMark } from '@/components/ui/Primitives';
import { SmartImage } from '@/components/ui/SmartImage';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { money } from '@/lib/format';
import type { Selection } from '@/context/CartContext';
import { addonSurcharge, variantSurcharge } from '@/context/CartContext';
import type { CatalogItem, ModuleKey, VariantOption } from '@/types';



/**
 * Bottom sheet used when an item carries options. Renders from
 * `item.variants` / `item.addonGroups` (food) and `item.colors` /
 * `item.sizes` (shop). The seed data has none of these rows, so the sheet
 * simply shows "no options" and never invents a price.
 */
export function ItemOptionSheet({
  visible,
  item,
  module,
  onClose,
  onSubmit,
  initialQty = 1,
  submitLabel = 'Add to cart',
  outletName,
}: {
  visible: boolean;
  item: CatalogItem | null;
  module: ModuleKey;
  onClose: () => void;
  onSubmit: (selection: Omit<Selection, 'item'> & { item: CatalogItem }) => void;
  initialQty?: number;
  submitLabel?: string;
  outletName?: string;
}): React.ReactElement | null {
  const c = useColors();
  const [variant, setVariant] = useState<string | undefined>(undefined);
  const [addons, setAddons] = useState<string[]>([]);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [size, setSize] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState(initialQty);

  const variants: VariantOption[] = item?.variants ?? [];
  const groups = item?.addonGroups ?? [];
  const colors = item?.colors ?? [];
  const sizes = item?.sizes ?? [];

  const activeVariant = variant ?? (variants.length === 1 ? String(variants[0]?.label ?? variants[0]?.name ?? '') : undefined);

  const unit = useMemo(() => {
    if (!item) return 0;
    return Math.max(0, Number(item.price) || 0) + variantSurcharge(item, activeVariant) + addonSurcharge(item, addons);
  }, [item, activeVariant, addons]);

  const label = (option: VariantOption): string => String(option.label ?? option.name ?? option.title ?? 'Option');
  const extra = (option: VariantOption): number => Number(option.price ?? option.optionPrice ?? 0) || 0;

  const reset = (): void => {
    setVariant(undefined);
    setAddons([]);
    setColor(undefined);
    setSize(undefined);
    setQty(initialQty);
  };

  const needsAnything = variants.length > 1 || colors.length > 0 || sizes.length > 0;

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title={item?.name ?? 'Choose options'}
      subtitle={outletName ?? (module === 'food' ? 'Pick how you want it' : 'Pick size and colour')}
      icon={module === 'food' ? 'utensils' : 'bag'}
      maxHeightRatio={0.82}
      footer={
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <QtyStepper qty={qty} onChange={(next) => setQty(Math.max(1, next))} max={Math.max(1, Number(item?.stockQty ?? 20) || 20)} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text variant="micro" tone="faint">
                {qty} × {money(unit)}
              </Text>
              <Text variant="h3" weight="bold">
                {money(unit * qty)}
              </Text>
            </View>
          </View>
          <Button
            title={needsAnything ? `${submitLabel} · ${money(unit * qty)}` : submitLabel}
            size="lg"
            icon="cart"
            onPress={() => {
              if (!item) return;
              onSubmit({
                item,
                ...(activeVariant ? { variant: activeVariant } : {}), ...(addons.length ? { addons } : {}), ...(color ? { color } : {}), ...(size ? { size } : {}), qty, outletName });
              reset();
            }}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      }
    >
      {item ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
              <SmartImage source={item.image} name={item.name} style={{ width: 88, height: 88 }} radiusOverride={radius.md} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {module === 'food' ? <VegMark veg={Boolean(item.isVeg)} /> : null}
                <Text variant="title" weight="semibold" numberOfLines={2} style={{ flex: 1 }}>
                  {item.name}
                </Text>
              </View>
              <RatingPill value={item.rating} count={item.reviews} compact />
              <Price price={item.price} mrp={item.mrp} size="sm" />
            </View>
          </View>

          {item.description ? (
            <Text variant="bodySm" tone="muted">
              {item.description}
            </Text>
          ) : null}

          {variants.length > 0 ? (
            <OptionGroup title="Choose size / portion" required={variants.length > 1}>
              {variants.map((option) => {
                const text = label(option);
                const on = activeVariant === text;
                return (
                  <Pressable
                    key={text}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setVariant(text)}
                    style={({ pressed }) => [styles.option, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primaryFaint : c.surface, opacity: pressed ? 0.92 : 1 }]}
                  >
                    <View style={[styles.radio, { borderColor: on ? c.primary : c.borderStrong, backgroundColor: on ? c.primary : 'transparent' }]}>{on ? <Icon name="check" size={11} color={c.onPrimary} /> : null}</View>
                    <Text variant="bodySm" weight={on ? 'bold' : 'medium'} style={{ flex: 1 }}>
                      {text}
                    </Text>
                    {extra(option) > 0 ? <Tag label={`+${money(extra(option))}`} /> : <Text variant="micro" tone="faint">Included</Text>}
                  </Pressable>
                );
              })}
            </OptionGroup>
          ) : null}

          {groups.map((group) => {
            const options = group.options ?? [];
            const title = String(group.title ?? group.name ?? 'Add-ons');
            const required = Boolean(group.required);
            return (
              <OptionGroup key={title} title={title} required={required} subtitle={`Choose ${group.min && group.max ? `${group.min}–${group.max}` : group.max ? `up to ${group.max}` : 'as many as you like'}`}>
                {options.map((option) => {
                  const text = label(option);
                  const on = addons.includes(text);
                  return (
                    <Pressable
                      key={text}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() => {
                        setAddons((prev) => {
                          const next = on ? prev.filter((value) => value !== text) : [...prev, text];
                          const max = Number(group.max ?? next.length) || next.length;
                          return next.slice(0, Math.max(1, max));
                        });
                      }}
                      style={({ pressed }) => [styles.option, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primaryFaint : c.surface, opacity: pressed ? 0.92 : 1 }]}
                    >
                      <View style={[styles.box, { borderColor: on ? c.primary : c.borderStrong, backgroundColor: on ? c.primary : 'transparent' }]}>{on ? <Icon name="check" size={11} color={c.onPrimary} /> : null}</View>
                      <Text variant="bodySm" weight={on ? 'bold' : 'medium'} style={{ flex: 1 }}>
                        {text}
                      </Text>
                      {extra(option) > 0 ? <Tag label={`+${money(extra(option))}`} /> : <Text variant="micro" tone="faint">Free</Text>}
                    </Pressable>
                  );
                })}
              </OptionGroup>
            );
          })}

          {colors.length > 0 ? (
            <OptionGroup title="Colour" required>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {colors.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: color === value }}
                    onPress={() => setColor(value)}
                    style={({ pressed }) => [styles.swatch, { borderColor: color === value ? c.primary : c.border, backgroundColor: color === value ? c.primarySoft : c.surface, opacity: pressed ? 0.9 : 1 }]}
                  >
                    <Text variant="caption" weight={color === value ? 'bold' : 'medium'}>
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </OptionGroup>
          ) : null}

          {sizes.length > 0 ? (
            <OptionGroup title="Size" required>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {sizes.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: size === value }}
                    onPress={() => setSize(value)}
                    style={({ pressed }) => [styles.swatch, { borderColor: size === value ? c.primary : c.border, backgroundColor: size === value ? c.primarySoft : c.surface, opacity: pressed ? 0.9 : 1 }]}
                  >
                    <Text variant="caption" weight={size === value ? 'bold' : 'medium'}>
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </OptionGroup>
          ) : null}

          {variants.length === 0 && groups.length === 0 && colors.length === 0 && sizes.length === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.surfaceHi }}>
              <Icon name="info" size={15} color={c.textSecondary} />
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                This {module === 'food' ? 'dish' : 'product'} has no options — it goes in the cart as is.
              </Text>
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
            {(item.tags ?? []).slice(0, 8).map((tag) => (
              <Tag key={tag} label={tag} tone="muted" />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}

function OptionGroup({
  title,
  subtitle,
  required,
  children,
}: {
  title: string;
  subtitle?: string;
  required?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text variant="overline" tone="faint">
          {title.toUpperCase()}
        </Text>
        {required ? (
          <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: radius.xs, backgroundColor: c.dangerBg }}>
            <Text variant="micro" weight="semibold" color={c.danger}>
              REQUIRED
            </Text>
          </View>
        ) : null}
      </View>
      {subtitle ? (
        <Text variant="micro" tone="faint">
          {subtitle}
        </Text>
      ) : null}
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  radio: { width: 20, height: 20, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  box: { width: 20, height: 20, borderRadius: radius.xs, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  swatch: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
});
