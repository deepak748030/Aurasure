import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useVendor } from '@/context/VendorContext';
import { readIntroSeen } from '@/lib/intro';
import { colors } from '@/theme/colors';
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { IntroScreen } from '@/screens/onboarding/IntroScreen';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import { PendingScreen } from '@/screens/onboarding/PendingScreen';
import { HomeScreen } from '@/screens/tabs/HomeScreen';
import { OrdersScreen } from '@/screens/tabs/OrdersScreen';
import { MenuScreen } from '@/screens/tabs/MenuScreen';
import { MoreScreen } from '@/screens/tabs/MoreScreen';
import { OrderDetailScreen } from '@/screens/orders/OrderDetailScreen';
import { AddItemScreen } from '@/screens/orders/AddItemScreen';
import { BusinessScreen } from '@/screens/business/BusinessScreen';
import { OutletScreen } from '@/screens/outlet/OutletScreen';
import { MapScreen } from '@/screens/outlet/MapScreen';
import { StaffScreen } from '@/screens/staff/StaffScreen';
import { AlertsScreen } from '@/screens/settings/AlertsScreen';
import { HelpScreen } from '@/screens/settings/HelpScreen';
import { VendorTabBar } from '@/components/ui/VendorTabBar';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>(); const Tabs = createBottomTabNavigator<TabParamList>();
function MainTabs(): React.ReactElement { return <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <VendorTabBar {...props} />}><Tabs.Screen name="Home" component={HomeScreen} /><Tabs.Screen name="Orders" component={OrdersScreen} options={{ tabBarBadge: undefined }} /><Tabs.Screen name="Menu" component={MenuScreen} /><Tabs.Screen name="More" component={MoreScreen} /></Tabs.Navigator>; }
export function AppNavigator(): React.ReactElement { const { vendor, ready } = useVendor(); const [introSeen, setIntroSeen] = useState<boolean | null>(null); useEffect(() => { void readIntroSeen().then((seen) => setIntroSeen(seen)).catch(() => setIntroSeen(true)); }, []); if (!ready || introSeen === null) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.brand[600]} /></View>; const authed = Boolean(vendor); const live = vendor?.status === 'approved'; const waiting = authed && ['submitted', 'under_review', 'needs_info', 'rejected', 'suspended'].includes(vendor?.status ?? ''); return <NavigationContainer><Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade_from_bottom' }}>{!authed ? <>{!introSeen ? <Stack.Screen name="Intro" component={IntroScreen} /> : null}<Stack.Screen name="Welcome" component={WelcomeScreen} /><Stack.Screen name="Login" component={LoginScreen} /><Stack.Screen name="Register" component={RegisterScreen} /></> : live ? <><Stack.Screen name="Main" component={MainTabs} /><Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ animation: 'slide_from_right' }} /><Stack.Screen name="AddItem" component={AddItemScreen} options={{ animation: 'slide_from_bottom' }} /><Stack.Screen name="Business" component={BusinessScreen} options={{ animation: 'slide_from_right' }} /><Stack.Screen name="Outlet" component={OutletScreen} options={{ animation: 'slide_from_right' }} /><Stack.Screen name="Map" component={MapScreen} options={{ animation: 'slide_from_right' }} /><Stack.Screen name="Staff" component={StaffScreen} options={{ animation: 'slide_from_right' }} /><Stack.Screen name="Alerts" component={AlertsScreen} options={{ animation: 'slide_from_right' }} /><Stack.Screen name="Help" component={HelpScreen} options={{ animation: 'slide_from_right' }} /></> : waiting ? <><Stack.Screen name="Pending" component={PendingScreen} /><Stack.Screen name="Onboarding" component={OnboardingScreen} /></> : <Stack.Screen name="Onboarding" component={OnboardingScreen} />}</Stack.Navigator></NavigationContainer>; }
const styles = { loading: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.background } };
