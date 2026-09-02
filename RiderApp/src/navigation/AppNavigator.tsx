import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import { PendingScreen } from '@/screens/onboarding/PendingScreen';
import { HomeScreen } from '@/screens/tabs/HomeScreen';
import { TasksScreen } from '@/screens/tabs/TasksScreen';
import { EarningsScreen } from '@/screens/tabs/EarningsScreen';
import { ProfileScreen } from '@/screens/tabs/ProfileScreen';
import { ActiveTaskScreen } from '@/screens/task/ActiveTaskScreen';
import { RiderTabBar } from '@/components/ui/RiderTabBar';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MainTabs(): React.ReactElement {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={(p) => <RiderTabBar {...p} />}>
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Tasks" component={TasksScreen} />
      <Tabs.Screen name="Earnings" component={EarningsScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export function AppNavigator(): React.ReactElement {
  const { rider, ready } = useRider();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.brand[600]} />
      </View>
    );
  }
  const authed = Boolean(rider);
  const live = rider?.status === 'approved';
  const waiting = authed && ['submitted', 'under_review', 'suspended'].includes(rider!.status);

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
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ActiveTask" component={ActiveTaskScreen} />
          </>
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
