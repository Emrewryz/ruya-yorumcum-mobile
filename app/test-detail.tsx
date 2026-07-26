import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, StyleSheet, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, ArrowRight, RotateCcw } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

// ─── Banner güvenli import ────────────────────────────────────────────────────

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

function ResultBanner() {
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
  wrap:  { marginVertical: 12, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0", backgroundColor: "#fafafa", alignItems: "center" },
  label: { fontSize: 9, fontWeight: "700", color: "#d4d4d8", letterSpacing: 1, paddingTop: 6, paddingBottom: 2 },
});

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface TestOption {
  label:    string;
  value:    string;
  category: string;
}
interface TestQuestion {
  id:       number;
  question: string;
  options:  TestOption[];
}
interface TestResult {
  category:    string;
  title:       string;
  description: string;
}
interface ViralTest {
  slug:        string;
  title:       string;
  description: string | null;
  content: {
    questions: TestQuestion[];
    results:   TestResult[];
  };
}

type Phase = "quiz" | "loading" | "result";

const LOADING_LINES = [
  "Yanıtların analiz ediliyor...",
  "Bilinçaltı profili oluşturuluyor...",
  "Örüntüler karşılaştırılıyor...",
  "Sonuç hazırlanıyor...",
];

function calcMode(answers: Record<number, string>): string {
  const counts: Record<string, number> = {};
  Object.values(answers).forEach((cat) => { counts[cat] = (counts[cat] ?? 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

const STORAGE_KEY = (slug: string) => `test_result_${slug}`;

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function TestDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug: string }>();
  const { slug } = params;

  const [test,     setTest]     = useState<ViralTest | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [phase,    setPhase]    = useState<Phase>("quiz");
  const [current,  setCurrent]  = useState(0);
  const [answers,  setAnswers]  = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [result,   setResult]   = useState<TestResult | null>(null);
  const [loadLine, setLoadLine] = useState(0);
  const [loadPct,  setLoadPct]  = useState(0);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("viral_tests")
        .select("slug, title, description, content")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error || !data) { setError("Test bulunamadı."); setLoading(false); return; }
      const t = data as ViralTest;
      setTest(t);

      const stored = await AsyncStorage.getItem(STORAGE_KEY(slug));
      if (stored) {
        try {
          const { category } = JSON.parse(stored);
          const saved = t.content.results.find((r) => r.category === category);
          if (saved) { setResult(saved); setPhase("result"); }
        } catch {}
      }
      setLoading(false);
    };
    if (slug) load();
  }, [slug]);

  useEffect(() => {
    if (phase !== "loading") return;
    setLoadLine(0); setLoadPct(0);
    let step = 0;
    const total    = LOADING_LINES.length;
    const interval = setInterval(() => {
      step++;
      setLoadPct(Math.round((step / total) * 100));
      if (step < total) setLoadLine(step);
      else { clearInterval(interval); setTimeout(() => setPhase("result"), 400); }
    }, 520);
    return () => clearInterval(interval);
  }, [phase]);

  const handleSelect = useCallback((value: string, category: string) => {
    if (selected || !test) return;
    setSelected(value);
    const newAnswers = { ...answers, [current]: category };
    setAnswers(newAnswers);

    setTimeout(() => {
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }).start(() => {
        if (current < test.content.questions.length - 1) {
          setCurrent((c) => c + 1);
          setSelected(null);
          slideAnim.setValue(30);
          Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
        } else {
          const dom   = calcMode(newAnswers);
          const found = test.content.results.find((r) => r.category === dom) ?? test.content.results[0];
          setResult(found);
          AsyncStorage.setItem(STORAGE_KEY(slug), JSON.stringify({ category: found.category }));
          setPhase("loading");
        }
      });
    }, 380);
  }, [selected, test, answers, current, slug]);

  const handleReset = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY(slug));
    setCurrent(0); setAnswers({}); setSelected(null);
    setResult(null); setPhase("quiz");
    slideAnim.setValue(0);
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#18181b" />
      </SafeAreaView>
    );
  }
  if (error || !test) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <Text style={{ fontSize: 14, color: "#71717a", textAlign: "center" }}>{error ?? "Test yüklenemedi."}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#18181b" }}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const q        = test.content.questions[current];
  const total    = test.content.questions.length;
  const progress = ((current + (selected ? 1 : 0)) / total) * 100;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={20} color="#18181b" strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{test.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* QUIZ */}
      {phase === "quiz" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.progressRow}>
            <Text style={s.progressTxt}>{current + 1} / {total}</Text>
            <Text style={s.progressPct}>{Math.round(progress)}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` as any }]} />
          </View>

          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            <Text style={s.scenarioLabel}>SENARYO {current + 1}</Text>
            <Text style={s.question}>{q.question}</Text>
            <View style={s.options}>
              {q.options.map((opt) => {
                const isSel    = selected === opt.value;
                const isDimmed = !!selected && !isSel;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleSelect(opt.value, opt.category)}
                    disabled={!!selected}
                    activeOpacity={0.75}
                    style={[s.option, isSel && s.optionSelected, isDimmed && s.optionDimmed]}
                  >
                    <View style={[s.optionBadge, isSel && s.optionBadgeSel, isDimmed && s.optionBadgeDim]}>
                      <Text style={[s.optionBadgeTxt, isSel && s.optionBadgeTxtSel, isDimmed && s.optionBadgeTxtDim]}>
                        {opt.value.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[s.optionTxt, isSel && s.optionTxtSel, isDimmed && s.optionTxtDim]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* LOADING */}
      {phase === "loading" && (
        <View style={s.loadingWrap}>
          <View style={s.loadingInner}>
            <ActivityIndicator color="#18181b" size="large" />
            <Text style={s.loadingLine}>{LOADING_LINES[loadLine]}</Text>
            <View style={s.loadTrack}>
              <View style={[s.loadFill, { width: `${loadPct}%` as any }]} />
            </View>
            <View style={s.loadDots}>
              {LOADING_LINES.map((_, i) => (
                <View key={i} style={[s.dot, i <= loadLine && s.dotActive]} />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* RESULT */}
      {phase === "result" && result && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Sonuç kartı */}
          <View style={s.resultCard}>
            <Text style={s.resultLabel}>SONUCUN</Text>
            <Text style={s.resultTitle}>{result.title}</Text>
            <View style={s.resultDivider} />
            <Text style={s.resultDesc}>{result.description}</Text>
          </View>

          {/* ── Banner — sonuç ile CTA arasında ── */}
          <ResultBanner />

          {/* CTA */}
          <View style={s.cta}>
            <Text style={s.ctaTitle}>Bilinçaltı örüntünü keşfettin.</Text>
            <Text style={s.ctaDesc}>Peki dün gece gördüğün rüya ne anlama geliyor?</Text>
            <TouchableOpacity
              onPress={() => router.push("/")}
              style={s.ctaBtn}
            >
              <Text style={s.ctaBtnTxt}>Ücretsiz Rüya Analizi</Text>
              <ArrowRight size={16} color="#18181b" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={s.ctaNote}>Kayıt gerekmez · İlk analiz ücretsiz</Text>
          </View>

          {/* Tekrar çöz */}
          <TouchableOpacity onPress={handleReset} style={s.resetBtn}>
            <RotateCcw size={15} color="#71717a" strokeWidth={1.5} />
            <Text style={s.resetTxt}>Testi Tekrar Çöz</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: "#fafafa" },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
  backBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  headerTitle:   { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "600", color: "#18181b", marginHorizontal: 8 },
  content:       { paddingHorizontal: 20, paddingTop: 24 },
  progressRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressTxt:   { fontSize: 12, fontWeight: "600", color: "#52525b" },
  progressPct:   { fontSize: 12, color: "#a1a1aa" },
  progressTrack: { height: 4, backgroundColor: "#e4e4e7", borderRadius: 999, overflow: "hidden", marginBottom: 32 },
  progressFill:  { height: 4, backgroundColor: "#18181b", borderRadius: 999 },
  scenarioLabel: { fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: 1.5, marginBottom: 10 },
  question:      { fontSize: 19, fontWeight: "700", color: "#18181b", lineHeight: 28, marginBottom: 28 },
  options:           { gap: 10 },
  option:            { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: "#e4e4e7", paddingVertical: 16, paddingHorizontal: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  optionSelected:    { borderColor: "#18181b", backgroundColor: "#18181b" },
  optionDimmed:      { borderColor: "#f4f4f5", backgroundColor: "#fafafa", shadowOpacity: 0 },
  optionBadge:       { width: 28, height: 28, borderRadius: 999, borderWidth: 1.5, borderColor: "#d4d4d8", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optionBadgeSel:    { borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.15)" },
  optionBadgeDim:    { borderColor: "#e4e4e7" },
  optionBadgeTxt:    { fontSize: 11, fontWeight: "700", color: "#71717a" },
  optionBadgeTxtSel: { color: "#fff" },
  optionBadgeTxtDim: { color: "#d4d4d8" },
  optionTxt:         { flex: 1, fontSize: 14, fontWeight: "500", color: "#18181b", lineHeight: 20 },
  optionTxtSel:      { color: "#fff" },
  optionTxtDim:      { color: "#c4c4c4" },
  loadingWrap:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingInner:  { alignItems: "center", gap: 20, width: "100%" },
  loadingLine:   { fontSize: 15, fontWeight: "500", color: "#52525b", textAlign: "center" },
  loadTrack:     { width: 200, height: 3, backgroundColor: "#e4e4e7", borderRadius: 999, overflow: "hidden" },
  loadFill:      { height: 3, backgroundColor: "#18181b", borderRadius: 999 },
  loadDots:      { flexDirection: "row", gap: 6 },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e4e4e7" },
  dotActive:     { width: 20, backgroundColor: "#18181b" },
  resultCard:    { backgroundColor: "#fff", borderRadius: 24, padding: 28, borderWidth: 1, borderColor: "#f0f0f0", marginBottom: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  resultLabel:   { fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: 1.5, marginBottom: 12 },
  resultTitle:   { fontSize: 26, fontWeight: "800", color: "#18181b", lineHeight: 34, marginBottom: 20 },
  resultDivider: { height: 1, backgroundColor: "#f4f4f5", marginBottom: 20 },
  resultDesc:    { fontSize: 15, color: "#52525b", lineHeight: 26 },
  cta:           { backgroundColor: "#18181b", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 12 },
  ctaTitle:      { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 6, textAlign: "center" },
  ctaDesc:       { fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 20, lineHeight: 20 },
  ctaBtn:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  ctaBtnTxt:     { fontSize: 14, fontWeight: "700", color: "#18181b" },
  ctaNote:       { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 12 },
  resetBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: "#f0f0f0" },
  resetTxt:      { fontSize: 14, fontWeight: "500", color: "#71717a" },
});