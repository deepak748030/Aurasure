import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

/**
 * `flash_sale_timer_view_widget.dart` + `timer_widget.dart`: four primary tiles
 * (days · hours · mins · sec) counting down to the end of the running window.
 * The API has no flash-sale schedule, so the window is derived on the device —
 * every 6 hours, aligned to the clock — and the label says so.
 */
export const FLASH_WINDOW_HOURS = 6;

export function flashWindowEnd(now = new Date()): Date {
  const end = new Date(now);
  const hourSlot = Math.floor(now.getHours() / FLASH_WINDOW_HOURS) * FLASH_WINDOW_HOURS + FLASH_WINDOW_HOURS;
  end.setHours(hourSlot, 0, 0, 0);
  return end;
}

function parts(target: Date, now: number) {
  const ms = Math.max(0, target.getTime() - now);
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}

export function FlashSaleTimer({ target, compact = false }: { target?: Date; compact?: boolean }): React.ReactElement {
  const c = useColors();
  const end = useMemo(() => target ?? flashWindowEnd(), [target]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = parts(end, now);
  const tiles: { value: number; unit: string }[] = [
    { value: time.days, unit: 'days' },
    { value: time.hours, unit: 'hours' },
    { value: time.minutes, unit: 'mins' },
    { value: time.seconds, unit: 'sec' },
  ];

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {tiles.map((tile, index) => (
        <React.Fragment key={tile.unit}>
          {index > 0 ? <Text variant="h3" weight="semibold" color={c.primary}>:</Text> : null}
          <View style={styles.tileWrap}>
            <View style={[styles.tile, { backgroundColor: c.primary }, compact && styles.tileCompact]}>
              <Text variant={compact ? 'caption' : 'subtitle'} weight="semibold" color={c.white}>
                {String(tile.value).padStart(2, '0')}
              </Text>
            </View>
            <Text variant="micro" color={c.primary} center>
              {tile.unit}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowCompact: { gap: 6 },
  tileWrap: { alignItems: 'center', gap: 4 },
  tile: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.sm, minWidth: 42, alignItems: 'center' },
  tileCompact: { paddingHorizontal: 6, paddingVertical: 5, minWidth: 32, borderRadius: radius.xs },
});
