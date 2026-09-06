import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { writeIntroSeen } from '@/lib/intro';

interface Page {
  title: string;
  subtitle: string;
  body: string;
  image: number;
}

/** Three-page partner intro, mirroring the customer app onboarding. */
const PAGES: Page[] = [
  {
    title: 'Never miss an order',
    subtitle: 'Live order pass for your outlet',
    body: 'New orders ring straight to your counter. Accept, set a prep time and hand over to the rider — every step on one board.',
    image: require('../../../assets/images/onboarding-orders.png'),
  },
  {
    title: 'Run your own storefront',
    subtitle: 'Menu, stock and prices in your hands',
    body: 'Add items with photos, change prices, pause what is out of stock and switch your outlet online or offline any time.',
    image: require('../../../assets/images/onboarding-catalogue.png'),
  },
  {
    title: 'Get paid, know your numbers',
    subtitle: 'Settlements, ratings and growth',
    body: 'Track daily sales, commissions and payouts to your bank, and watch your ratings so your outlet keeps growing.',
    image: require('../../../assets/images/onboarding-payouts.png'),
  },
];

type Nav = { replace: (name: string) => void };

export function IntroScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const listRef = useRef<FlatList<Page> | null>(null);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width));
    return () => sub.remove();
  }, []);

  const finish = (): void => {
    haptic.success();
    writeIntroSeen(true);
    navigation.replace('Welcome');
  };

  const last = index === PAGES.length - 1;

  const renderPage = ({ item }: ListRenderItemInfo<Page>) => (
    <View style={[styles.page, { width }]}>
      <View style={styles.art}>
        <View style={styles.artFrame}>
          <Image
            source={item.image}
            contentFit="contain"
            transition={180}
            style={styles.artImage}
            accessibilityLabel={item.title}
          />
        </View>
      </View>
      <View style={styles.heading}>
        <Text variant="h1" weight="bold" style={styles.center}>
          {item.title}
        </Text>
        <Text variant="subtitle" weight="semibold" color={colors.brand[600]} style={styles.center}>
          {item.subtitle}
        </Text>
      </View>
      <Text variant="body" color={colors.textSecondary} style={[styles.center, styles.body]}>
        {item.body}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={finish} hitSlop={10}>
          <Text variant="bodySm" weight="semibold" color={colors.textSecondary}>
            Skip
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef as never}
        data={PAGES}
        keyExtractor={(item) => item.title}
        renderItem={renderPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width)))
        }
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((page, i) => (
            <View
              key={page.title}
              style={[
                styles.dot,
                {
                  width: i === index ? 22 : 8,
                  backgroundColor: i === index ? colors.brand[600] : colors.borderStrong,
                },
              ]}
            />
          ))}
        </View>
        <Button
          title={last ? "Let's start" : 'Next'}
          size="lg"
          fullWidth
          rightIcon={last ? 'arrowRight' : undefined}
          onPress={() => {
            if (last) {
              finish();
              return;
            }
            haptic.light();
            listRef.current?.scrollToIndex({ index: index + 1, animated: true });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  page: { justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  art: { alignItems: 'center', marginBottom: spacing.md },
  artFrame: {
    width: 232,
    height: 232,
    borderRadius: radius.pill,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artImage: { width: 214, height: 214, borderRadius: radius.pill },
  heading: { alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm },
  center: { textAlign: 'center' },
  body: { paddingHorizontal: spacing.sm },
  footer: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: radius.pill },
});
