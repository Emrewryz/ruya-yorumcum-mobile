import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X, ChevronRight, Clock, FlaskConical } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

// ─── Banner ID ────────────────────────────────────────────────────────────────

let BannerAdSafe: any    = null;
let BannerAdSizeSafe: any = null;
let TestIdsSafe: any     = null;

try {
  const ads        = require("react-native-google-mobile-ads");
  BannerAdSafe     = ads.BannerAd;
  BannerAdSizeSafe = ads.BannerAdSize;
  TestIdsSafe      = ads.TestIds;
} catch {}

const BANNER_ID = TestIdsSafe
  ? (__DEV__ ? TestIdsSafe.ADAPTIVE_BANNER : (
      Platform.OS === "ios"
        ? "ca-app-pub-XXXX/YOUR_IOS_BANNER"
        : "ca-app-pub-1582674739139734/4585120564"
    ))
  : "";

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface Test {
  id:          string;
  slug:        string;
  title:       string;
  description: string | null;
  created_at:  string;
  content:     { questions: { id: number }[] };
}

type ListItem =
  | ({ _type: "test" } & Test)
  | { _type: "banner"; id: string };

function injectBanners(tests: Test[]): ListItem[] {
  const result: ListItem[] = [];
  tests.forEach((t, i) => {
    result.push({ _type: "test", ...t });
    // Her 3 testten sonra banner
    if ((i + 1) % 3 === 0) {
      result.push({ _type: "banner", id: `banner-${i}` });
    }
  });
  return result;
}

// ─── Inline Banner ────────────────────────────────────────────────────────────

function InlineBanner() {
  if (!BannerAdSafe || !BANNER_ID) return null;
  return (
    <View style={bn.wrap}>
      <Text style={bn.label}>REKLAM</Text>
      <BannerAdSafe
        unitId={BANNER_ID}
        size={BannerAdSizeSafe.INLINE_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const bn = StyleSheet.create({
  wrap:  { marginVertical: 4, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0", backgroundColor: "#fafafa", alignItems: "center" },
  label: { fontSize: 9, fontWeight: "700", color: "#d4d4d8", letterSpacing: 1, paddingTop: 6, paddingBottom: 2 },
});

// ─── Test Kartı ───────────────────────────────────────────────────────────────

function TestCard({ item }: { item: Test }) {
  const qCount = item.content?.questions?.length ?? 0;
  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/test-detail", params: { slug: item.slug } })}
      activeOpacity={0.7}
      style={s.card}
    >
      <View style={s.cardHeader}>
        <View style={s.cardIcon}>
          <FlaskConical size={18} color="#18181b" strokeWidth={1.5} />
        </View>
        <View style={s.cardMeta}>
          {qCount > 0 && (
            <View style={s.metaBadge}>
              <Text style={s.metaTxt}>{qCount} soru</Text>
            </View>
          )}
          <View style={s.metaBadge}>
            <Clock size={10} color="#a1a1aa" strokeWidth={1.5} />
            <Text style={s.metaTxt}>~3 dk</Text>
          </View>
          <View style={[s.metaBadge, s.metaFree]}>
            <Text style={[s.metaTxt, s.metaFreeTxt]}>Ücretsiz</Text>
          </View>
        </View>
      </View>
      <Text style={s.cardTitle}>{item.title}</Text>
      {item.description && (
        <Text numberOfLines={2} style={s.cardDesc}>{item.description}</Text>
      )}
      <View style={s.cardFooter}>
        <Text style={s.cardAction}>Testi Başlat</Text>
        <ChevronRight size={15} color="#18181b" strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function TestsScreen() {
  const insets = useSafeAreaInsets();
  const [tests,   setTests]   = useState<Test[]>([]);
  const [items,   setItems]   = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const fetchTests = useCallback(async () => {
    const { data } = await supabase
      .from("viral_tests")
      .select("id, slug, title, description, created_at, content")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Test[];
    setTests(list);
    setItems(injectBanners(list));
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => { fetchTests(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#18181b" size="large" />
        <Text style={s.loadTxt}>Testler yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <X size={17} color="#52525b" strokeWidth={1.5} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Psikoloji Testleri</Text>
          <Text style={s.subtitle}>{tests.length} test</Text>
        </View>
        <View style={s.iconBox}>
          <FlaskConical size={19} color="#18181b" strokeWidth={1.5} />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={() => { setRefresh(true); fetchTests(); }}
            tintColor="#18181b"
          />
        }
        ListHeaderComponent={
          <View style={s.hero}>
            <Text style={s.heroTxt}>
              Bilinçaltını keşfet. Her test yaklaşık 3 dakika sürer ve ücretsizdir.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTxt}>Henüz yayınlanmış test yok.</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item._type === "banner") return <InlineBanner key={item.id} />;
          return <TestCard key={item.id} item={item} />;
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: "#f9f9f9" },
  loadTxt:     { fontSize: 13, color: "#a1a1aa", marginTop: 12 },
  header:      { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  title:       { fontSize: 20, fontWeight: "800", color: "#18181b" },
  subtitle:    { fontSize: 12, color: "#a1a1aa", marginTop: 1 },
  iconBox:     { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  list:        { padding: 16, gap: 12 },
  hero:        { backgroundColor: "#18181b", borderRadius: 16, padding: 20, marginBottom: 8 },
  heroTxt:     { fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 22 },
  card:        { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#f0f0f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cardIcon:    { width: 38, height: 38, borderRadius: 12, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  cardMeta:    { flexDirection: "row", gap: 6 },
  metaBadge:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f4f4f5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  metaTxt:     { fontSize: 11, color: "#71717a", fontWeight: "500" },
  metaFree:    { backgroundColor: "#f0fdf4" },
  metaFreeTxt: { color: "#16a34a" },
  cardTitle:   { fontSize: 17, fontWeight: "700", color: "#18181b", marginBottom: 8, lineHeight: 24 },
  cardDesc:    { fontSize: 13, color: "#71717a", lineHeight: 20, marginBottom: 16 },
  cardFooter:  { flexDirection: "row", alignItems: "center", gap: 4 },
  cardAction:  { fontSize: 14, fontWeight: "700", color: "#18181b" },
  empty:       { padding: 48, alignItems: "center" },
  emptyTxt:    { fontSize: 14, color: "#a1a1aa" },
});