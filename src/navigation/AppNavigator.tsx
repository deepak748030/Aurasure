import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { TabBar } from '../components/ui/TabBar';
import { navigationRef } from './RootNavigation';
import { StatusBar } from 'expo-status-bar';

import { GateScreen } from '../screens/gate/GateScreen';
import { FoodHomeScreen } from '../screens/food/FoodHomeScreen';
import { RestaurantScreen } from '../screens/food/RestaurantScreen';
import { ShopHomeScreen } from '../screens/shop/ShopHomeScreen';
import { ProductScreen } from '../screens/shop/ProductScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { LikesScreen } from '../screens/likes/LikesScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { OrderDetailScreen } from '../screens/orders/OrderDetailScreen';
import { MenuScreen } from '../screens/menu/MenuScreen';

import { useApp } from '@/context/AppContext';
import type {
  CartStackParamList,
  HomeStackParamList,
  LikesStackParamList,
  MainTabsParamList,
  MenuStackParamList,
  OrdersStackParamList,
  RootStackParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const Root = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const LikesStack = createNativeStackNavigator<LikesStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const MenuStack = createNativeStackNavigator<MenuStackParamList>();

// Completely flat: no header, no elevation, no shadow on any platform.
const screenOptions = {
  headerShown: false,
  shadowEnabled: false,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: 'transparent' },
} as const;

function HomeNavigator(): React.ReactElement {
  const { module } = useApp();
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      {module === 'food' ? (
        <HomeStack.Screen name="FoodHome" component={FoodHomeScreen} />
      ) : (
        <HomeStack.Screen name="ShopHome" component={ShopHomeScreen} />
      )}
      <HomeStack.Screen name="Restaurant" component={RestaurantScreen} />
      <HomeStack.Screen name="Product" component={ProductScreen} />
      <HomeStack.Screen name="Search" component={SearchScreen} />
    </HomeStack.Navigator>
  );
}

function LikesNavigator(): React.ReactElement {
  return (
    <LikesStack.Navigator screenOptions={screenOptions}>
      <LikesStack.Screen name="Likes" component={LikesScreen} />
    </LikesStack.Navigator>
  );
}

function CartNavigator(): React.ReactElement {
  return (
    <CartStack.Navigator screenOptions={screenOptions}>
      <CartStack.Screen name="Cart" component={CartScreen} />
      <CartStack.Screen name="Checkout" component={CheckoutScreen} />
    </CartStack.Navigator>
  );
}

function OrdersNavigator(): React.ReactElement {
  return (
    <OrdersStack.Navigator screenOptions={screenOptions}>
      <OrdersStack.Screen name="Orders" component={OrdersScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrdersStack.Navigator>
  );
}

function MenuNavigator(): React.ReactElement {
  return (
    <MenuStack.Navigator screenOptions={screenOptions}>
      <MenuStack.Screen name="Menu" component={MenuScreen} />
    </MenuStack.Navigator>
  );
}

function MainTabs(): React.ReactElement {
  return (
    <Tab.Navigator
      screenOptions={screenOptions}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Likes" component={LikesNavigator} />
      <Tab.Screen name="Cart" component={CartNavigator} />
      <Tab.Screen name="Orders" component={OrdersNavigator} />
      <Tab.Screen name="Menu" component={MenuNavigator} />
    </Tab.Navigator>
  );
}

export function AppNavigator(): React.ReactElement {
  const { gate } = useApp();
  const onboarded = gate === 'ready';

  return (
    <NavigationContainer ref={navigationRef}>
      <Root.Navigator screenOptions={screenOptions}>
        {onboarded ? (
          <Root.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <Root.Screen name="Gate" component={GateScreen} />
        )}
      </Root.Navigator>
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}
