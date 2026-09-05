import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { SheetProvider } from '@/components/sheet/SheetProvider';
import { SessionProvider } from '@/context/SessionContext';
import { CartProvider } from '@/context/CartContext';
import { RootNavigator } from '@/navigation/RootNavigator';

/**
 * Provider order matters:
 *   ThemeProvider   → every surface reads colours from here
 *   SheetProvider   → replaces alert()/confirm() app-wide (bottom sheet)
 *   SessionProvider → token, user, module, address, favourites
 *   CartProvider    → per-module carts (needs the session for the user key)
 *   RootNavigator   → NavigationContainer + native stack + tabs
 */
function Shell(): React.ReactElement {
  const { resolved } = useTheme();
  return (
    <>
      {/* Status bar follows the resolved palette so the notch area never flashes white in dark mode. */}
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App(): React.ReactElement {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <SheetProvider>
            <SessionProvider>
              <CartProvider>
                <Shell />
              </CartProvider>
            </SessionProvider>
          </SheetProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
