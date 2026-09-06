import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const DISMISSED_KEY = 'aurasure.inAppUpdate.dismissedVersion';
const CHECK_DELAY_MS = 1200;

type UpdateModule = typeof import('expo-in-app-updates');

export interface InAppUpdateInfo {
  /** Store version (Android versionCode) of the update Play has published. */
  storeVersion: string;
  /** A flexible update is already downloading / waiting for install. */
  updateInProgress: boolean;
  immediateAllowed: boolean;
  flexibleAllowed: boolean;
  serverUpdateType?: 'FLEXIBLE' | 'IMMEDIATE';
  serverPriority?: number;
}

export type InAppUpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'starting'
  | 'downloading'
  | 'installed';

/**
 * Google Play in-app updates only exist for apps installed from the Play Store:
 *   - Expo Go (`StoreClient`) has no Play Core and cannot use them.
 *   - `__DEV__` (local Metro / debug builds) is skipped so the prompt never pops
 *     during development; set EXPO_PUBLIC_IN_APP_UPDATE_DEBUG=1 to force a
 *     check in a debug build (the device still needs the app from Play).
 */
export function inAppUpdatesSupported(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  } catch {
    /* very old expo-constants */
  }
  try {
    if ((Constants as { appOwnership?: string }).appOwnership === 'expo') return false;
  } catch {
    /* ignore */
  }
  if (__DEV__ && process.env.EXPO_PUBLIC_IN_APP_UPDATE_DEBUG !== '1') return false;
  return true;
}

function webStorage(): Storage | null {
  try {
    if (
      Platform.OS === 'web' &&
      typeof globalThis !== 'undefined' &&
      'localStorage' in globalThis &&
      globalThis.localStorage
    ) {
      return globalThis.localStorage;
    }
  } catch {
    /* blocked storage context */
  }
  return null;
}

async function readDismissedVersion(): Promise<string | null> {
  const web = webStorage();
  if (web) return web.getItem(DISMISSED_KEY);
  if (Platform.OS !== 'web') {
    try {
      const SecureStore = await import('expo-secure-store');
      return await SecureStore.getItemAsync(DISMISSED_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

async function writeDismissedVersion(version: string): Promise<void> {
  const web = webStorage();
  if (web) {
    web.setItem(DISMISSED_KEY, version);
    return;
  }
  if (Platform.OS !== 'web') {
    try {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.setItemAsync(DISMISSED_KEY, version);
    } catch {
      /* storage failures must never crash the app */
    }
  }
}

export interface UseInAppUpdates {
  phase: InAppUpdatePhase;
  info: InAppUpdateInfo | null;
  start: () => Promise<void>;
  dismiss: () => Promise<void>;
}

/**
 * Startup gate for Google Play in-app updates.
 *
 * On launch (Android release/standalone builds only) it asks the Play Store
 * whether a newer build was published. If yes, it surfaces `available` so the
 * app can render its own in-app prompt — the partner updates WITHOUT leaving
 * the app. Update type follows the Play Console priority: priority ≥ 4 uses
 * the full-screen immediate flow, anything else downloads in the background.
 */
export function useInAppUpdates(): UseInAppUpdates {
  const [phase, setPhase] = useState<InAppUpdatePhase>('idle');
  const [info, setInfo] = useState<InAppUpdateInfo | null>(null);
  const moduleRef = useRef<UpdateModule | null>(null);
  const infoRef = useRef<InAppUpdateInfo | null>(null);

  /** Dynamic import: Expo Go / web must never evaluate requireNativeModule(). */
  const loadModule = useCallback(async (): Promise<UpdateModule | null> => {
    if (moduleRef.current) return moduleRef.current;
    try {
      const mod = await import('expo-in-app-updates');
      moduleRef.current = mod;
      return mod;
    } catch {
      return null;
    }
  }, []);


  const start = useCallback(async (): Promise<void> => {
    const mod = await loadModule();
    const current = infoRef.current;
    if (!mod || !current) return;
    setPhase('starting');
    try {
      const started = current.immediateAllowed
        ? await mod.startUpdate(true)
        : current.flexibleAllowed
          ? await mod.startUpdate(false)
          : await mod.startUpdate();
      if (!started) {
        // Play refused the flow (already in progress, etc.) — let the user retry.
        setPhase('available');
      }
    } catch {
      setPhase('available');
    }
  }, [loadModule]);

  useEffect(() => {
    if (!inAppUpdatesSupported()) return;
    let active = true;
    const timer = setTimeout(() => {
      void (async () => {
        setPhase('checking');
        const mod = await loadModule();
        if (!active || !mod) {
          if (active) setPhase('idle');
          return;
        }
        try {
          const result = await mod.checkForUpdate();
          if (!active) return;
          if (!result.updateAvailable) {
            setPhase('idle');
            return;
          }
          const next: InAppUpdateInfo = {
            storeVersion: result.storeVersion,
            updateInProgress: result.updateInProgress === true,
            immediateAllowed: result.immediateAllowed === true,
            flexibleAllowed: result.flexibleAllowed !== false,
            serverUpdateType: result.serverUpdateType,
            serverPriority: result.serverPriority,
          };
          // Ask once per published version — "Later" silences the prompt until
          // a newer build is released. Resume an in-progress flexible update.
          const dismissed = await readDismissedVersion();
          if (!next.updateInProgress && dismissed === next.storeVersion) {
            setPhase('idle');
            return;
          }
          infoRef.current = next;
          setInfo(next);
          if (next.updateInProgress) {
            // A flexible download was started earlier — resume it right away.
            setPhase('starting');
            void start();
            return;
          }
          setPhase('available');
        } catch {
          if (active) setPhase('idle');
        }
      })();
    }, CHECK_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadModule, start]);

  // Native flow events: flexible download progress, completion and cancel.
  useEffect(() => {
    if (!inAppUpdatesSupported()) return;
    let unsubscribe: (() => void) | undefined;
    void loadModule().then((mod) => {
      if (!mod) return;
      unsubscribe = mod.addUpdateListener('updateDownloaded', () => {
        setPhase('downloading');
      });
      mod.addUpdateListener('updateCompleted', () => {
        setPhase('installed');
      });
      mod.addUpdateListener('updateCancelled', () => {
        const version = infoRef.current?.storeVersion;
        if (version) void writeDismissedVersion(version);
        setPhase('idle');
      });
    });
    return () => unsubscribe?.();
  }, [loadModule]);

  const dismiss = useCallback(async (): Promise<void> => {
    const version = infoRef.current?.storeVersion;
    if (version) await writeDismissedVersion(version);
    setPhase('idle');
    setInfo(null);
  }, []);

  return { phase, info, start, dismiss };
}
