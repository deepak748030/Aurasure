import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { clearSession, getCachedUser, patchUser, persistSession, restoreSession, subscribeSession } from '@/api/session';
import * as authApi from '@/api/auth';
import * as accountApi from '@/api/account';
import { fetchFavorites, setFavorite } from '@/api/account';
import { fetchMe } from '@/api/account';
import { StorageKey, readJson, writeJson } from '@/lib/storage';
import type { FavoriteRef, ModuleKey, UserAddress, UserProfile } from '@/types';

/**
 * Everything "who am I + where am I + which module" related, in one provider:
 * session, wallet mirror, favourites (server-backed), chosen address, module,
 * recent searches and the location permission flow.
 */

export type LocationStatus = 'idle' | 'asking' | 'granted' | 'denied' | 'unsupported';

interface SessionValue {
  ready: boolean;
  user: UserProfile | null;
  isLoggedIn: boolean;
  /** API reachability (`GET /health`) — the offline banner + retry sheet read this. */
  online: boolean | null;
  checking: boolean;
  checkHealth: () => Promise<boolean>;

  login: (phone: string, password: string) => Promise<void>;
  register: (input: { name: string; phone: string; password: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (patch: { name?: string; email?: string; avatar?: string | null }) => Promise<void>;

  addresses: UserAddress[];
  loadAddresses: () => Promise<UserAddress[]>;
  addAddress: (input: { label: string; line: string; city: string; pin: string; isDefault?: boolean; lat?: number | null; lng?: number | null }) => Promise<UserAddress>;
  editAddress: (id: string, input: Partial<{ label: string; line: string; city: string; pin: string; isDefault?: boolean; lat?: number | null; lng?: number | null }>) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string | null) => void;
  selectedAddress: UserAddress | null;

  module: ModuleKey;
  setModule: (module: ModuleKey) => void;

  favorites: FavoriteRef[];
  isFavorite: (module: ModuleKey, refId: string) => boolean;
  toggleFavorite: (module: ModuleKey, refId: string) => Promise<boolean | null>;

  recentSearches: string[];
  pushRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;

  locationStatus: LocationStatus;
  coords: { latitude: number; longitude: number } | null;
  requestLocation: () => Promise<{ latitude: number; longitude: number } | null>;
  /** "20 minutes" style greeting line in the home header. */
  deliveryEtaLabel: string;
  onboarded: boolean;
  setOnboarded: (done: boolean) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [module, setModuleState] = useState<ModuleKey>('food');
  const [favorites, setFavorites] = useState<FavoriteRef[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [onboarded, setOnboardedState] = useState(true);

  /* ------------------------------- bootstrap ------------------------------ */

  useEffect(() => {
    let alive = true;
    (async () => {
      const restored = await restoreSession();
      if (!alive) return;
      setUser(restored);
      const [storedModule, storedSearches, storedOnboarded, storedAddressId] = await Promise.all([
        readJson<ModuleKey>(StorageKey.module, 'food'),
        readJson<string[]>(StorageKey.recentSearches, []),
        readJson<boolean>(StorageKey.onboarded, false),
        readJson<string | null>(StorageKey.address, null),
      ]);
      if (!alive) return;
      setModuleState(storedModule === 'shop' ? 'shop' : 'food');
      setRecentSearches(Array.isArray(storedSearches) ? storedSearches : []);
      setOnboardedState(Boolean(storedOnboarded));
      setSelectedAddressId(typeof storedAddressId === 'string' ? storedAddressId : null);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => subscribeSession(() => setUser(getCachedUser())), []);

  /* --------------------------------- health -------------------------------- */

  const checkHealth = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    try {
      await authApi.health();
      setOnline(true);
      return true;
    } catch {
      setOnline(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  /* ---------------------------------- auth --------------------------------- */

  const login = useCallback(async (phone: string, password: string) => {
    const result = await authApi.login(phone, password);
    await persistSession(result);
    setUser(result.user);
    setFavorites(result.user.favorites ?? []);
    setAddresses(result.user.addresses ?? []);
    const preferred = (result.user.addresses ?? []).find((a) => a.isDefault) ?? (result.user.addresses ?? [])[0];
    if (preferred) {
      setSelectedAddressId(preferred.id);
      await writeJson(StorageKey.address, preferred.id);
    }
  }, []);

  const register = useCallback(
    async (input: { name: string; phone: string; password: string; email?: string }) => {
      const result = await authApi.register(input);
      await persistSession(result);
      setUser(result.user);
      setFavorites([]);
      setAddresses(result.user.addresses ?? []);
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
    setFavorites([]);
    setAddresses([]);
    setSelectedAddressId(null);
    await writeJson(StorageKey.address, null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await fetchMe();
      await patchUser(fresh);
      setUser(fresh);
      setFavorites(fresh.favorites ?? []);
      setAddresses(fresh.addresses ?? []);
    } catch {
      /* offline - keep the cached profile */
    }
  }, []);

  const updateProfile = useCallback(async (patch: { name?: string; email?: string; avatar?: string | null }) => {
    const next = await accountApi.updateMe(patch);
    await patchUser(next);
    setUser(next);
  }, []);

  /* -------------------------------- address -------------------------------- */

  const loadAddresses = useCallback(async () => {
    const list = await accountApi.fetchAddresses();
    setAddresses(list);
    setSelectedAddressId((prev) => {
      if (prev && list.some((a) => a.id === prev)) return prev;
      const fallback = list.find((a) => a.isDefault) ?? list[0];
      void writeJson(StorageKey.address, fallback?.id ?? null);
      return fallback?.id ?? null;
    });
    return list;
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAddresses().catch(() => undefined);
  }, [user, loadAddresses]);

  const addAddress = useCallback(async (input: { label: string; line: string; city: string; pin: string; isDefault?: boolean; lat?: number | null; lng?: number | null }) => {
    const created = await accountApi.addAddress(input);
    setAddresses((prev) => (input.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) .concat(created) : [...prev, created]));
    setSelectedAddressId(created.id);
    await writeJson(StorageKey.address, created.id);
    return created;
  }, []);

  const editAddress = useCallback(
    async (id: string, input: Partial<{ label: string; line: string; city: string; pin: string; isDefault?: boolean; lat?: number | null; lng?: number | null }>) => {
      const updated = await accountApi.editAddress(id, input);
      setAddresses((prev) => {
        const next = prev.map((a) => (a.id === id ? updated : a));
        if (input.isDefault) return next.map((a) => (a.id === id ? a : { ...a, isDefault: false }));
        return next;
      });
    },
    [],
  );

  const removeAddress = useCallback(async (id: string) => {
    await accountApi.removeAddress(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setSelectedAddressId((prev) => (prev === id ? null : prev));
  }, []);

  const setSelectedAddress = useCallback((id: string | null) => {
    setSelectedAddressId(id);
    void writeJson(StorageKey.address, id);
  }, []);

  /* --------------------------------- module -------------------------------- */

  const setModule = useCallback((next: ModuleKey) => {
    setModuleState(next);
    void writeJson(StorageKey.module, next);
  }, []);

  /* -------------------------------- favourites ------------------------------ */

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    fetchFavorites()
      .then(setFavorites)
      .catch(() => undefined);
  }, [user]);

  const isFavorite = useCallback(
    (mod: ModuleKey, refId: string) => favorites.some((f) => f.module === mod && f.refId === refId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    async (mod: ModuleKey, refId: string): Promise<boolean | null> => {
      if (!user) return null;
      const liked = !isFavorite(mod, refId);
      setFavorites((prev) =>
        liked ? [...prev, { module: mod, refId }] : prev.filter((f) => !(f.module === mod && f.refId === refId)),
      );
      try {
        const next = await setFavorite(mod, refId, liked);
        setFavorites(next);
        return liked;
      } catch {
        // Roll the optimistic flip back so the heart never lies about the server.
        setFavorites((prev) =>
          liked ? prev.filter((f) => !(f.module === mod && f.refId === refId)) : [...prev, { module: mod, refId }],
        );
        return null;
      }
    },
    [user, isFavorite],
  );

  /* ------------------------------ recent searches -------------------------- */

  const pushRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
      void writeJson(StorageKey.recentSearches, next);
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    void writeJson(StorageKey.recentSearches, []);
  }, []);

  /* -------------------------------- location ------------------------------- */

  const requestLocation = useCallback(async () => {
    setLocationStatus('asking');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus('denied');
        return null;
      }
      const position = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
      const current = position ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      setLocationStatus('granted');
      return { latitude: current.coords.latitude, longitude: current.coords.longitude };
    } catch {
      setLocationStatus('unsupported');
      return null;
    }
  }, []);

  const setOnboarded = useCallback((done: boolean) => {
    setOnboardedState(done);
    void writeJson(StorageKey.onboarded, done);
  }, []);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) ?? addresses.find((a) => a.isDefault) ?? addresses[0] ?? null,
    [addresses, selectedAddressId],
  );

  const deliveryEtaLabel = useMemo(() => {
    if (!selectedAddress) return '20 minutes';
    const seed = selectedAddress.pin.length + selectedAddress.line.length;
    return `${18 + (seed % 12)} minutes`;
  }, [selectedAddress]);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      user,
      isLoggedIn: Boolean(user),
      online,
      checking,
      checkHealth,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      addresses,
      loadAddresses,
      addAddress,
      editAddress,
      removeAddress,
      selectedAddressId,
      setSelectedAddressId: setSelectedAddress,
      selectedAddress,
      module,
      setModule,
      favorites,
      isFavorite,
      toggleFavorite,
      recentSearches,
      pushRecentSearch,
      clearRecentSearches,
      locationStatus,
      coords,
      requestLocation,
      deliveryEtaLabel,
      onboarded,
      setOnboarded,
    }),
    [
      ready,
      user,
      online,
      checking,
      checkHealth,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      addresses,
      loadAddresses,
      addAddress,
      editAddress,
      removeAddress,
      selectedAddressId,
      setSelectedAddress,
      selectedAddress,
      module,
      setModule,
      favorites,
      isFavorite,
      toggleFavorite,
      recentSearches,
      pushRecentSearch,
      clearRecentSearches,
      locationStatus,
      coords,
      requestLocation,
      deliveryEtaLabel,
      onboarded,
      setOnboarded,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
