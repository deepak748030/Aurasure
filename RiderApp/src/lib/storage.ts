import { Platform } from "react-native";

const TOKEN = "aurasure.rider.token";

function webStorage(): Storage | null {
  try {
    if (
      Platform.OS === "web" &&
      typeof globalThis !== "undefined" &&
      "localStorage" in globalThis &&
      globalThis.localStorage
    ) {
      return globalThis.localStorage;
    }
  } catch {
    /* private mode or a blocked browser storage context */
  }
  return null;
}

/** Synchronous web read used for instant session bootstrap. */
export function readToken(): string | null {
  return webStorage()?.getItem(TOKEN) ?? null;
}

/** Native tokens are kept in the OS secure keychain/keystore. */
export async function readTokenAsync(): Promise<string | null> {
  const storage = webStorage();
  if (storage) return storage.getItem(TOKEN);
  if (Platform.OS !== "web") {
    try {
      const SecureStore = await import("expo-secure-store");
      return await SecureStore.getItemAsync(TOKEN);
    } catch {
      return null;
    }
  }
  return null;
}

export function writeToken(token: string | null): void {
  const storage = webStorage();
  if (storage) {
    if (token) storage.setItem(TOKEN, token);
    else storage.removeItem(TOKEN);
    return;
  }
  if (Platform.OS !== "web") {
    void import("expo-secure-store").then((SecureStore) => {
      if (token) return SecureStore.setItemAsync(TOKEN, token);
      return SecureStore.deleteItemAsync(TOKEN);
    }).catch(() => undefined);
  }
}
