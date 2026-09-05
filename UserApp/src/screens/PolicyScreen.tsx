import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { EmptyState, Tag } from '@/components/ui/Primitives';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { fetchPolicy, type PolicyDoc } from '@/api/app';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { Nav, Route } from '@/navigation/types';

/** Policy screens (`policy_view.dart`) — copy comes from Admin → Content pages. */
export function PolicyScreen({ route }: { navigation: Nav; route: Route<'Policy'> }): React.ReactElement {
  const c = useColors();
  const kind = route.params.kind;
  const query = useQuery<PolicyDoc>(useCallback((signal: AbortSignal) => fetchPolicy(kind, signal), [kind]), {});
  const policy = query.data;

  if (query.loading || !policy) {
    return (
      <Screen title="Policy" subtitle="Loading…" back>
        <SkeletonList rows={5} thumb={34} />
      </Screen>
    );
  }
  if (query.error) {
    return (
      <Screen title="Policy" back>
        <EmptyState icon="terms" title="Could not load this page" subtitle={query.error.message} actionLabel="Retry" onAction={() => query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen title={policy.title} subtitle={policy.updated} back>
      <View style={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.primaryFaint, borderWidth: 1, borderColor: c.border }}>
          <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={policy.icon} size={18} color={c.onPrimary} />
          </View>
          <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
            {policy.intro}
          </Text>
        </View>

        {policy.sections.map((section, index) => (
          <View key={section.heading} style={{ paddingLeft: spacing.sm, borderLeftWidth: 3, borderLeftColor: index % 2 === 0 ? c.primary : c.secondary, gap: 4 }}>
            <Text variant="subtitle" weight="semibold">
              {section.heading}
            </Text>
            <Text variant="bodySm" tone="muted">
              {section.body}
            </Text>
          </View>
        ))}

        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingTop: spacing.xs }}>
          <Tag label="Plain language" icon="info" tone="muted" />
          <Tag label="Matches the server rules" icon="shield" tone="success" />
        </View>
      </View>
    </Screen>
  );
}
