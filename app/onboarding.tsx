import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Check, ArrowRight } from "lucide-react-native";
import { supabase } from "@/lib/supabase";

// ─── Sorular ─────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id:       "yasam_evreni",
    title:    "Şu anki yaşam evreninizi nasıl tanımlarsınız?",
    subtitle: "Analizlerinizi hayat döngünüze göre kişiselleştireceğiz.",
    options: [
      { value: "egitim",  label: "Eğitim & Öğrencilik",   desc: "Gelişim, sınav, kariyer kaygısı" },
      { value: "kariyer", label: "Kariyer & İş İnşası",    desc: "Hedefler, başarı, rekabet" },
      { value: "aile",    label: "Aile & İlişki Odaklı",  desc: "Bağlar, sorumluluk, sevgi" },
      { value: "rolanti", label: "Kendi Halimde",          desc: "Durgunluk, arayış, dinlenme" },
    ],
  },
  {
    id:       "buyuk_degisim",
    title:    "Son 6 ayda sarsıcı bir değişim yaşadınız mı?",
    subtitle: "Büyük geçişler, rüyaların dilini doğrudan etkiler.",
    options: [
      { value: "evet_radikal", label: "Evet, radikal bir değişim", desc: "Yeni bir sayfa açıldı" },
      { value: "hayir_rutin",  label: "Hayır, her şey rutin",      desc: "Sakin ve öngörülebilir" },
      { value: "bekliyor",     label: "Yakında büyük bir değişim", desc: "Eşikte hissediyorum" },
    ],
  },
  {
    id:       "ruh_hali",
    title:    "Şu anki genel ruh haliniz nasıl?",
    subtitle: "Duygusal durum, sembol yorumunu doğrudan biçimlendirir.",
    options: [
      { value: "huzurlu",    label: "Huzurlu & Sakin",           desc: "İç dinginlik, denge" },
      { value: "kaygilar",   label: "Kaygılı & Stresli",         desc: "Yoğun düşünceler, endişe" },
      { value: "yorgun",     label: "Yorgun & Tükenmiş",         desc: "Düşük enerji, bıkkınlık" },
      { value: "heyecanli",  label: "Gelecek İçin Heyecanlı",   desc: "Motivasyon, umut" },
    ],
  },
  {
    id:       "zihin_mesgul",
    title:    "Zihninizi şu sıralar en çok ne meşgul ediyor?",
    subtitle: "Bilinçaltının işlediği yük, rüyalarda sembollere dönüşür.",
    options: [
      { value: "gelecek_maddi", label: "Gelecek & Maddiyat",       desc: "Para, güvence, planlama" },
      { value: "gecmis_baglar", label: "Geçmiş & Pişmanlıklar",   desc: "Eski ilişkiler, kırgınlıklar" },
      { value: "kanitlama",     label: "Kendimi Kanıtlama",        desc: "Başarı, onay alma isteği" },
      { value: "an",            label: "Hiçbiri — Anı Yaşıyorum", desc: "Şimdi ve burada" },
    ],
  },
] as const;

type QuestionId = typeof QUESTIONS[number]["id"];
type Answers    = Partial<Record<QuestionId, string>>;

// ─── Radio Kart ───────────────────────────────────────────────────────────────

function RadioCard({ option, selected, onSelect }: {
  option:   { value: string; label: string; desc: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.75}
      style={[rc.card, selected && rc.cardSel]}
    >
      <View style={[rc.check, selected && rc.checkSel]}>
        {selected && <Check size={12} color="#18181b" strokeWidth={2.5} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rc.label, selected && rc.labelSel]}>{option.label}</Text>
        <Text style={[rc.desc, selected && rc.descSel]}>{option.desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

const rc = StyleSheet.create({
  card:     { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e4e4e7", borderRadius: 14, padding: 16 },
  cardSel:  { borderColor: "#18181b", backgroundColor: "#18181b" },
  check:    { width: 22, height: 22, borderRadius: 999, borderWidth: 1.5, borderColor: "#d4d4d8", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkSel: { borderColor: "#fff", backgroundColor: "#fff" },
  label:    { fontSize: 14, fontWeight: "600", color: "#18181b", marginBottom: 2 },
  labelSel: { color: "#fff" },
  desc:     { fontSize: 12, color: "#a1a1aa" },
  descSel:  { color: "rgba(255,255,255,0.6)" },
});

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets  = useSafeAreaInsets();
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const answered  = Object.keys(answers).filter((k) => answers[k as QuestionId]).length;
  const progress  = (answered / QUESTIONS.length) * 100;
  const allDone   = answered === QUESTIONS.length;

  const handleSelect = (qId: QuestionId, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSkip = () => router.replace("/");

  const handleSubmit = async () => {
    setSaving(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Kullanıcı bulunamadı.");
      const { error: e } = await supabase.from("profiles")
        .update({ personalization_data: answers })
        .eq("id", user.id);
      if (e) throw e;
      router.replace("/");
    } catch (e: any) {
      setError(e?.message ?? "Kaydedilemedi. Tekrar deneyin.");
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress}%` as any }]} />
      </View>

      {/* Atla */}
      <TouchableOpacity onPress={handleSkip} style={[s.skipBtn, { top: insets.top + 12 }]}>
        <Text style={s.skipTxt}>Şimdilik Atla</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>KİŞİSEL RÜYA PROFİLİ</Text>
          <Text style={s.heroTitle}>Daha derin bir analiz için{"\n"}sizi tanıyalım.</Text>
          <Text style={s.heroSub}>
            Yanıtlarınız yalnızca rüya analizlerinizi kişiselleştirmek için kullanılır.
          </Text>
        </View>

        {/* Sorular */}
        {QUESTIONS.map((q, qi) => (
          <View key={q.id} style={s.questionBlock}>
            {/* Numara çizgisi */}
            <View style={s.qNumRow}>
              <Text style={s.qNum}>{String(qi + 1).padStart(2, "0")}</Text>
              <View style={s.qLine} />
            </View>
            <Text style={s.qTitle}>{q.title}</Text>
            <Text style={s.qSub}>{q.subtitle}</Text>
            <View style={s.options}>
              {q.options.map((opt) => (
                <RadioCard
                  key={opt.value}
                  option={opt}
                  selected={answers[q.id] === opt.value}
                  onSelect={() => handleSelect(q.id, opt.value)}
                />
              ))}
            </View>
          </View>
        ))}

        {error && <Text style={s.errorTxt}>{error}</Text>}

        {/* Kaydet */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!allDone || saving}
          style={[s.submitBtn, (!allDone || saving) && { opacity: 0.35 }]}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Text style={s.submitTxt}>Profilimi Tamamla</Text>
                <ArrowRight size={17} color="#fff" strokeWidth={2} />
              </>
          }
        </TouchableOpacity>

        {!allDone && (
          <Text style={s.progressNote}>
            Devam etmek için tüm soruları yanıtlayın ({answered}/{QUESTIONS.length})
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: "#fafafa" },
  progressTrack: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: "#e4e4e7", zIndex: 10 },
  progressFill:  { height: 3, backgroundColor: "#18181b" },
  skipBtn:       { position: "absolute", right: 20, zIndex: 20 },
  skipTxt:       { fontSize: 14, color: "#a1a1aa", fontWeight: "500" },
  content:       { paddingHorizontal: 20, paddingTop: 56 },
  hero:          { marginBottom: 36 },
  heroLabel:     { fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: 1.5, marginBottom: 10 },
  heroTitle:     { fontSize: 24, fontWeight: "800", color: "#18181b", lineHeight: 32, marginBottom: 10 },
  heroSub:       { fontSize: 13, color: "#71717a", lineHeight: 20 },
  questionBlock: { marginBottom: 36 },
  qNumRow:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  qNum:          { fontSize: 12, fontWeight: "800", color: "#d4d4d8" },
  qLine:         { flex: 1, height: 1, backgroundColor: "#f0f0f0" },
  qTitle:        { fontSize: 16, fontWeight: "700", color: "#18181b", lineHeight: 24, marginBottom: 4 },
  qSub:          { fontSize: 13, color: "#71717a", marginBottom: 14 },
  options:       { gap: 8 },
  errorTxt:      { fontSize: 13, color: "#ef4444", textAlign: "center", marginBottom: 16 },
  submitBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#18181b", borderRadius: 16, paddingVertical: 18, marginBottom: 12 },
  submitTxt:     { fontSize: 15, fontWeight: "700", color: "#fff" },
  progressNote:  { fontSize: 12, color: "#a1a1aa", textAlign: "center" },
});