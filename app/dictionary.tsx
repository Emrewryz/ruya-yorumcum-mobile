import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, StyleSheet,
  RefreshControl, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Search, X, TrendingUp, Clock, Flame } from "lucide-react-native";
import { supabase } from "@/lib/supabase";

// Native module güvenli import
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  const ads = require("react-native-google-mobile-ads");
  BannerAd    = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds     = ads.TestIds;
} catch {
  // Expo Go
}

const BANNER_ID = TestIds
  ? (__DEV__ ? TestIds.ADAPTIVE_BANNER : (
      Platform.OS === "ios"
        ? "ca-app-pub-XXXX/YOUR_IOS_BANNER"
        : "ca-app-pub-1582674739139734/4585120564"
    ))
  : "";

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface Entry {
  id:           string;
  term:         string;
  slug:         string;
  description:  string | null;
  search_count: number;
  published_at: string | null;
}

type ListItem =
  | ({ _type: "entry" } & Entry)
  | { _type: "banner"; id: string };

function cleanTitle(t: string) {
  return t.replace(/\s*Rüyası\s*$/gi, "").trim();
}

function openDetail(entry: Entry) {
  router.push({ pathname: "/dictionary-detail", params: { slug: entry.slug, term: entry.term } });
}

function injectBanners(entries: Entry[]): ListItem[] {
  const result: ListItem[] = [];
  entries.forEach((e, i) => {
    result.push({ _type: "entry", ...e });
    if ((i + 1) % 10 === 0) {
      result.push({ _type: "banner", id: `banner-${i}` });
    }
  });
  return result;
}

// ─── Banner — native module yoksa boş render ─────────────────────────────────

function InlineBanner() {
  if (!BannerAd || !BANNER_ID) return null;
  return (
    <View style={bn.wrap}>
      <Text style={bn.label}>REKLAM</Text>
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const bn = StyleSheet.create({
  wrap:  { marginHorizontal: 16, marginVertical: 10, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0", backgroundColor: "#fafafa", alignItems: "center" },
  label: { fontSize: 9, fontWeight: "700", color: "#d4d4d8", letterSpacing: 1, paddingTop: 6, paddingBottom: 2 },
});

// ─── Popüler Kart ─────────────────────────────────────────────────────────────

function PopularCard({ item, rank }: { item: Entry; rank: number }) {
  const ct = cleanTitle(item.term);
  return (
    <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.72} style={pc.card}>
      <View style={pc.rankBadge}><Text style={pc.rankTxt}>#{rank}</Text></View>
      <Text style={pc.term} numberOfLines={2}>{ct}</Text>
      <Text style={pc.sub}>Rüyası</Text>
      <View style={pc.meta}>
        <TrendingUp size={10} color="#a1a1aa" strokeWidth={1.5} />
        <Text style={pc.metaTxt}>{item.search_count.toLocaleString("tr-TR")}</Text>
      </View>
    </TouchableOpacity>
  );
}

const pc = StyleSheet.create({
  card:      { width: 130, backgroundColor: "#fff", borderRadius: 18, padding: 16, marginRight: 10, borderWidth: 1, borderColor: "#f0f0f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  rankBadge: { alignSelf: "flex-start", backgroundColor: "#f4f4f5", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 12 },
  rankTxt:   { fontSize: 10, fontWeight: "700", color: "#71717a" },
  term:      { fontSize: 15, fontWeight: "700", color: "#18181b", lineHeight: 21, marginBottom: 2 },
  sub:       { fontSize: 12, color: "#a1a1aa", marginBottom: 10 },
  meta:      { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt:   { fontSize: 10, color: "#a1a1aa", fontWeight: "500" },
});

// ─── Satır ────────────────────────────────────────────────────────────────────

function EntryRow({ item, showCount = false }: { item: Entry; showCount?: boolean }) {
  const ct = cleanTitle(item.term);
  return (
    <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.65} style={rr.row}>
      <View style={rr.iconBox}>
        <Text style={rr.iconTxt}>{ct.charAt(0)}</Text>
      </View>
      <View style={rr.body}>
        <Text style={rr.term}>{ct} Rüyası</Text>
        {item.description && (
          <Text numberOfLines={1} style={rr.desc}>{item.description}</Text>
        )}
      </View>
      {showCount && item.search_count > 0 && (
        <View style={rr.meta}>
          <TrendingUp size={10} color="#a1a1aa" strokeWidth={1.5} />
          <Text style={rr.metaTxt}>{item.search_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const rr = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13, backgroundColor: "#fff" },
  iconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconTxt: { fontSize: 16, fontWeight: "700", color: "#52525b" },
  body:    { flex: 1 },
  term:    { fontSize: 14, fontWeight: "600", color: "#18181b", marginBottom: 2 },
  desc:    { fontSize: 12, color: "#a1a1aa", lineHeight: 17 },
  meta:    { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt: { fontSize: 11, color: "#a1a1aa", fontWeight: "500" },
});

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function DictionaryScreen() {
  const insets = useSafeAreaInsets();

  const [all,           setAll]          = useState<Entry[]>([]);
  const [popular,       setPopular]      = useState<Entry[]>([]);
  const [recentItems,   setRecentItems]  = useState<ListItem[]>([]);
  const [filteredItems, setFilteredItems]= useState<ListItem[]>([]);
  const [search,        setSearch]       = useState("");
  const [loading,       setLoading]      = useState(true);
  const [refresh,       setRefresh]      = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("dream_dictionary")
      .select("id, term, slug, description, search_count, published_at")
      .eq("is_published", true)
      .limit(2000);

    const entries = (data ?? []) as Entry[];
    setAll(entries);
    setPopular([...entries].sort((a, b) => b.search_count - a.search_count).slice(0, 20));

    const rec = [...entries]
      .sort((a, b) =>
        new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
      )
      .slice(0, 100);

    setRecentItems(injectBanners(rec));
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFilteredItems([]); return; }
    const q = search.toLowerCase().replace(/\s*rüyası/gi, "").trim();
    const results = all
      .filter((e) =>
        e.term.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
      )
      .slice(0, 60);
    setFilteredItems(injectBanners(results));
  }, [search, all]);

  const isSearching = search.trim().length > 0;

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#18181b" size="large" />
        <Text style={s.loadTxt}>Tabirler yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <X size={17} color="#52525b" strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Rüya Tabirleri</Text>
            <Text style={s.subtitle}>{all.length.toLocaleString("tr-TR")} tabir</Text>
          </View>
        </View>
        <View style={s.searchBox}>
          <Search size={15} color="#a1a1aa" strokeWidth={1.5} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rüyanda ne gördün?"
            placeholderTextColor="#a1a1aa"
            style={s.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={14} color="#a1a1aa" strokeWidth={1.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTxt}>"{search}" için sonuç bulunamadı.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            if (item._type === "banner") return <InlineBanner />;
            const next    = filteredItems[index + 1];
            const showSep = next?._type === "entry";
            return (
              <View>
                <EntryRow item={item} showCount />
                {showSep && <View style={s.sep} />}
              </View>
            );
          }}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refresh}
              onRefresh={() => { setRefresh(true); fetchData(); }}
              tintColor="#18181b"
            />
          }
        >
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Flame size={15} color="#f97316" strokeWidth={1.5} />
              <Text style={s.sectionTitle}>En Çok Okunanlar</Text>
            </View>
            <FlatList
              data={popular}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.popularList}
              renderItem={({ item, index }) => (
                <PopularCard item={item} rank={index + 1} />
              )}
            />
          </View>

          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Clock size={15} color="#6366f1" strokeWidth={1.5} />
              <Text style={s.sectionTitle}>Son Eklenenler</Text>
            </View>
            <View style={s.recentCard}>
              {recentItems.map((item, index) => {
                if (item._type === "banner") return <InlineBanner key={item.id} />;
                const next    = recentItems[index + 1];
                const showSep = next?._type === "entry";
                return (
                  <View key={item.id}>
                    <EntryRow item={item} />
                    {showSep && <View style={s.sep} />}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: "#f9f9f9" },
  loadTxt:       { fontSize: 13, color: "#a1a1aa", marginTop: 12 },
  header:        { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f4f4f5", paddingBottom: 12 },
  headerRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  backBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  title:         { fontSize: 20, fontWeight: "800", color: "#18181b" },
  subtitle:      { fontSize: 12, color: "#a1a1aa", marginTop: 1 },
  searchBox:     { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, backgroundColor: "#f4f4f5", borderRadius: 14, paddingHorizontal: 14, height: 44 },
  searchInput:   { flex: 1, fontSize: 15, color: "#18181b" },
  section:       { marginTop: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: "700", color: "#18181b" },
  popularList:   { paddingHorizontal: 20, paddingBottom: 4 },
  recentCard:    { backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0" },
  sep:           { height: 1, backgroundColor: "#f9f9f9", marginLeft: 70 },
  empty:         { padding: 48, alignItems: "center" },
  emptyTxt:      { fontSize: 14, color: "#a1a1aa", textAlign: "center" },
});