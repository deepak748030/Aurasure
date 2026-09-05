import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from './FloatingTabBar';
import { HomeFoodScreen } from '@/screens/HomeFoodScreen';
import { HomeShopScreen } from '@/screens/HomeShopScreen';
import { FavoritesScreen } from '@/screens/FavoritesScreen';
import { CartScreen } from '@/screens/CartScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { MenuScreen } from '@/screens/MenuScreen';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import type { TabName } from './types';
import type { Nav } from './types';

export type TabParamList = Record<TabName, undefined>;

const Tabs = createBottomTabNavigator<TabParamList>();

/** Home tab = the module the user picked. Food and Shop are different layouts. */
function HomeTab({ navigation }: { navigation: Nav }): React.ReactElement {
  const { module } = useSession();
  return module === 'shop' ? <HomeShopScreen navigation={navigation} /> : <HomeFoodScreen navigation={navigation} />;
}

/**
 * The reference app's bottom navigation: Home · Favourite · [cart FAB] ·
 * Orders · Menu. `FloatingTabBar` draws the pill and the raised centre button;
 * the Cart tab exists so the FAB has somewhere to land.
 */
export function TabNavigator({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <Tabs.Navigator
        id="tabs"
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: c.bg, paddingBottom: 0 },
        }}
      >
        <Tabs.Screen name="Home" component={HomeTab} />
        <Tabs.Screen name="Favorites" component={FavoritesScreen} />
        <Tabs.Screen
          name="Cart"
          component={CartScreen}
          options={{
            // Reachable only through the FAB; the pill bar never shows it.
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen name="Orders" component={OrdersScreen} />
        <Tabs.Screen name="Menu" component={MenuScreen} />
      </Tabs.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
