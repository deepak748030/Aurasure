import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { AppNavigator } from './navigation/AppNavigator';
import { CartProvider } from './context/CartContext';
import { AppProvider } from './context/AppContext';
import { loadAppFonts } from './lib/fonts';
import { colors } from './theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App(): React.ReactElement {
  useEffect(() => {
    loadAppFonts();
    if (Platform.OS === 'android') {
      // Edge-to-edge is always on in Expo SDK 54 / Android 16, and
      // NavigationBar.setBackgroundColorAsync() is a no-op there (it only logs
      // a warning). The root View below already paints colors.background
      // behind the transparent system bars, so the visual result is unchanged.
      NavigationBar.setButtonStyleAsync('dark').catch(() => undefined);
    }
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <CartProvider>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <AppNavigator />
            </View>
          </CartProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
