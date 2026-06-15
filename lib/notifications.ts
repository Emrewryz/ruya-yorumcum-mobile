/**
 * lib/notifications.ts
 * Günlük sabah bildirimi — saat 09:00
 */

import * as Notifications from "expo-notifications";
import AsyncStorage       from "@react-native-async-storage/async-storage";
import { Platform }       from "react-native";

const NOTIF_ID_KEY  = "daily_notif_id";
const NOTIF_ENABLED = "daily_notif_enabled";

// Bildirim gelince nasıl gösterilsin
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  false,
    shouldSetBadge:   false,
  }),
});

/** İzin iste — reddederse false döner */
export async function requestPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Günlük sabah bildirimi kur (09:00, her gün tekrar) */
export async function scheduleDailyNotification(): Promise<boolean> {
  const granted = await requestPermission();
  if (!granted) return false;

  // Önce varsa iptal et
  await cancelDailyNotification();

  const messages = [
    "Bu sabah ne rüya gördünüz? Hemen analiz edin! 🌙",
    "Rüyalarınız size bir şeyler söylüyor. Keşfetmeye hazır mısınız?",
    "Gece gördüğünüz rüyanın sırrını çözelim ✨",
    "Rüya Yorumcum sizi bekliyor. Bugünkü rüyanızı analiz edin!",
  ];

  // Rastgele mesaj seç
  const body = messages[Math.floor(Math.random() * messages.length)];

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🌙 Rüya Yorumcum",
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });

  await AsyncStorage.setItem(NOTIF_ID_KEY,  id);
  await AsyncStorage.setItem(NOTIF_ENABLED, "true");
  return true;
}

/** Günlük bildirimi iptal et */
export async function cancelDailyNotification(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(NOTIF_ID_KEY);
    await AsyncStorage.setItem(NOTIF_ENABLED, "false");
  } catch {}
}

/** Bildirim açık mı? */
export async function isNotificationEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIF_ENABLED);
  return val === "true";
}