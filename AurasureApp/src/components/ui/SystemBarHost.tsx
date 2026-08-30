import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useSystemBars } from '@/lib/systemBars';
import { isDark } from '@/lib/color';

/**
 * Single owner of the system bars. Every screen reports its app-bar surface
 * through `useScreenBars` (see Screen); this renders it for the status bar and
 * keeps the Android navigation-bar buttons legible on top of it.
 */
export function SystemBarHost(): React.ReactElement | null {
  const bars = useSystemBars();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Edge-to-edge only lets us choose the button (back/recents/gesture pill)
    // style; the color behind it is painted by the app itself.
    NavigationBar.setButtonStyleAsync(isDark(bars.navigationBarBackground) ? 'light' : 'dark').catch(
      () => undefined,
    );
  }, [bars.navigationBarBackground]);

  return (
    <StatusBar
      style={bars.statusBarStyle}
      animated
      translucent
      backgroundColor={bars.statusBarBackground}
    />
  );
}
