import React from 'react';
import { TouchableOpacity, View, StyleSheet, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export function NotificationScreen({ navigation }: Props): React.ReactElement {
  const { rider } = useRider();

  // Build notifications from issues + incidents
  const notifications: { id: string; title: string; body: string; type: string; createdAt: string }[] = [
    ...(rider?.issues ?? []).map((i) => ({
      id: i.id,
      title: `Issue: ${i.title}`,
      body: i.body || `Status: ${i.status}`,
      type: 'issue',
      createdAt: i.createdAt,
    })),
    ...(rider?.incidents ?? []).map((i) => ({
      id: i.id,
      title: `SOS — ${i.type}`,
      body: i.note || 'Incident reported',
      type: 'sos',
      createdAt: i.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Screen
      title="Notifications"
      headerLeft={
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
          <Icon name="chevronLeft" size={26} color={colors.text} />
        </TouchableOpacity>
      }
    >
      {notifications.length === 0 ? (
        <EmptyState icon="bell" title="No notifications" subtitle="Issues, SOS alerts and system messages appear here." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          renderItem={({ item, index }) => {
            const isIssue = item.type === 'issue';
            const iconName = isIssue ? 'circleAlert' : 'shield';
            const iconColor = isIssue ? colors.warning : colors.danger;
            const iconBg = isIssue ? colors.warningBg : colors.dangerBg;
            const dateStr = new Date(item.createdAt).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            });
            const last = index === notifications.length - 1;
            return (
              <View style={[styles.row, !last && styles.divider]}>
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                  <Icon name={iconName} size={18} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="semibold">{item.title}</Text>
                  <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>{item.body}</Text>
                  <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>{dateStr}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
