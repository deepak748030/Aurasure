import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  /**
   * Ask the device for a fix. Concurrent calls share one in-flight request and
   * a fresh fix (< 60s old) is reused instead of re-prompting the OS.
   */
  requestLocation: (options?: { force?: boolean }) => Promise<{ latitude: number; longitude: number } | null>;
  /** Reverse-geocode the current fix, save it as an address and select it. */
  useCurrentLocationAsAddress: () => Promise<UserAddress | null>;
  /** "20 minutes" style greeting line in the home header. */
  deliveryEtaLabel: string;
  onboarded: boolean;
  setOnboarded: (done: boolean) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** A GPS fix younger than this is reused instead of re-reading the device. */
const FIX_TTL = 60_000;

/** Shallow list compare so an unchanged fetch keeps the previous array. */
function sameAddresses(a: UserAddress[], b: UserAddress[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, index) => {
    const other = b[index];
    return (
      other != null &&
      row.id === other.id &&
      row.label === other.label &&
      row.line === other.line &&
      row.city === other.city &&
      row.pin === other.pin &&
      row.isDefault === other.isDefault &&
      row.lat === other.lat &&
      row.lng === other.lng
    );
  });
}

/** Favourite lists are small; compare them so an unchanged fetch is a no-op. */
function sameFavorites(a: FavoriteRef[], b: FavoriteRef[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, index) => row.module === b[index]?.module && row.refId === b[index]?.refId);
}

/** Value-compare the profile so a rebuilt cache object is not a new identity. */
function sameUser(a: UserProfile | null, b: UserProfile | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.wallet === b.wallet &&
    a.loyaltyPoints === b.loyaltyPoints &&
    (a.avatar?.uri ?? null) === (b.avatar?.uri ?? null) &&
    sameAddresses(a.addresses ?? [], b.addresses ?? []) &&
    sameFavorites(a.favorites ?? [], b.favorites ?? [])
  );
}

/** ~11 m — below this two fixes are the same place as far as the UI cares. */
function samePoint(
  a: { latitude: number; longitude: number } | null,
  b: { latitude: number; longitude: number } | null,
): boolean {
  if (!a || !b) return false;
  return Math.abs(a.latitude - b.latitude) < 0.0001 && Math.abs(a.longitude - b.longitude) < 0.0001;
}

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

  // Refs mirror state that the location helpers need to *read* without making
  // those callbacks change identity — an unstable `requestLocation` /
  // `loadAddresses` is what turned "use current location" into a refresh loop.
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const coordsAtRef = useRef(0);
  const inFlightRef = useRef<Promise<{ latitude: number; longitude: number } | null> | null>(null);
  const addressesRef = useRef<UserAddress[]>([]);
  const userRef = useRef<UserProfile | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  addressesRef.current = addresses;
  userRef.current = user;
  selectedIdRef.current = selectedAddressId;

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

  // `patchUser` rebuilds the cached profile object on every write, so a naive
  // `setUser(getCachedUser())` handed out a brand-new `user` identity even when
  // nothing changed — which re-ran every effect keyed on `user` (favourites,
  // addresses) and re-rendered the whole tree. Keep the previous object when
  // the profile is value-identical.
  useEffect(
    () =>
      subscribeSession(() => {
        const next = getCachedUser();
        setUser((prev) => (sameUser(prev, next) ? prev : next));
      }),
    [],
  );

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
      setUser((prev) => (sameUser(prev, fresh) ? prev : fresh));
      const nextFavorites = fresh.favorites ?? [];
      setFavorites((prev) => (sameFavorites(prev, nextFavorites) ? prev : nextFavorites));
      const nextAddresses = fresh.addresses ?? [];
      setAddresses((prev) => (sameAddresses(prev, nextAddresses) ? prev : nextAddresses));
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
    // Keep the previous array when nothing changed. `addresses` feeds the
    // context value, the header and several `useMemo` deps — handing out a new
    // array on every fetch re-rendered (and re-fetched) the whole tree.
    setAddresses((prev) => (sameAddresses(prev, list) ? prev : list));
    // The write is a side effect, so it must not live inside a state updater:
    // React may invoke updaters twice (StrictMode / concurrent re-render),
    // which persisted the address id twice per load.
    const keep = selectedIdRef.current && list.some((a) => a.id === selectedIdRef.current);
    if (!keep) {
      const fallback = list.find((a) => a.isDefault) ?? list[0] ?? null;
      const nextId = fallback?.id ?? null;
      if (nextId !== selectedIdRef.current) {
        selectedIdRef.current = nextId;
        setSelectedAddressId(nextId);
        void writeJson(StorageKey.address, nextId);
      }
    }
    return list;
  }, []);

  // Only re-run when the *identity* of the signed-in user changes. Depending on
  // the whole `user` object meant every profile refresh (wallet top-up, name
  // edit, `GET /users/me` on focus) re-fetched the address book.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    loadAddresses().catch(() => undefined);
  }, [userId, loadAddresses]);

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

  // Keyed on the user *id*, not the object: `refreshUser()` (home focus,
  // wallet top-up, profile edit) used to re-fetch the favourites on every call.
  useEffect(() => {
    if (!userId) {
      setFavorites((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    fetchFavorites()
      .then((list) => setFavorites((prev) => (sameFavorites(prev, list) ? prev : list)))
      .catch(() => undefined);
  }, [userId]);

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

  /**
   * Every "use current location" button used to fire its own permission
   * prompt + GPS read. Tapping twice (or two screens mounting at once) started
   * two OS requests, each finishing at a slightly different time, and each
   * `setCoords` re-rendered every consumer of this context — which is what the
   * "location keeps refreshing again and again" bug looked like. Now:
   *   • one in-flight promise is shared by all callers,
   *   • a fix younger than `FIX_TTL` is returned from cache without touching
   *     the GPS at all (pass `{ force: true }` to bypass),
   *   • `setCoords` only writes when the position actually moved, so an
   *     identical fix does not re-render the tree.
   */
  const requestLocation = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force === true;
    if (!force) {
      const cached = coordsRef.current;
      if (cached && Date.now() - coordsAtRef.current < FIX_TTL) return cached;
    }
    if (inFlightRef.current) return inFlightRef.current;

    const task = (async (): Promise<{ latitude: number; longitude: number } | null> => {
      setLocationStatus('asking');
      try {
        const existing = await Location.getForegroundPermissionsAsync();
        const permission = existing.granted ? existing : await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setLocationStatus('denied');
          return null;
        }
        const position = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        const current = position ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        const next = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        coordsAtRef.current = Date.now();
        setLocationStatus('granted');
        // Identical fix → keep the previous object so `coords` stays
        // referentially stable and dependent effects do not re-run.
        if (samePoint(coordsRef.current, next)) return coordsRef.current;
        coordsRef.current = next;
        setCoords(next);
        return next;
      } catch {
        setLocationStatus('unsupported');
        return null;
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = task;
    return task;
  }, []);

  /**
   * "Use current location" as a real address: reverse-geocode the fix and save
   * it (or reuse the existing saved address for the same spot) so the header
   * shows a place name instead of nothing, and the delivery address is
   * actually set. Reusing an existing pin is what stops a new duplicate row —
   * and a fresh `addresses` array — being created on every tap.
   */
  const useCurrentLocationAsAddress = useCallback(async (): Promise<UserAddress | null> => {
    const point = await requestLocation();
    if (!point) return null;

    const existing = addressesRef.current.find(
      (a) => typeof a.lat === 'number' && typeof a.lng === 'number' && samePoint({ latitude: a.lat, longitude: a.lng }, point),
    );
    if (existing) {
      setSelectedAddressId(existing.id);
      void writeJson(StorageKey.address, existing.id);
      return existing;
    }

    let line = `Near ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
    let city = '';
    let pin = '';
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: point.latitude, longitude: point.longitude });
      if (place) {
        const parts = [place.name, place.street, place.district, place.subregion].filter(
          (part): part is string => typeof part === 'string' && part.trim().length > 0,
        );
        const unique = parts.filter((part, index) => parts.indexOf(part) === index);
        if (unique.length > 0) line = unique.join(', ');
        city = place.city ?? place.subregion ?? place.region ?? '';
        pin = place.postalCode ?? '';
      }
    } catch {
      /* reverse geocoding is best-effort — the coordinates line still works */
    }

    // Not signed in: there is no server to save to, so surface the resolved
    // place through `coords` only and let the caller ask for a login.
    if (!userRef.current) return null;

    const created = await accountApi.addAddress({
      label: 'Current location',
      line,
      city: city || 'Unknown',
      pin: pin || '000000',
      isDefault: addressesRef.current.length === 0,
      lat: point.latitude,
      lng: point.longitude,
    });
    setAddresses((prev) => [...prev.filter((a) => a.id !== created.id), created]);
    setSelectedAddressId(created.id);
    void writeJson(StorageKey.address, created.id);
    return created;
  }, [requestLocation]);

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
      useCurrentLocationAsAddress,
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
      useCurrentLocationAsAddress,
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
