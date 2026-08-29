import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { TabBar } from '../components/ui/TabBar';
import { navigationRef } from './RootNavigation';
import { StatusBar } from 'expo-status-bar';

import { FoodHomeScreen } from '../screens/food/FoodHomeScreen';
import { RestaurantScreen } from '../screens/food/RestaurantScreen';
import { ShopHomeScreen } from '../screens/shop/ShopHomeScreen';
import { ProductScreen } from '../screens/shop/ProductScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { OrderDetailScreen } from '../screens/orders/OrderDetailScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

import type { FoodStackParamList, MainTabsParamList, OrdersStackParamList, ProfileStackParamList, RootStackParamList, SearchStackParamList, ShopStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const Root = createNativeStackNavigator<RootStackParamList>();
const FoodStack = createNativeStackNavigator<FoodStackParamList>();
const ShopStack = createNativeStackNavigator<ShopStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const screenOptions = { headerShown: false } as const;

function FoodNavigator(): React.ReactElement {
  return (
    <FoodStack.Navigator screenOptions={screenOptions}>
      <FoodStack.Screen name="FoodHome" component={FoodHomeScreen} />
      <FoodStack.Screen name="Restaurant" component={RestaurantScreen} />
    </FoodStack.Navigator>
  );
}

function ShopNavigator(): React.ReactElement {
  return (
    <ShopStack.Navigator screenOptions={screenOptions}>
      <ShopStack.Screen name="ShopHome" component={ShopHomeScreen} />
      <ShopStack.Screen name="Product" component={ProductScreen} />
    </ShopStack.Navigator>
  );
}

function SearchNavigator(): React.ReactElement {
  return (
    <SearchStack.Navigator screenOptions={screenOptions}>
      <SearchStack.Screen name="SearchResults" component={SearchScreen} />
    </SearchStack.Navigator>
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

function ProfileNavigator(): React.ReactElement {
  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs(): React.ReactElement {
  return (
    <Tab.Navigator
      screenOptions={screenOptions}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Food" component={FoodNavigator} />
      <Tab.Screen name="Shop" component={ShopNavigator} />
      <Tab.Screen name="Search" component={SearchNavigator} />
      <Tab.Screen name="Orders" component={OrdersNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

export function AppNavigator(): React.ReactElement {
  return (
    <NavigationContainer ref={navigationRef}>
      <Root.Navigator screenOptions={screenOptions} initialRouteName="MainTabs">
        <Root.Screen name="MainTabs" component={MainTabs} />
        <Root.Screen name="Cart" component={CartScreen} />
        <Root.Screen name="Checkout" component={CheckoutScreen} />
      </Root.Navigator>
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}
