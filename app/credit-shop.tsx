/**
 * app/credit-shop.tsx
 *
 * Reklam izle butonu buraya entegre edildi.
 * Spam koruması: 3 saat cooldown (AsyncStorage).
 * RevenueCat ile Google Play uygulama içi satın alım entegre edildi.
 */

import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform, ActivityIndicator, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X, Zap, Star, Crown, ShieldCheck, Gift } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { useRewardedAd } from "@/lib/useRewardedAd";
import Purchases from "react-native-purchases"; // RevenueCat eklendi

// --- RevenueCat API Anahtarı ---
const RC_API_KEY = "goog_eIBwqLHklzWSoXCWYzTzhlxTgBt";

// ─── Paketler (Google Play Product ID'leri ile) ───────────────────────────────

const PACKAGES = [
  {
    id: "paket_baslangic_10", icon: Zap, name: "Başlangıç",
    credits: 10, price: 39, oldPrice: null,
    badge: null,
    features: ["Temel Rüya Yorumu", "Standart İşlem Hızı"],
  },
  {
    id: "paket_populer_30", icon: Star, name: "Popüler",
    credits: 30, price: 89, oldPrice: 119,
    badge: "En Çok Tercih Edilen",
    features: ["Detaylı İslami Tahlil", "Psikolojik Analiz", "Öncelikli İşlem Sırası"],
  },
  {
    id: "paket_bilge_100", icon: Crown, name: "Bilge",
    credits: 100, price: 249, oldPrice: 390,
    badge: "En Avantajlı",
    features: ["Sınırsız Detaylı Tahlil", "Sembol Sözlüğü Erişimi", "VIP İşlem Hızı"],
  },
];

// ─── Reklam İzle Bölümü ───────────────────────────────────────────────────────

function AdRewardSection() {
  const { watching, cooldown: cooldownLeft, handleWatch, isDisabled } = useRewardedAd();

  return (
    <View style={adStyles.wrap}>
      <View style={adStyles.left}>
        <View style={adStyles.iconWrap}>
          <Gift size={18} color="#18181b" strokeWidth={1.5} />
        </View>
        <View>
          <Text style={adStyles.title}>Ücretsiz Kredi Kazan</Text>
          <Text style={adStyles.sub}>
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
        style={[adStyles.btn, isDisabled && adStyles.btnDisabled]}
      >
        {watching
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={adStyles.btnTxt}>
              {cooldownLeft ? "Bekleniyor" : "İzle"}
            </Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const adStyles = StyleSheet.create({
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
  const [isPurchasing, setIsPurchasing] = useState(false);

  // RevenueCat Başlatma ve Kullanıcı Tanıtma
  useEffect(() => {
    const setupPurchases = async () => {
      try {
        if (Platform.OS === "android") {
          Purchases.configure({ apiKey: RC_API_KEY });
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Satın alımların Supabase kullanıcısı ile eşleşmesi için:
          await Purchases.logIn(user.id);
        }
      } catch (error) {
        console.error("RevenueCat Setup Error:", error);
      }
    };
    setupPurchases();
  }, []);

  // Satın Alma İşlemi
  // Satın Alma İşlemi
  const handlePurchase = async (productId: string, creditAmount: number) => {
    if (isPurchasing) return;
    setIsPurchasing(true);

    try {
      // 1. RevenueCat'ten "Vitrin"i (Offerings) Çek
      const offerings = await Purchases.getOfferings();
      
      // 2. Vitrinde mevcut paketler var mı kontrol et
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        
        // 3. Tıkladığın butona (productId) ait paketi vitrinde bul
        const packageToBuy = offerings.current.availablePackages.find(
          (pkg) => pkg.product.identifier === productId
        );

        if (!packageToBuy) {
           Alert.alert("Hata", "Bu ürün şu anda vitrinde bulunamadı. Lütfen daha sonra tekrar deneyin.");
           console.log("Bulunamayan Ürün ID:", productId);
           return;
        }

        // 4. Doğrudan paketi (Package) satın al. 
        const { customerInfo } = await Purchases.purchasePackage(packageToBuy);

        // 5. Ödeme başarılıysa Supabase veritabanına krediyi işle
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc("handle_credit_transaction", {
            p_user_id:      user.id,
            p_amount:       creditAmount,
            p_process_type: "in_app_purchase",
            p_description:  `Google Play üzerinden ${creditAmount} Kredi satın alımı`,
          });

          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Teşekkürler!", `${creditAmount} kredi başarıyla hesabınıza tanımlandı.`);
        }

      } else {
        Alert.alert("Bağlantı Hatası", "Satın alma seçenekleri yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
      }

    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert("Ödeme İptal", "Satın alma işlemi tamamlanamadı veya iptal edildi.");
        console.log("REVENUECAT HATASI:", error);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Kredi Paketleri</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} disabled={isPurchasing}>
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
          const popular = pkg.id === "paket_populer_30";
          return (
            <TouchableOpacity
              key={pkg.id}
              onPress={() => handlePurchase(pkg.id, pkg.credits)}
              disabled={isPurchasing}
              activeOpacity={0.85}
              style={[s.card, popular && s.cardPopular, isPurchasing && { opacity: 0.7 }]}
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
              256-bit SSL Güvenli Ödeme · Google Play Altyapısı · Anında Teslimat
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