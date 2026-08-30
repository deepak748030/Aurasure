import * as Location from 'expo-location';

export interface PlaceResult {
  ok: boolean;
  city: string;
  /** true when the user (or the OS) refused the permission - offer a manual city. */
  denied: boolean;
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

/**
 * Asks for while-in-use permission, then resolves a human readable city.
 * Never throws and never hangs longer than `ms`, so the gate screen can always
 * fall back to the manual city list.
 */
export async function detectCity(ms = 8000): Promise<PlaceResult> {
  try {
    const perm = await withTimeout(Location.requestForegroundPermissionsAsync(), ms, null);
    if (!perm || perm.status !== 'granted') return { ok: false, city: '', denied: true };

    const last = await withTimeout(Location.getLastKnownPositionAsync({ maxAge: 1000 * 60 * 30 }), ms, null);
    const live = last ?? (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), ms, null));
    if (!live) return { ok: true, city: 'your area', denied: false };

    const [addr] = await withTimeout(
      Location.reverseGeocodeAsync({ latitude: live.coords.latitude, longitude: live.coords.longitude }),
      ms,
      [],
    );
    const city = addr?.city || addr?.subregion || addr?.district || addr?.name || 'your area';
    return { ok: true, city, denied: false };
  } catch {
    // Permission dialog unavailable (e.g. a build without the native module,
    // emulator with no mock location): fall back to manual selection.
    return { ok: false, city: '', denied: false };
  }
}

// Offline/allow-list fallbacks for the "choose your city" step.
export const POPULAR_CITIES = [
  'Indore',
  'Bhopal',
  'Raipur',
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Kolkata',
  'Jaipur',
  'Lucknow',
];

export interface CityCoords {
  latitude: number;
  longitude: number;
}

// Rough city centres used by the map picker so searching a city actually moves
// the map (and the marker) there instead of only filling the input.
export const CITY_COORDS: Record<string, CityCoords> = {
  Indore: { latitude: 22.7196, longitude: 75.8577 },
  Bhopal: { latitude: 23.2599, longitude: 77.4126 },
  Raipur: { latitude: 21.2514, longitude: 81.6296 },
  'Delhi NCR': { latitude: 28.6139, longitude: 77.209 },
  Mumbai: { latitude: 19.076, longitude: 72.8777 },
  Bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  Hyderabad: { latitude: 17.385, longitude: 78.4867 },
  Pune: { latitude: 18.5204, longitude: 73.8567 },
  Kolkata: { latitude: 22.5726, longitude: 88.3639 },
  Jaipur: { latitude: 26.9124, longitude: 75.7873 },
  Lucknow: { latitude: 26.8467, longitude: 80.9462 },
};
