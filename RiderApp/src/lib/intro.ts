import { Platform } from "react-native";

/** Persisted flag for the first-run delivery partner intro carousel. */
const KEY = "aurasure.rider.introSeen";

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

export async function readIntroSeen(): Promise<boolean> {
  const storage = webStorage();
  if (storage) return storage.getItem(KEY) === "1";
  if (Platform.OS !== "web") {
    try {
      const SecureStore = await import("expo-secure-store");
      return (await SecureStore.getItemAsync(KEY)) === "1";
    } catch {
      return false;
    }
  }
  return false;
}

export function writeIntroSeen(seen: boolean): void {
  const storage = webStorage();
  if (storage) {
    if (seen) storage.setItem(KEY, "1");
    else storage.removeItem(KEY);
    return;
  }
  if (Platform.OS !== "web") {
    void import("expo-secure-store")
      .then((SecureStore) =>
        seen ? SecureStore.setItemAsync(KEY, "1") : SecureStore.deleteItemAsync(KEY),
      )
      .catch(() => undefined);
  }
}
