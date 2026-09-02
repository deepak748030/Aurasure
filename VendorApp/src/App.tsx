import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './navigation/AppNavigator';
import { VendorProvider } from './context/VendorContext';
import { SystemBarHost } from './components/ui/SystemBarHost';
import { loadAppFonts } from './lib/fonts';
import { colors } from './theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App(): React.ReactElement {
  useEffect(() => {
    loadAppFonts();
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <VendorProvider>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SystemBarHost />
            <AppNavigator />
          </View>
        </VendorProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
