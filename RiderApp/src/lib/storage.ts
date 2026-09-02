const TOKEN = 'aurasure.rider.token';

function mem(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    /* private mode */
  }
  return null;
}

export function readToken(): string | null {
  return mem()?.getItem(TOKEN) ?? null;
}

export function writeToken(token: string | null): void {
  const s = mem();
  if (!s) return;
  if (token) s.setItem(TOKEN, token);
  else s.removeItem(TOKEN);
}
