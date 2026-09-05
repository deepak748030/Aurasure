import React, { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as NavigationBar from 'expo-navigation-bar';
import { AppScreen } from './bind';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

import { SplashScreen } from '@/screens/SplashScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ModulePickScreen } from '@/screens/ModulePickScreen';
import { LocationScreen } from '@/screens/LocationScreen';
import { AuthScreen } from '@/screens/AuthScreen';
import { OutletScreen } from '@/screens/OutletScreen';
import { ItemDetailScreen } from '@/screens/ItemDetailScreen';
import { CategoryScreen } from '@/screens/CategoryScreen';
import { VibeScreen } from '@/screens/VibeScreen';
import { SeeAllScreen } from '@/screens/SeeAllScreen';
import { FlashSaleScreen } from '@/screens/FlashSaleScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { CartScreen } from '@/screens/CartScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { OrderSuccessScreen } from '@/screens/OrderSuccessScreen';
import { OrderDetailScreen } from '@/screens/OrderDetailScreen';
import { TrackOrderScreen } from '@/screens/TrackOrderScreen';
import { FavoritesScreen } from '@/screens/FavoritesScreen';
import { AddressesScreen } from '@/screens/AddressesScreen';
import { AddressEditScreen } from '@/screens/AddressEditScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { EditProfileScreen } from '@/screens/EditProfileScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { LoyaltyScreen } from '@/screens/LoyaltyScreen';
import { CouponsScreen } from '@/screens/CouponsScreen';
import { ReferEarnScreen } from '@/screens/ReferEarnScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { HelpScreen } from '@/screens/HelpScreen';
import { PolicyScreen } from '@/screens/PolicyScreen';
import { PartnerScreen } from '@/screens/PartnerScreen';

import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** `aurasure://…` deep links open the matching screen. */
const linking = {
  prefixes: ['aurasure://', 'https://aurasure.app'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: '',
          Orders: 'orders',
          Favorites: 'saved',
          Cart: 'cart',
          Menu: 'menu',
        },
      },
      Outlet: 'outlet/:id',
      Item: 'item/:id',
      TrackOrder: 'track/:id',
      OrderDetail: 'order/:id',
    },
  },
};

export function RootNavigator(): React.ReactElement {
  const { resolved, c } = useTheme();
  const { checkHealth } = useSession();
  const navRef = useRef<React.ComponentRef<typeof NavigationContainer> | null>(null);

  const theme = useMemo<NavTheme>(
    () => ({
      dark: resolved === 'dark',
      fonts: {} as NavTheme['fonts'],
      colors: {
        primary: c.primary,
        background: c.bg,
        card: c.surface,
        text: c.text,
        border: c.border,
        notification: c.danger,
      },
    }),
    [resolved, c],
  );

  // Android: keep the system navigation bar in step with the app surface.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void NavigationBar.setBackgroundColorAsync(c.surface).catch(() => undefined);
    void NavigationBar.setButtonStyleAsync(resolved === 'dark' ? 'light' : 'dark').catch(() => undefined);
  }, [c.surface, resolved]);

  useEffect(() => {
    const timer = setInterval(() => void checkHealth(), 5 * 60_000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  return (
    <NavigationContainer ref={navRef} theme={theme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="Splash" component={AppScreen(SplashScreen)} options={{ animation: 'fade' }} />
        <Stack.Screen name="Onboarding" component={AppScreen(OnboardingScreen)} options={{ animation: 'fade' }} />
        <Stack.Screen name="ModulePick" component={AppScreen(ModulePickScreen)} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Location" component={AppScreen(LocationScreen)} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Auth" component={AppScreen(AuthScreen)} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Tabs" component={AppScreen(TabNavigator)} options={{ animation: 'fade' }} />

        <Stack.Screen name="Outlet" component={AppScreen(OutletScreen)} />
        <Stack.Screen name="Item" component={AppScreen(ItemDetailScreen)} />
        <Stack.Screen name="Category" component={AppScreen(CategoryScreen)} />
        <Stack.Screen name="Vibe" component={AppScreen(VibeScreen)} />
        <Stack.Screen name="SeeAll" component={AppScreen(SeeAllScreen)} />
        <Stack.Screen name="FlashSale" component={AppScreen(FlashSaleScreen)} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Search" component={AppScreen(SearchScreen)} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Cart" component={AppScreen(CartScreen)} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Checkout" component={AppScreen(CheckoutScreen)} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="OrderSuccess" component={AppScreen(OrderSuccessScreen)} options={{ animation: 'default' }} />
        <Stack.Screen name="OrderDetail" component={AppScreen(OrderDetailScreen)} />
        <Stack.Screen name="TrackOrder" component={AppScreen(TrackOrderScreen)} />
        <Stack.Screen name="Favorites" component={AppScreen(FavoritesScreen)} />
        <Stack.Screen name="Addresses" component={AppScreen(AddressesScreen)} />
        <Stack.Screen name="AddressEdit" component={AppScreen(AddressEditScreen)} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Profile" component={AppScreen(ProfileScreen)} />
        <Stack.Screen name="EditProfile" component={AppScreen(EditProfileScreen)} />
        <Stack.Screen name="Wallet" component={AppScreen(WalletScreen)} />
        <Stack.Screen name="Loyalty" component={AppScreen(LoyaltyScreen)} />
        <Stack.Screen name="Coupons" component={AppScreen(CouponsScreen)} />
        <Stack.Screen name="ReferEarn" component={AppScreen(ReferEarnScreen)} />
        <Stack.Screen name="Settings" component={AppScreen(SettingsScreen)} />
        <Stack.Screen name="Notifications" component={AppScreen(NotificationsScreen)} />
        <Stack.Screen name="Help" component={AppScreen(HelpScreen)} />
        <Stack.Screen name="Policy" component={AppScreen(PolicyScreen)} />
        <Stack.Screen name="Partner" component={AppScreen(PartnerScreen)} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
