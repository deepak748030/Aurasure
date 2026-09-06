import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './navigation/AppNavigator';
import { RiderProvider } from './context/RiderContext';
import { PushProvider } from './context/PushContext';
import { InAppUpdateGate } from './components/InAppUpdateGate';
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
        <RiderProvider>
          <PushProvider>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <SystemBarHost />
              <AppNavigator />
              {/* Play Store in-app update gate — checks on launch and prompts inside the app. */}
              <InAppUpdateGate />
            </View>
          </PushProvider>
        </RiderProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
