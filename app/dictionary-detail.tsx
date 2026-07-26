import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, TrendingUp, Moon, Share2 } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { Share } from "react-native";

// ─── Native module güvenli import ────────────────────────────────────────────

let BannerAd: any    = null;
let BannerAdSize: any = null;
let TestIds: any     = null;

try {
  const ads = require("react-native-google-mobile-ads");
  BannerAd     = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds      = ads.TestIds;
} catch {
  // Expo Go — native module yok
}

const BANNER_ID = TestIds
  ? (__DEV__ ? TestIds.ADAPTIVE_BANNER : (
      Platform.OS === "ios"
        ? "ca-app-pub-XXXX/YOUR_IOS_BANNER"
        : "ca-app-pub-1582674739139734/4585120564"
    ))
  : "";

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface UltimateContent {
  psychological?:      string;
  traditional_wisdom?: {
    introduction?: string;
    pillars?: { title: string; description: string }[];
  };
  scenarios?: { title: string; meaning: string }[];
  faq?:       { question: string; answer: string }[];
}

interface EntryDetail {
  id:           string;
  term:         string;
  slug:         string;
  description:  string | null;
  content:      UltimateContent | null;
  tags:         string[] | null;
  search_count: number;
  updated_at:   string;
}

function cleanTitle(t: string) {
  return t.replace(/\s*Rüyası\s*$/gi, "").trim();
}

// ─── Bölümler arası banner — native yoksa null ────────────────────────────────

function SectionBanner() {
  if (!BannerAd || !BANNER_ID) return null;
  return (
    <View style={d.bannerWrap}>
      <Text style={d.bannerLabel}>REKLAM</Text>
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

// ─── Bölüm Başlığı ────────────────────────────────────────────────────────────

function SectionHead({ title }: { title: string }) {
  return (
    <View style={d.sectionHead}>
      <View style={d.sectionLine} />
      <Text style={d.sectionHeadTxt}>{title}</Text>
    </View>
  );
}

// ─── İçerik Renderer ─────────────────────────────────────────────────────────

function ContentBlock({ content }: { content: UltimateContent }) {
  const hasIslami   = !!content.traditional_wisdom;
  const hasPsiko    = !!content.psychological;
  const hasScenario = !!(content.scenarios?.length);
  const hasFaq      = !!(content.faq?.length);

  return (
    <View>

      {/* İslami */}
      {hasIslami && (
        <View style={d.block}>
          <SectionHead title="İslami ve Geleneksel Yorum" />
          {content.traditional_wisdom!.introduction && (
            <Text style={d.para}>{content.traditional_wisdom!.introduction}</Text>
          )}
          {content.traditional_wisdom!.pillars?.map((p, i) => (
            <View key={i} style={d.pillarCard}>
              <Text style={d.pillarTitle}>{p.title}</Text>
              <Text style={d.pillarDesc}>{p.description}</Text>
            </View>
          ))}
        </View>
      )}

      {(hasIslami || hasPsiko) && <SectionBanner />}

      {/* Psikolojik */}
      {hasPsiko && (
        <View style={d.block}>
          <SectionHead title="Psikolojik Analiz" />
          {content.psychological!.split("\n\n").filter(Boolean).map((para, i) => (
            <Text key={i} style={d.para}>{para.trim()}</Text>
          ))}
        </View>
      )}

      {hasScenario && <SectionBanner />}

      {/* Senaryolar */}
      {hasScenario && (
        <View style={d.block}>
          <SectionHead title="Rüya Senaryoları" />
          {content.scenarios!.map((sc, i) => (
            <View key={i} style={d.scenarioRow}>
              <View style={d.scenarioNum}>
                <Text style={d.scenarioNumTxt}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.scenarioTitle}>{sc.title}</Text>
                <Text style={d.scenarioMeaning}>{sc.meaning}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {hasFaq && <SectionBanner />}

      {/* SSS */}
      {hasFaq && (
        <View style={d.block}>
          <SectionHead title="Sık Sorulan Sorular" />
          {content.faq!.map((f, i) => (
            <View key={i} style={d.faqItem}>
              <Text style={d.faqQ}>{f.question}</Text>
              <Text style={d.faqA}>{f.answer}</Text>
            </View>
          ))}
        </View>
      )}

    </View>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function DictionaryDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug: string; term: string }>();

  const [entry,   setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("dream_dictionary")
        .select("id, term, slug, description, content, tags, search_count, updated_at")
        .eq("slug", params.slug)
        .eq("is_published", true)
        .single();
      setEntry(data as EntryDetail);
      if (data) {
        supabase.from("dream_dictionary")
          .update({ search_count: (data.search_count ?? 0) + 1 })
          .eq("id", data.id)
          .then(() => {});
      }
      setLoad(false);
    };
    if (params.slug) load();
  }, [params.slug]);

  const handleShare = async () => {
    if (!entry) return;
    const ct = cleanTitle(entry.term);
    try {
      await Share.share({
        message: `${ct} Rüyası ne anlama gelir? Rüya Yorumcum'da oku: https://www.ruyayorumcum.com.tr/ruya-tabirleri/${entry.slug}`,
        url:     `https://www.ruyayorumcum.com.tr/ruya-tabirleri/${entry.slug}`,
      });
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={[d.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#18181b" />
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={[d.safe, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <Text style={{ fontSize: 15, color: "#71717a", textAlign: "center" }}>Tabir bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 14, color: "#18181b", fontWeight: "600" }}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const ct         = cleanTitle(entry.term);
  const hasContent = entry.content && Object.keys(entry.content).length > 0;
  const tags       = Array.isArray(entry.tags) ? entry.tags : [];

  return (
    <SafeAreaView style={d.safe} edges={["top"]}>

      <View style={d.header}>
        <TouchableOpacity onPress={() => router.back()} style={d.headerBtn}>
          <ChevronLeft size={20} color="#18181b" strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={d.headerTitle} numberOfLines={1}>{ct} Rüyası</Text>
        <TouchableOpacity onPress={handleShare} style={d.headerBtn}>
          <Share2 size={17} color="#52525b" strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[d.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={d.titleBlock}>
          <View style={d.moonIcon}>
            <Moon size={20} color="#18181b" strokeWidth={1.5} />
          </View>
          <Text style={d.mainTitle}>{ct} Rüyası Ne Anlama Gelir?</Text>
          {entry.description && (
            <Text style={d.mainDesc}>{entry.description}</Text>
          )}
          <View style={d.metaRow}>
            {entry.search_count > 0 && (
              <View style={d.metaBadge}>
                <TrendingUp size={11} color="#71717a" strokeWidth={1.5} />
                <Text style={d.metaTxt}>{entry.search_count.toLocaleString("tr-TR")} okuma</Text>
              </View>
            )}
          </View>
          {tags.length > 0 && (
            <View style={d.tags}>
              {tags.map((tag) => (
                <View key={tag} style={d.tag}>
                  <Text style={d.tagTxt}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {hasContent
          ? <ContentBlock content={entry.content as UltimateContent} />
          : (
            <View style={d.noContent}>
              <Text style={d.noContentTxt}>
                Bu tabir için henüz detaylı içerik hazırlanmamış. Yakında eklenecek.
              </Text>
            </View>
          )
        }

        <View style={d.cta}>
          <Text style={d.ctaTitle}>{ct} rüyasını siz mi gördünüz?</Text>
          <Text style={d.ctaDesc}>
            Yapay zeka ile kişiselleştirilmiş, derinlikli yorum alın.
          </Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/", params: { prefill: `${ct} rüyası gördüm` } })}
            style={d.ctaBtn}
          >
            <Text style={d.ctaBtnTxt}>Rüyamı Analiz Et</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: "#fff" },
  header:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
  headerBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  headerTitle:     { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "600", color: "#18181b", marginHorizontal: 8 },
  content:         { paddingHorizontal: 20, paddingTop: 24 },
  titleBlock:      { marginBottom: 32 },
  moonIcon:        { width: 44, height: 44, borderRadius: 14, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  mainTitle:       { fontSize: 24, fontWeight: "800", color: "#18181b", lineHeight: 32, marginBottom: 10 },
  mainDesc:        { fontSize: 16, color: "#52525b", lineHeight: 26, marginBottom: 12 },
  metaRow:         { flexDirection: "row", gap: 8, marginBottom: 12 },
  metaBadge:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f4f4f5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  metaTxt:         { fontSize: 11, color: "#71717a", fontWeight: "500" },
  tags:            { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag:             { backgroundColor: "#f4f4f5", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  tagTxt:          { fontSize: 12, color: "#71717a", fontWeight: "500" },
  block:           { marginBottom: 28 },
  sectionHead:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionLine:     { width: 3, height: 18, backgroundColor: "#18181b", borderRadius: 2 },
  sectionHeadTxt:  { fontSize: 16, fontWeight: "700", color: "#18181b" },
  para:            { fontSize: 15, color: "#3f3f46", lineHeight: 26, marginBottom: 12 },
  pillarCard:      { backgroundColor: "#f9f9f9", borderRadius: 14, padding: 16, marginBottom: 10 },
  pillarTitle:     { fontSize: 14, fontWeight: "700", color: "#18181b", marginBottom: 6 },
  pillarDesc:      { fontSize: 14, color: "#52525b", lineHeight: 22 },
  scenarioRow:     { flexDirection: "row", gap: 12, marginBottom: 12 },
  scenarioNum:     { width: 26, height: 26, borderRadius: 999, backgroundColor: "#18181b", alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  scenarioNumTxt:  { fontSize: 11, fontWeight: "700", color: "#fff" },
  scenarioTitle:   { fontSize: 14, fontWeight: "600", color: "#18181b", marginBottom: 4 },
  scenarioMeaning: { fontSize: 14, color: "#52525b", lineHeight: 22 },
  faqItem:         { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
  faqQ:            { fontSize: 14, fontWeight: "700", color: "#18181b", marginBottom: 6 },
  faqA:            { fontSize: 14, color: "#52525b", lineHeight: 22 },
  bannerWrap:      { marginVertical: 20, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0", backgroundColor: "#fafafa", alignItems: "center" },
  bannerLabel:     { fontSize: 9, fontWeight: "700", color: "#d4d4d8", letterSpacing: 1, paddingTop: 6, paddingBottom: 2 },
  noContent:       { backgroundColor: "#f9f9f9", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 28 },
  noContentTxt:    { fontSize: 14, color: "#a1a1aa", textAlign: "center", lineHeight: 22 },
  cta:             { backgroundColor: "#f9f9f9", borderRadius: 20, padding: 20, alignItems: "center", marginTop: 12 },
  ctaTitle:        { fontSize: 16, fontWeight: "700", color: "#18181b", marginBottom: 6, textAlign: "center" },
  ctaDesc:         { fontSize: 13, color: "#71717a", textAlign: "center", marginBottom: 16, lineHeight: 20 },
  ctaBtn:          { backgroundColor: "#18181b", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  ctaBtnTxt:       { fontSize: 14, fontWeight: "600", color: "#fff" },
});