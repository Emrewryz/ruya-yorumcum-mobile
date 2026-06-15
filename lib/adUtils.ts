/**
 * lib/adUtils.ts
 * Reklam izleme hız limiti — saatte maksimum 2 reklam.
 * AsyncStorage'da timestamp dizisi tutar.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const AD_TIMES_KEY  = "ad_watch_times";
const MAX_PER_HOUR  = 2;
const ONE_HOUR_MS   = 60 * 60 * 1000;

/** Son 1 saatteki izleme zamanlarını döner */
async function getRecentTimes(): Promise<number[]> {
  try {
    const raw  = await AsyncStorage.getItem(AD_TIMES_KEY);
    const all: number[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - ONE_HOUR_MS;
    return all.filter((t) => t > cutoff);
  } catch {
    return [];
  }
}

/** İzleme hakkı var mı? */
export async function canWatchAd(): Promise<boolean> {
  const recent = await getRecentTimes();
  return recent.length < MAX_PER_HOUR;
}

/**
 * Kalan bekleme süresini string olarak döner.
 * Hak varsa null döner.
 */
export async function adCooldownLabel(): Promise<string | null> {
  const recent = await getRecentTimes();
  if (recent.length < MAX_PER_HOUR) return null;

  // En eski izlemenin üstüne 1 saat ekle
  const nextAvailable = Math.min(...recent) + ONE_HOUR_MS;
  const remaining     = nextAvailable - Date.now();
  if (remaining <= 0) return null;

  const m = Math.ceil(remaining / 60000);
  return m > 1 ? `${m} dk` : "Az kaldı";
}

/** Reklam izlendi — timestamp kaydet */
export async function recordAdWatch(): Promise<void> {
  try {
    const recent = await getRecentTimes();
    recent.push(Date.now());
    await AsyncStorage.setItem(AD_TIMES_KEY, JSON.stringify(recent));
  } catch {}
}