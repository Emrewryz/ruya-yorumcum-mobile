/**
 * components/HeaderAdButton.tsx
 *
 * Header'daki kompakt "Ücretsiz Kredi Kazan" butonu.
 * Saatte max 2 reklam (adUtils.ts).
 * Native module yoksa (Expo Go) görünür ama reklam göstermez.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  TouchableOpacity, Text, StyleSheet,
  Platform, ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { adCooldownLabel, canWatchAd, recordAdWatch } from "@/lib/adUtils";

// AdMob güvenli import
let RewardedAd: any        = null;
let RewardedAdEventType: any = null;
let TestIds: any           = null;
try {
  const ads        = require("react-native-google-mobile-ads");
  RewardedAd       = ads.RewardedAd;
  RewardedAdEventType = ads.RewardedAdEventType;
  TestIds          = ads.TestIds;
} catch {}

const REWARDED_ID = TestIds
  ? (__DEV__ ? TestIds.REWARDED : (
      Platform.OS === "ios"
        ? "ca-app-pub-XXXX/YOUR_IOS_REWARDED"
        : "ca-app-pub-XXXX/YOUR_ANDROID_REWARDED"
    ))
  : "";

interface Props {
  onCreditEarned: () => void; // üst bileşen krediyi yeniler
}

export default function HeaderAdButton({ onCreditEarned }: Props) {
  const [adLoaded,  setAdLoaded]  = useState(false);
  const [watching,  setWatching]  = useState(false);
  const [cooldown,  setCooldown]  = useState<string | null>(null);
  const adRef = useRef<any>(null);

  // Cooldown kontrolü — her 30 sn'de bir
  const checkCooldown = useCallback(async () => {
    const label = await adCooldownLabel();
    setCooldown(label);
  }, []);

  useEffect(() => {
    checkCooldown();
    const t = setInterval(checkCooldown, 30_000);
    return () => clearInterval(t);
  }, []);

  // Rewarded Ad kurulumu
  useEffect(() => {
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
        onCreditEarned();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        ad.load(); // sonraki için yükle
      },
    );

    ad.load();
    return () => { unsubLoaded(); unsubEarned(); };
  }, []);

  const handlePress = useCallback(async () => {
    if (cooldown || watching) return;

    const ok = await canWatchAd();
    if (!ok) {
      const label = await adCooldownLabel();
      setCooldown(label);
      return;
    }

    if (!RewardedAd || !REWARDED_ID) return;
    if (!adLoaded || !adRef.current) return;

    setWatching(true);
    adRef.current.show();
  }, [adLoaded, cooldown, watching]);

  const isDisabled = !!cooldown || watching;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[s.btn, isDisabled && s.btnDisabled]}
    >
      {watching
        ? <ActivityIndicator color="#52525b" size="small" style={{ width: 14, height: 14 }} />
        : <Text style={[s.txt, isDisabled && s.txtDisabled]}>
            {cooldown ? `⏱ ${cooldown}` : "🎁 Ücretsiz Kredi"}
          </Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor:  "#fff",
    borderWidth:      1,
    borderColor:      "#e4e4e7",
    borderRadius:     999,
    paddingHorizontal: 11,
    paddingVertical:  7,
  },
  btnDisabled: {
    backgroundColor: "#f4f4f5",
    borderColor:     "#e4e4e7",
  },
  txt:        { fontSize: 11, fontWeight: "600", color: "#52525b" },
  txtDisabled:{ color: "#a1a1aa" },
});