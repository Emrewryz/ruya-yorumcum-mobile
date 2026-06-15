/**
 * app/credit-shop.tsx
 *
 * Reklam izle butonu buraya entegre edildi.
 * Spam koruması: 3 saat cooldown (AsyncStorage).
 * Header'daki RewardedAdButton tamamen kaldırıldı.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X, Zap, Star, Crown, ShieldCheck, Gift } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { adCooldownLabel, canWatchAd, recordAdWatch } from "@/lib/adUtils";

// ─── AdMob güvenli import ─────────────────────────────────────────────────────

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


// ─── Paketler ─────────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    key: "baslangic", icon: Zap, name: "Başlangıç",
    credits: 10, price: 39, oldPrice: null,
    badge: null,
    features: ["Temel Rüya Yorumu", "Standart İşlem Hızı"],
    url: "https://www.shopier.com/ruyayorumcumai/43928759",
  },
  {
    key: "populer", icon: Star, name: "Popüler",
    credits: 30, price: 89, oldPrice: 119,
    badge: "En Çok Tercih Edilen",
    features: ["Detaylı İslami Tahlil", "Psikolojik Analiz", "Öncelikli İşlem Sırası"],
    url: "https://www.shopier.com/ruyayorumcumai/43369308",
  },
  {
    key: "bilge", icon: Crown, name: "Bilge",
    credits: 100, price: 249, oldPrice: 390,
    badge: "En Avantajlı",
    features: ["Sınırsız Detaylı Tahlil", "Sembol Sözlüğü Erişimi", "VIP İşlem Hızı"],
    url: "https://www.shopier.com/ruyayorumcumai/43369409",
  },
];

// ─── Reklam İzle Bölümü ───────────────────────────────────────────────────────

function AdRewardSection() {
  const [adLoaded,    setAdLoaded]    = useState(false);
  const [watching,    setWatching]    = useState(false);
  const [cooldownLeft, setCooldown]   = useState<string | null>(null); // "2s 30d" formatı
  const adRef = useRef<any>(null);

  // Cooldown kontrolü
  const checkCooldown = useCallback(async () => {
    const label = await adCooldownLabel();
    setCooldown(label);
  }, []);

  useEffect(() => {
    checkCooldown();
    const interval = setInterval(checkCooldown, 30000); // 30sn'de bir kontrol
    return () => clearInterval(interval);
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
        // Krediyi yükle
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.rpc("handle_credit_transaction", {
          p_user_id:      user.id,
          p_amount:       1,
          p_process_type: "ad_reward",
          p_description:  "Reklam ödülü",
        });

        // Cooldown kaydet
        await recordAdWatch();

        setWatching(false);
        setAdLoaded(false);
        checkCooldown();

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);


        // Bir sonraki reklam için yeniden yükle
        ad.load();
      },
    );

    ad.load();

    return () => { unsubLoaded(); unsubEarned(); };
  }, []);

  const handleWatch = useCallback(async () => {
    const ok = await canWatchAd();
    if (!ok || cooldownLeft) { checkCooldown(); return; }
    if (!RewardedAd || !REWARDED_ID) {
return;
    }
    if (!adLoaded || !adRef.current) {
return;
    }
    setWatching(true);
    adRef.current.show();
  }, [adLoaded, cooldownLeft]);

  const isDisabled = !!cooldownLeft || watching;

  return (
    <View style={ad.wrap}>
      <View style={ad.left}>
        <View style={ad.iconWrap}>
          <Gift size={18} color="#18181b" strokeWidth={1.5} />
        </View>
        <View>
          <Text style={ad.title}>Ücretsiz Kredi Kazan</Text>
          <Text style={ad.sub}>
            {cooldownLeft
              ? `Sonraki reklam: ${cooldownLeft}`
              : "Kısa bir reklam izle, 1 kredi kazan"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleWatch}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[ad.btn, isDisabled && ad.btnDisabled]}
      >
        {watching
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={ad.btnTxt}>
              {cooldownLeft ? "Bekleniyor" : "İzle"}
            </Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const ad = StyleSheet.create({
  wrap:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#e4e4e7", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  left:       { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap:   { width: 38, height: 38, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  title:      { fontSize: 14, fontWeight: "600", color: "#18181b" },
  sub:        { fontSize: 11, color: "#a1a1aa", marginTop: 2 },
  btn:        { backgroundColor: "#18181b", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  btnDisabled:{ backgroundColor: "#d4d4d8" },
  btnTxt:     { fontSize: 13, fontWeight: "600", color: "#fff" },
});

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function CreditShopScreen() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Kredi Paketleri</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <X size={18} color="#52525b" strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.desc}>
          Rüyalarınızın şifresini çözmeye devam edin. İhtiyacınıza en uygun
          paketi seçin ve anında tahlil almaya başlayın.
        </Text>

        {/* Reklam izle — ücretsiz kredi */}
        <AdRewardSection />

        {/* Paket kartları */}
        {PACKAGES.map((pkg) => {
          const Icon    = pkg.icon;
          const popular = pkg.key === "populer";
          return (
            <TouchableOpacity
              key={pkg.key}
              onPress={() => Linking.openURL(pkg.url)}
              activeOpacity={0.85}
              style={[s.card, popular && s.cardPopular]}
            >
              {pkg.badge && (
                <View style={[s.badge, popular && s.badgePopular]}>
                  <Text style={[s.badgeTxt, popular && s.badgeTxtPopular]}>
                    {pkg.badge}
                  </Text>
                </View>
              )}
              <View style={s.cardRow}>
                <View style={[s.iconBox, popular && s.iconBoxPopular]}>
                  <Icon size={18} color={popular ? "#fff" : "#52525b"} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.pkgName, popular && s.pkgNamePopular]}>{pkg.name}</Text>
                  <Text style={[s.pkgSub, popular && s.pkgSubPopular]}>
                    {pkg.credits} analiz kredisi
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {pkg.oldPrice && (
                    <Text style={[s.oldPrice, popular && s.oldPricePopular]}>
                      {pkg.oldPrice}₺
                    </Text>
                  )}
                  <Text style={[s.price, popular && s.pricePopular]}>{pkg.price}₺</Text>
                  <Text style={[s.perUnit, popular && s.perUnitPopular]}>
                    {(pkg.price / pkg.credits).toFixed(1)}₺/analiz
                  </Text>
                </View>
              </View>

              <View style={[s.featureDivider, popular && s.featureDividerPopular]} />

              <View style={s.featureList}>
                {pkg.features.map((feat) => (
                  <View key={feat} style={s.featureRow}>
                    <Text style={[s.featureCheck, popular && { color: "#10b981" }]}>✓</Text>
                    <Text style={[s.featureTxt, popular && s.featureTxtPopular]}>
                      {feat}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Güven */}
        <View style={t.trustWrap}>
          <View style={t.starRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Text key={i} style={t.star}>★</Text>
            ))}
            <Text style={t.starLabel}>4.9/5 (2.000+ Değerlendirme)</Text>
          </View>
          <View style={t.shieldRow}>
            <ShieldCheck size={14} color="#10b981" strokeWidth={1.5} />
            <Text style={t.shieldTxt}>
              256-bit SSL Güvenli Ödeme · Shopier Altyapısı · Anında Teslimat
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:                { flex: 1, backgroundColor: "#fafafa" },
  header:              { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f4f4f5", backgroundColor: "#fff" },
  title:               { fontSize: 17, fontWeight: "700", color: "#18181b" },
  closeBtn:            { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#e4e4e7", alignItems: "center", justifyContent: "center" },
  content:             { padding: 20, gap: 12, paddingBottom: 80 },
  desc:                { fontSize: 14, color: "#71717a", lineHeight: 22, marginBottom: 8 },
  card:                { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardPopular:         { backgroundColor: "#18181b", borderColor: "#18181b" },
  cardRow:             { flexDirection: "row", alignItems: "center", gap: 14 },
  badge:               { position: "absolute", top: -10, right: 16, backgroundColor: "#18181b", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgePopular:        { backgroundColor: "#fff" },
  badgeTxt:            { fontSize: 10, fontWeight: "700", color: "#fff" },
  badgeTxtPopular:     { color: "#18181b" },
  iconBox:             { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#e4e4e7", alignItems: "center", justifyContent: "center" },
  iconBoxPopular:      { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)" },
  pkgName:             { fontSize: 15, fontWeight: "600", color: "#18181b" },
  pkgNamePopular:      { color: "#fff" },
  pkgSub:              { fontSize: 12, color: "#a1a1aa", marginTop: 2 },
  pkgSubPopular:       { color: "rgba(255,255,255,0.55)" },
  oldPrice:            { fontSize: 12, color: "#a1a1aa", textDecorationLine: "line-through", marginBottom: 1 },
  oldPricePopular:     { color: "rgba(255,255,255,0.4)" },
  price:               { fontSize: 20, fontWeight: "700", color: "#18181b" },
  pricePopular:        { color: "#fff" },
  perUnit:             { fontSize: 11, color: "#a1a1aa" },
  perUnitPopular:      { color: "rgba(255,255,255,0.45)" },
  featureDivider:      { height: 1, backgroundColor: "#f4f4f5", marginTop: 16, marginBottom: 14 },
  featureDividerPopular:{ backgroundColor: "rgba(255,255,255,0.12)" },
  featureList:         { gap: 9 },
  featureRow:          { flexDirection: "row", alignItems: "center", gap: 9 },
  featureCheck:        { fontSize: 13, fontWeight: "700", color: "#18181b" },
  featureTxt:          { fontSize: 13, color: "#52525b" },
  featureTxtPopular:   { color: "rgba(255,255,255,0.82)" },
});

const t = StyleSheet.create({
  trustWrap:  { alignItems: "center", marginTop: 8, gap: 10 },
  starRow:    { flexDirection: "row", alignItems: "center", gap: 4 },
  star:       { fontSize: 14, color: "#f59e0b" },
  starLabel:  { fontSize: 12, color: "#71717a", marginLeft: 2 },
  shieldRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  shieldTxt:  { fontSize: 11, color: "#a1a1aa", textAlign: "center" },
});