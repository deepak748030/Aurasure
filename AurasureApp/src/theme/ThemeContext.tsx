import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import { StorageKey, readJson, writeJson } from '@/lib/storage';
import { darkPalette, lightPalette, type Palette, type ThemeMode } from './palette';

interface ThemeValue {
  mode: ThemeMode;
  /** The mode actually in force after resolving `system`. */
  resolved: 'light' | 'dark';
  c: Palette;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export type { Palette, ThemeMode } from './palette';

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [systemDark, setSystemDark] = useState(() => Appearance.getColorScheme() === 'dark');

  useEffect(() => {
    void readJson<ThemeMode>(StorageKey.theme, 'light').then((stored) => {
      setModeState((prev) => (stored === prev ? prev : stored));
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemDark(colorScheme === 'dark');
    });
    return () => sub.remove();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void writeJson(StorageKey.theme, next);
  }, []);

  const resolved: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  const c = resolved === 'dark' ? darkPalette : lightPalette;

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      resolved,
      c,
      setMode,
      toggle: () => setMode(resolved === 'dark' ? 'light' : 'dark'),
    }),
    [mode, resolved, c, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/** Palette shortcut - most components only need the colours. */
export function useColors(): Palette {
  return useTheme().c;
}
