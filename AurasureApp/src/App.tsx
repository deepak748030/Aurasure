import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './navigation/AppNavigator';
import { CartProvider } from './context/CartContext';
import { AppProvider } from './context/AppContext';
import { SystemBarHost } from './components/ui/SystemBarHost';
import { loadAppFonts } from './lib/fonts';
import { colors } from './theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App(): React.ReactElement {
  useEffect(() => {
    loadAppFonts();
    // Status bar / navigation bar look lives in SystemBarHost: edge-to-edge
    // (always on in Expo SDK 54 / Android 16) makes setBackground*Async a
    // no-op, so the app paints the strips itself and only asks the host for
    // icon contrast.
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <CartProvider>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <SystemBarHost />
              <AppNavigator />
            </View>
          </CartProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
