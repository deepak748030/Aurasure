import { useCallback } from 'react';
import { useQuery, type QueryState } from './useQuery';
import { fetchAppSettings, type AppSettings } from '@/api/app';

/**
 * Cached customer-app configuration (`GET /app/settings`). Rules, presets,
 * support channels, payments, tips and trending all come from here so no
 * screen hard-codes business copy anymore. Refresh by pulling on any screen
 * that exposes it.
 */
export function useAppSettings(): QueryState<AppSettings> {
  return useQuery<AppSettings>(useCallback((signal: AbortSignal) => fetchAppSettings(signal), []), {});
}
