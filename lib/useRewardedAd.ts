/**
 * lib/useRewardedAd.ts
 *
 * Ödüllü reklam yükleme/gösterme/kredi verme mantığının tek merkezi.
 * HeaderAdButton ve credit-shop.tsx daha önce bu mantığı ayrı ayrı
 * kopyalamıştı — biri placeholder ID'de takılı kalmış, diğerinde ID'nin
 * sonunda fazladan boşluk vardı; ikisi de production'da reklam
 * yükleyemiyordu. Artık tek kaynak burası.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { adCooldownLabel, canWatchAd, recordAdWatch } from "@/lib/adUtils";

let RewardedAd: any          = null;
let RewardedAdEventType: any = null;
let TestIds: any             = null;
try {
  const ads           = require("react-native-google-mobile-ads");
  RewardedAd           = ads.RewardedAd;
  RewardedAdEventType  = ads.RewardedAdEventType;
  TestIds              = ads.TestIds;
} catch {}

// Gerçek Android ödüllü reklam birimi ID'si.
const ANDROID_REWARDED_ID = "ca-app-pub-1582674739139734/4581251133";
// iOS için henüz gerçek bir reklam birimi tanımlanmadı — test ID'siyle devam edilir.
const IOS_REWARDED_ID: string | null = null;

function resolveRewardedId(): string {
  if (!TestIds) return "";
  if (__DEV__) return TestIds.REWARDED;
  if (Platform.OS === "ios") return IOS_REWARDED_ID ?? TestIds.REWARDED;
  return ANDROID_REWARDED_ID;
}

export function useRewardedAd(onCreditEarned?: () => void) {
  const [adLoaded, setAdLoaded] = useState(false);
  const [watching, setWatching] = useState(false);
  const [cooldown, setCooldown] = useState<string | null>(null);
  const adRef = useRef<any>(null);

  const checkCooldown = useCallback(async () => {
    setCooldown(await adCooldownLabel());
  }, []);

  useEffect(() => {
    checkCooldown();
    const t = setInterval(checkCooldown, 30_000);
    return () => clearInterval(t);
  }, [checkCooldown]);

  useEffect(() => {
    const REWARDED_ID = resolveRewardedId();
    if (!RewardedAd || !REWARDED_ID) return;

    const ad = RewardedAd.createForAdRequest(REWARDED_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    adRef.current = ad;

    const unsubLoaded = ad.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setAdLoaded(true),
    );

    const unsubEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc("handle_credit_transaction", {
            p_user_id:      user.id,
            p_amount:       1,
            p_process_type: "ad_reward",
            p_description:  "Reklam ödülü",
          });
        }
        await recordAdWatch();
        setWatching(false);
        setAdLoaded(false);
        checkCooldown();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCreditEarned?.();
        ad.load(); // sonraki için yükle
      },
    );

    ad.load();
    return () => { unsubLoaded(); unsubEarned(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWatch = useCallback(async () => {
    if (cooldown || watching) return;

    const ok = await canWatchAd();
    if (!ok) {
      setCooldown(await adCooldownLabel());
      return;
    }

    if (!RewardedAd || !adLoaded || !adRef.current) return;

    setWatching(true);
    adRef.current.show();
  }, [adLoaded, cooldown, watching]);

  return {
    adLoaded,
    watching,
    cooldown,
    handleWatch,
    isDisabled: !!cooldown || watching,
  };
}
