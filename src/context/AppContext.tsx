import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ModuleKey } from '@/types';

export type LocationStatus = 'unanswered' | 'loading' | 'granted' | 'denied';
export type GateStep = 'location' | 'module' | 'login' | 'ready';

interface AppState {
  /** Which half of the super app the user picked on the gate screen. */
  module: ModuleKey;
  setModule: (m: ModuleKey) => void;

  city: string;
  locationStatus: LocationStatus;
  setLocation: (city: string) => void;
  setLocationStatus: (s: LocationStatus) => void;

  phone: string | null;
  name: string | null;
  login: (phone: string, name?: string) => void;
  logout: () => void;

  /** Favourited ids, per module - food dishes and shop products never mix. */
  isLiked: (module: ModuleKey, id: string) => boolean;
  toggleLike: (module: ModuleKey, id: string) => boolean;
  likesFor: (module: ModuleKey) => string[];

  /** location -> module -> login -> ready */
  gate: GateStep;
  /** Back to the module picker without losing the session (Menu tab action). */
  switchModule: (m: ModuleKey) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [module, setModuleState] = useState<ModuleKey>('food');
  const [pickedModule, setPickedModule] = useState(false);
  const [city, setCity] = useState('');
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('unanswered');
  const [phone, setPhone] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<ModuleKey, string[]>>({ food: [], shop: [] });

  const setModule = useCallback((m: ModuleKey) => {
    setModuleState(m);
    setPickedModule(true);
  }, []);

  const switchModule = useCallback((m: ModuleKey) => setModuleState(m), []);

  const setLocation = useCallback((next: string) => {
    setCity(next);
    setLocationStatus('granted');
  }, []);

  const login = useCallback((nextPhone: string, nextName?: string) => {
    setPhone(nextPhone);
    setName(nextName ?? null);
  }, []);

  const logout = useCallback(() => {
    setPhone(null);
    setName(null);
    setPickedModule(false);
    setLocationStatus('unanswered');
    setCity('');
    setLikes({ food: [], shop: [] });
  }, []);

  const isLiked = useCallback((m: ModuleKey, id: string) => likes[m].includes(id), [likes]);

  const toggleLike = useCallback(
    (m: ModuleKey, id: string): boolean => {
      let nowLiked = false;
      setLikes((prev) => {
        const has = prev[m].includes(id);
        nowLiked = !has;
        return { ...prev, [m]: has ? prev[m].filter((x) => x !== id) : [...prev[m], id] };
      });
      return !likes[m].includes(id);
    },
    [likes],
  );

  const likesFor = useCallback((m: ModuleKey) => likes[m], [likes]);

  const gate = useMemo<GateStep>(() => {
    if (locationStatus === 'unanswered' || locationStatus === 'loading') return 'location';
    if (!pickedModule) return 'module';
    if (!phone) return 'login';
    return 'ready';
  }, [locationStatus, pickedModule, phone]);

  const value = useMemo<AppState>(
    () => ({
      module,
      setModule,
      city,
      locationStatus,
      setLocation,
      setLocationStatus,
      phone,
      name,
      login,
      logout,
      isLiked,
      toggleLike,
      likesFor,
      gate,
      switchModule,
    }),
    [module, setModule, city, locationStatus, setLocation, login, logout, isLiked, toggleLike, likesFor, gate, switchModule],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
