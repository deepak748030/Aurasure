import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { AppNavigator } from './navigation/AppNavigator';
import { CartProvider } from './context/CartContext';
import { loadAppFonts } from './lib/fonts';
import { colors } from './theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App(): React.ReactElement {
  useEffect(() => {
    loadAppFonts();
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(colors.background).catch(() => undefined);
      NavigationBar.setButtonStyleAsync('dark').catch(() => undefined);
    }
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CartProvider>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <AppNavigator />
          </View>
        </CartProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
