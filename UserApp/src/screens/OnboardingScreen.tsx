import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, View, type ListRenderItemInfo } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { useSession } from '@/context/SessionContext';
import { haptic } from '@/lib/haptics';

/** Three-page intro, same copy structure as `features/splash/onboard_view.dart`. */
const PAGES: { title: string; subtitle: string; body: string; image: number }[] = [
  {
    title: 'Discover local favourites',
    subtitle: 'Hand-picked stores near you',
    body: 'Restaurants, cloud kitchens and neighbourhood shops — verified outlets, live menus and honest ratings.',
    image: require('../../assets/images/onboarding-discover.png'),
  },
  {
    title: 'Order anywhere, anytime',
    subtitle: 'Food and daily needs in one app',
    body: 'Switch between Food and Shop without losing your cart. Schedule a slot or get it delivered as soon as possible.',
    image: require('../../assets/images/onboarding-order.png'),
  },
  {
    title: 'Track it to your door',
    subtitle: 'Live status on every order',
    body: 'Order placed → confirmed → preparing → on the way → delivered. Pay by cash or Aurasure wallet.',
    image: require('../../assets/images/onboarding-track.png'),
  },
];

export function OnboardingScreen({ navigation }: { navigation: { navigate: (name: string) => void; replace: (name: string) => void } }): React.ReactElement {
  const c = useColors();
  const { setOnboarded } = useSession();
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const listRef = useRef<FlatList<(typeof PAGES)[number]> | null>(null);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width));
    return () => sub.remove();
  }, []);

  const finish = (): void => {
    haptic.success();
    setOnboarded(true);
    navigation.replace('ModulePick');
  };

  const last = index === PAGES.length - 1;

  const renderPage = ({ item }: ListRenderItemInfo<(typeof PAGES)[number]>) => (
    <View style={{ width, paddingHorizontal: spacing.edge, justifyContent: 'center', gap: spacing.md }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <View
          style={{
            width: 176,
            height: 176,
            borderRadius: radius.pill,
            backgroundColor: c.primarySoft,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={item.image}
            contentFit="contain"
            transition={180}
            style={{ width: 164, height: 164, borderRadius: radius.pill }}
            accessibilityLabel={item.title}
          />
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg }}>
        <Text variant="h2" weight="bold" center>
          {item.title}
        </Text>
        <Text variant="subtitle" tone="primary" center weight="semibold">
          {item.subtitle}
        </Text>
      </View>
      <Text variant="body" tone="muted" center style={{ paddingHorizontal: spacing.lg }}>
        {item.body}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.edge, paddingVertical: spacing.xs }}>
        <Pressable accessibilityRole="button" onPress={finish} hitSlop={10}>
          <Text variant="bodySm" weight="semibold" color={c.textSecondary}>
            Skip
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef as never}
        data={PAGES}
        renderItem={renderPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width)))}
      />

      <View style={{ gap: spacing.md, paddingHorizontal: spacing.edge, paddingBottom: spacing.lg, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {PAGES.map((page, i) => (
            <View
              key={page.title}
              style={{
                width: i === index ? 22 : 8,
                height: 8,
                borderRadius: radius.pill,
                backgroundColor: i === index ? c.primary : c.borderStrong,
              }}
            />
          ))}
        </View>
        <Button
          label={last ? "Let's start" : 'Next'}
          size="lg"
          iconRight={last ? 'arrowRight' : undefined}
          style={{ alignSelf: 'stretch' }}
          onPress={() => {
            if (last) {
              finish();
              return;
            }
            listRef.current?.scrollToIndex({ index: index + 1, animated: true });
          }}
        />
      </View>
    </SafeAreaView>
  );
}
