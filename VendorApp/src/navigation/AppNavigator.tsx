import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useVendor } from '@/context/VendorContext';
import { colors } from '@/theme/colors';
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import { PendingScreen } from '@/screens/onboarding/PendingScreen';
import { HomeScreen } from '@/screens/tabs/HomeScreen';
import { OrdersScreen } from '@/screens/tabs/OrdersScreen';
import { MenuScreen } from '@/screens/tabs/MenuScreen';
import { MoreScreen } from '@/screens/tabs/MoreScreen';
import { VendorTabBar } from '@/components/ui/VendorTabBar';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MainTabs(): React.ReactElement {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={(p) => <VendorTabBar {...p} />}>
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Orders" component={OrdersScreen} />
      <Tabs.Screen name="Menu" component={MenuScreen} />
      <Tabs.Screen name="More" component={MoreScreen} />
    </Tabs.Navigator>
  );
}

export function AppNavigator(): React.ReactElement {
  const { vendor, ready } = useVendor();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.brand[600]} />
      </View>
    );
  }
  const authed = Boolean(vendor);
  const live = vendor?.status === 'approved';
  const waiting = authed && ['submitted', 'under_review', 'suspended'].includes(vendor!.status);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        {!authed ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : live ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : waiting ? (
          <Stack.Screen name="Pending" component={PendingScreen} />
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Pending" component={PendingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
