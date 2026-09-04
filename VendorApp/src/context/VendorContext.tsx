import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { vendorApi, type Vendor } from '@/api/vendor';
import { logoutSession, restoreVendorSession } from '@/api/session';

interface Ctx {
  ready: boolean;
  vendor: Vendor | null;
  setVendor: (v: Vendor | null) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

const C = createContext<Ctx | null>(null);

export function VendorProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void restoreVendorSession()
      .then((v) => setVendor(v))
      .finally(() => setReady(true));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await vendorApi.me();
      setVendor(data.vendor);
    } catch {
      // network error — keep current vendor
    }
  }, []);

  const logout = useCallback(() => {
    logoutSession();
    setVendor(null);
  }, []);

  const value = useMemo(
    () => ({ ready, vendor, setVendor, refresh, logout }),
    [ready, vendor, refresh, logout],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useVendor(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useVendor used outside VendorProvider');
  return ctx;
}
