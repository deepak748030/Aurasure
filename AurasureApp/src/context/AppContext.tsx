import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ModuleKey } from '@/types';
import { isApiEnabled } from '@/api/config';
import { fetchFavorites, syncFavorite } from '@/api/account';

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
  /** Go back one gate step (login -> module) keeping the chosen location. */
  back: () => void;
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

  const back = useCallback(() => setPickedModule(false), []);

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

  // Hydrate the wishlist from the server favourites once a session exists
  // (the demo app signs in silently when the API URL is configured).
  useEffect(() => {
    if (!phone || !isApiEnabled) return;
    let alive = true;
    fetchFavorites().then((favs) => {
      if (!alive) return;
      setLikes({
        food: favs.filter((f) => f.module === 'food').map((f) => f.refId),
        shop: favs.filter((f) => f.module === 'shop').map((f) => f.refId),
      });
    });
    return () => {
      alive = false;
    };
  }, [phone]);

  const isLiked = useCallback((m: ModuleKey, id: string) => likes[m].includes(id), [likes]);

  const toggleLike = useCallback(
    (m: ModuleKey, id: string): boolean => {
      const has = likes[m].includes(id);
      const next = !has;
      // Instant local feedback…
      setLikes((prev) => ({
        ...prev,
        [m]: next ? [...prev[m], id] : prev[m].filter((x) => x !== id),
      }));
      // …and a best-effort server sync so the like survives reloads.
      if (isApiEnabled && phone) void syncFavorite(m, id, next);
      return next;
    },
    [likes, phone],
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
      back,
    }),
    [module, setModule, city, locationStatus, setLocation, login, logout, isLiked, toggleLike, likesFor, gate, switchModule, back],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
