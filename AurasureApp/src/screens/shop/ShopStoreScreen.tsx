import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { CartButton } from '../../components/ui/CartButton';
import { SmartImage } from '../../components/ui/SmartImage';
import { Text } from '../../components/ui/Text';
import { Badge } from '../../components/ui/Badge';
import { Rating } from '../../components/ui/Rating';
import { Icon } from '@/lib/icons';
import { Grid } from '../../components/common/Grid';
import { CompactProductCard, CompactProductCardSkeleton } from '../../components/shop/CompactProductCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAppQuery } from '../../hooks/useAppQuery';
import { fetchShopStore } from '@/api/shop';
import { getProductsByStore, getStoreById } from '../../data/mock';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatCount, formatMinutes } from '@/lib/format';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Store'>;

/**
 * Store page: hero + address + rating, then ONLY the items this store sells.
 */
export function ShopStoreScreen({ route, navigation }: Props): React.ReactElement {
  const { storeId } = route.params;
  const { data, loading, refreshing, refresh } = useAppQuery(
    () => fetchShopStore(storeId),
    () => ({
      store: getStoreById(storeId),
      items: getProductsByStore(storeId),
    }),
  );

  const store = data.store;

  const header = (
    <View style={styles.topBar}>
      <BackButton onPress={() => navigation.goBack()} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <Text variant="h3" weight="bold" color={colors.text} numberOfLines={1}>
          {store?.name ?? 'Store'}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {store ? `${store.road} · ${store.city}` : ''}
        </Text>
      </View>
      <CartButton />
    </View>
  );

  return (
    <Screen header={header} refreshing={refreshing} onRefresh={refresh}>
      {store ? (
        <>
          <View style={styles.hero}>
            <SmartImage source={store.cover} placeholderIcon="store" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(11,16,32,0.02)', 'rgba(11,16,32,0.66)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBottom}>
              <Text variant="h2" weight="bold" color={colors.white}>
                {store.name}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.92)" style={{ marginTop: 2 }}>
                {store.house}, {store.road}, {store.city} - {store.pin}
              </Text>
            </View>
          </View>

          <View style={styles.metaCard}>
            <View style={styles.metaItem}>
              <Rating value={store.rating} reviews={store.reviews} size={13} />
              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                {formatCount(store.reviews)} ratings
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <View style={styles.metaIcon}>
                <Icon name="clock" size={15} color={colors.brand[700]} />
              </View>
              <Text variant="caption" color={colors.textSecondary} weight="semibold">
                {formatMinutes(store.deliveryMins)}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <View style={styles.metaIcon}>
                <Icon name="truck" size={15} color={colors.brand[700]} />
              </View>
              <Text variant="caption" color={colors.textSecondary} weight="semibold">
                {store.deliveryFee === 0 ? 'Free delivery' : `₹${store.deliveryFee} delivery`}
              </Text>
            </View>
          </View>

          <View style={styles.badgesRow}>
            {store.promo ? <Badge label={store.promo} tone="danger" icon="badgePercent" size="md" /> : null}
            {store.isNiche ? <Badge label="Niche store" tone="warning" size="md" /> : null}
            {store.tags.map((t) => (
              <Badge key={t} label={t} tone="neutral" size="md" />
            ))}
          </View>

          <View style={{ height: 26 }} />
          <SectionHeader
            title={`Items from ${store.name}`}
            subtitle={`${data.items.length} products · min order ₹${store.minOrder}`}
          />
          {loading ? (
            <Grid columns={3} gap={10} data={[1, 2, 3, 4, 5, 6]} renderItem={() => <CompactProductCardSkeleton />} />
          ) : (
            <Grid
              columns={3}
              gap={10}
              data={data.items}
              renderItem={(p) => (
                <CompactProductCard
                  product={p}
                  onPress={(product) => navigation.navigate('Product', { productId: product.id })}
                />
              )}
            />
          )}
          <View style={{ height: 8 }} />
        </>
      ) : (
        <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 40 }}>
          Store not found.
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 6,
  },
  hero: {
    position: 'relative',
    width: '100%',
    height: 176,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.brand[50],
  },
  heroBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
    paddingVertical: 12,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  metaIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
});
