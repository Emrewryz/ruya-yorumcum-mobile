/**
 * app/settings.tsx
 *
 * Ayarlar sayfası.
 * Profil düzenleme + Rüya Algoritması Ayarları (onboarding verileri).
 */

import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, Switch, Pressable,
  ActivityIndicator, Linking, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ChevronRight, X, User, Bell, Shield,
  FileText, RefreshCw, LogOut, Info, Mail,
  Check, SlidersHorizontal, CheckCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import {
  scheduleDailyNotification,
  cancelDailyNotification,
  isNotificationEnabled,
} from "@/lib/notifications";

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface PersonalizationData {
  yasam_evreni?:  string;
  buyuk_degisim?: string;
  ruh_hali?:      string;
  zihin_mesgul?:  string;
  completed_at?:  string;
}

interface Profile {
  full_name:            string | null;
  email:                string | null;
  credits:              number;
  personalization_data: PersonalizationData;
}

// ─── Algoritma Soru Meta Verisi ───────────────────────────────────────────────

const QUESTION_META: {
  key:     keyof Omit<PersonalizationData, "completed_at">;
  label:   string;
  options: { value: string; label: string }[];
}[] = [
  {
    key:   "yasam_evreni",
    label: "YAŞAM EVRESİ",
    options: [
      { value: "egitim",   label: "Eğitim & Öğrencilik"   },
      { value: "kariyer",  label: "Kariyer & İş İnşası"   },
      { value: "aile",     label: "Aile & İlişki Odaklı"  },
      { value: "rölanti",  label: "Kendi Halimde"          },
    ],
  },
  {
    key:   "buyuk_degisim",
    label: "SON 6 AY",
    options: [
      { value: "evet_radikal", label: "Radikal değişim yaşandı" },
      { value: "hayir_rutin",  label: "Her şey rutin"           },
      { value: "bekliyor",     label: "Değişim yaklaşıyor"      },
    ],
  },
  {
    key:   "ruh_hali",
    label: "RUH HALİ",
    options: [
      { value: "huzurlu",    label: "Huzurlu & Sakin"           },
      { value: "kaygilar",   label: "Kaygılı & Stresli"         },
      { value: "yorgun",     label: "Yorgun & Tükenmiş"         },
      { value: "heyecanli",  label: "Gelecek İçin Heyecanlı"   },
    ],
  },
  {
    key:   "zihin_mesgul",
    label: "ZİHİN MEŞGULİYETİ",
    options: [
      { value: "gelecek_maddi", label: "Gelecek & Maddiyat"       },
      { value: "gecmis_baglar", label: "Geçmiş & Pişmanlıklar"   },
      { value: "kanıtlama",     label: "Kendimi Kanıtlama"        },
      { value: "an",            label: "Anı Yaşıyorum"            },
    ],
  },
];

// ─── Genel Yardımcı Bileşenler ────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function Row({
  icon: Icon, label, value, onPress, danger, toggle, toggleValue, onToggle,
}: {
  icon:         React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label:        string;
  value?:       string;
  onPress?:     () => void;
  danger?:      boolean;
  toggle?:      boolean;
  toggleValue?: boolean;
  onToggle?:    (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={toggle ? 1 : 0.65}
      style={s.row}
      disabled={!onPress && !toggle}
    >
      <View style={[s.rowIcon, danger && s.rowIconDanger]}>
        <Icon size={17} color={danger ? "#ef4444" : "#52525b"} strokeWidth={1.5} />
      </View>
      <Text style={[s.rowLabel, danger && s.rowLabelDanger]}>{label}</Text>
      {toggle && (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: "#e4e4e7", true: "#18181b" }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
      )}
      {!toggle && value && <Text style={s.rowValue}>{value}</Text>}
      {!toggle && onPress && (
        <ChevronRight size={15} color="#d4d4d8" strokeWidth={1.5} />
      )}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

// ─── Profil Düzenleme Modalı ──────────────────────────────────────────────────

function EditProfileModal({
  visible, profile, onClose, onSave,
}: {
  visible:  boolean;
  profile:  Profile | null;
  onClose:  () => void;
  onSave:   (name: string) => void;
}) {
  const insets          = useSafeAreaInsets();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(profile?.full_name ?? ""); }, [profile]);

  const handle = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", user.id);
    }
    setSaving(false);
    onSave(name.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={ms.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[ms.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={ms.handle} />
          <View style={ms.header}>
            <Text style={ms.title}>Profili Düzenle</Text>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <X size={15} color="#52525b" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <Text style={ms.inputLabel}>AD SOYAD</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Adınızı girin"
            placeholderTextColor="#a1a1aa"
            style={ms.input}
            autoFocus
          />
          <Text style={ms.emailNote}>{profile?.email ?? ""}</Text>

          <TouchableOpacity
            onPress={handle}
            disabled={saving || !name.trim()}
            style={[ms.saveBtn, (!name.trim() || saving) && { opacity: 0.4 }]}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={ms.saveBtnTxt}>Kaydet</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16 },
  handle:     { width: 36, height: 4, backgroundColor: "#e4e4e7", borderRadius: 999, alignSelf: "center", marginBottom: 20 },
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title:      { fontSize: 17, fontWeight: "700", color: "#18181b" },
  closeBtn:   { width: 30, height: 30, borderRadius: 8, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  inputLabel: { fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: 1.2, marginBottom: 8 },
  input:      { backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#18181b", marginBottom: 8 },
  emailNote:  { fontSize: 12, color: "#a1a1aa", marginBottom: 24 },
  saveBtn:    { backgroundColor: "#18181b", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnTxt: { fontSize: 15, fontWeight: "600", color: "#fff" },
});

// ─── Algoritma Ayarları Bölümü ────────────────────────────────────────────────

function AlgorithmSection({
  personalization,
  onChange,
}: {
  personalization: PersonalizationData;
  onChange:        (data: PersonalizationData) => void;
}) {
  return (
    <View style={al.wrap}>
      {QUESTION_META.map((q, qi) => {
        const selected = personalization[q.key];
        return (
          <View key={q.key} style={[al.questionBlock, qi < QUESTION_META.length - 1 && al.questionBorder]}>
            <Text style={al.questionLabel}>{q.label}</Text>
            <View style={al.optionsRow}>
              {q.options.map((opt) => {
                const isSelected = selected === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.7}
                    onPress={async () => {
                      await Haptics.selectionAsync();
                      onChange({ ...personalization, [q.key]: opt.value });
                    }}
                    style={[al.chip, isSelected && al.chipSelected]}
                  >
                    {isSelected && (
                      <Check size={11} color="#fff" strokeWidth={2.5} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[al.chipTxt, isSelected && al.chipTxtSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const al = StyleSheet.create({
  wrap:            { paddingTop: 4 },
  questionBlock:   { paddingVertical: 16, paddingHorizontal: 16 },
  questionBorder:  { borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
  questionLabel:   { fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: 1.2, marginBottom: 12 },
  optionsRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#e4e4e7",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "#fff",
  },
  chipSelected: {
    backgroundColor: "#18181b", borderColor: "#18181b",
  },
  chipTxt:         { fontSize: 13, color: "#52525b", fontWeight: "500" },
  chipTxtSelected: { color: "#fff" },
});

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [editModal, setEditModal]     = useState(false);
  const [notifAnaliz, setNotifAnaliz] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  // Algoritma state'i — profil yüklenince set edilir
  const [answers, setAnswers]         = useState<PersonalizationData>({});
  const [hasChanges, setHasChanges]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [savedOk, setSavedOk]         = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      // Bildirim durumunu yükle
      const notifOn = await isNotificationEnabled();
      setNotifAnaliz(notifOn);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, credits, personalization_data")
        .eq("id", user.id)
        .single();
      const p: Profile = {
        full_name:            data?.full_name ?? null,
        email:                user.email ?? null,
        credits:              data?.credits ?? 0,
        personalization_data: (data?.personalization_data as PersonalizationData) ?? {},
      };
      setProfile(p);
      setAnswers(p.personalization_data);
      setLoading(false);
    };
    load();
  }, []);

  // Seçim değişikliği
  const handleAnswerChange = (updated: PersonalizationData) => {
    setAnswers(updated);
    setHasChanges(true);
    setSavedOk(false);
  };

  // Kaydet
  const handleSaveAlgorithm = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload = { ...answers, completed_at: new Date().toISOString() };
      await supabase
        .from("profiles")
        .update({ personalization_data: payload })
        .eq("id", user.id);
      setAnswers(payload);
      setProfile((p) => p ? { ...p, personalization_data: payload } : p);
    }
    setSaving(false);
    setHasChanges(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Hesabı Sil",
      "Hesabınız ve tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              // Kullanıcı verilerini sil
              await supabase.from("dreams").delete().eq("user_id", user.id);
              await supabase.from("dream_chat_messages").delete().eq("user_id", user.id);
              await supabase.from("credit_transactions").delete().eq("user_id", user.id);
              await supabase.from("profiles").delete().eq("id", user.id);

              // Hesabı sil
              await supabase.auth.admin?.deleteUser(user.id);
              await supabase.auth.signOut();
              router.replace("/(auth)/login");
            } catch {
              // Admin API yoksa sadece çıkış yap
              await supabase.auth.signOut();
              router.replace("/(auth)/login");
            }
          },
        },
      ]
    );
  };

  const openUrl = (url: string) => Linking.openURL(url).catch(() => {});

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#18181b" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>

      {/* Başlık */}
      <View style={s.header}>
        <Text style={s.pageTitle}>Ayarlar</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <X size={18} color="#52525b" strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profil Kartı ── */}
        <TouchableOpacity
          onPress={() => setEditModal(true)}
          activeOpacity={0.7}
          style={s.profileCard}
        >
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarTxt}>
              {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>
              {profile?.full_name ?? "İsim eklenmemiş"}
            </Text>
            <Text style={s.profileEmail}>{profile?.email ?? ""}</Text>
            <View style={s.creditRow}>
              <View style={s.creditDot} />
              <Text style={s.creditTxt}>{profile?.credits ?? 0} kredi</Text>
            </View>
          </View>
          <View style={s.editBadge}>
            <Text style={s.editBadgeTxt}>Düzenle</Text>
          </View>
        </TouchableOpacity>

        {/* ── Hesap ── */}
        <SectionLabel title="HESAP" />
        <View style={s.card}>
          <Row
            icon={User}
            label="Profili Düzenle"
            value={profile?.full_name ?? "Eklenmemiş"}
            onPress={() => setEditModal(true)}
          />
          <Divider />
          <Row
            icon={RefreshCw}
            label="Kredi Satın Al"
            value={`${profile?.credits ?? 0} kredi`}
            onPress={() => router.push("/credit-shop")}
          />
          <Divider />
          <Row
            icon={Mail}
            label="Destek"
            value="destek@ruyayorumcum.com.tr"
            onPress={() => openUrl("mailto:destek@ruyayorumcum.com.tr")}
          />
        </View>

        {/* ── Rüya Algoritması ── */}
        <SectionLabel title="RÜYA ALGORİTMASI" />
        <View style={s.card}>

          {/* Kart başlığı */}
          <View style={s.algoHeader}>
            <View style={s.algoIconWrap}>
              <SlidersHorizontal size={16} color="#18181b" strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.algoTitle}>Kişiselleştirme</Text>
              <Text style={s.algoSub}>
                {profile?.personalization_data?.completed_at
                  ? "Yanıtlarınıza göre analizler kişiselleştirilir."
                  : "Henüz tamamlanmamış — aşağıdan ayarlayın."}
              </Text>
            </View>
          </View>

          <View style={s.algoDivider} />

          {/* Sorular */}
          <AlgorithmSection
            personalization={answers}
            onChange={handleAnswerChange}
          />

          {/* Kaydet / başarı */}
          {(hasChanges || savedOk) && (
            <View style={s.algoFooter}>
              {savedOk ? (
                <View style={s.savedBadge}>
                  <CheckCircle size={13} color="#10b981" strokeWidth={1.5} />
                  <Text style={s.savedBadgeTxt}>Değişiklikler kaydedildi</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleSaveAlgorithm}
                  disabled={saving}
                  activeOpacity={0.8}
                  style={[s.saveBtn, saving && { opacity: 0.55 }]}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.saveBtnTxt}>Değişiklikleri Kaydet</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Bildirimler ── */}
        <SectionLabel title="BİLDİRİMLER" />
        <View style={s.card}>
          <Row
            icon={Bell}
            label="Sabah Analiz Bildirimi"
            value={notifLoading ? "Yükleniyor..." : undefined}
            toggle
            toggleValue={notifAnaliz}
            onToggle={async (val) => {
              setNotifLoading(true);
              if (val) {
                const ok = await scheduleDailyNotification();
                setNotifAnaliz(ok);
                if (!ok) {
                  // İzin reddedildi
                }
              } else {
                await cancelDailyNotification();
                setNotifAnaliz(false);
              }
              setNotifLoading(false);
            }}
          />
        </View>

        {/* ── Yasal ── */}
        <SectionLabel title="YASAL" />
        <View style={s.card}>
          <Row
            icon={Shield}
            label="Gizlilik Politikası"
            onPress={() => openUrl("https://www.ruyayorumcum.com.tr/gizlilik")}
          />
          <Divider />
          <Row
            icon={FileText}
            label="Kullanım Koşulları"
            onPress={() => openUrl("https://www.ruyayorumcum.com.tr/mesafeli-satis")}
          />
          <Divider />
          <Row
            icon={FileText}
            label="İptal & İade Koşulları"
            onPress={() => openUrl("https://www.ruyayorumcum.com.tr/iptal-iade")}
          />
        </View>

        {/* ── Hakkında ── */}
        <SectionLabel title="HAKKINDA" />
        <View style={s.card}>
          <Row icon={Info} label="Uygulama Versiyonu" value="1.0.0" />
        </View>

        {/* ── Çıkış ── */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={s.signOutBtn}
          activeOpacity={0.7}
        >
          <LogOut size={16} color="#ef4444" strokeWidth={1.5} />
          <Text style={s.signOutTxt}>Çıkış Yap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={s.deleteBtn}
          activeOpacity={0.7}
        >
          <Text style={s.deleteTxt}>Hesabımı ve Tüm Verilerimi Sil</Text>
        </TouchableOpacity>

      </ScrollView>

      <EditProfileModal
        visible={editModal}
        profile={profile}
        onClose={() => setEditModal(false)}
        onSave={(name) => setProfile((p) => p ? { ...p, full_name: name } : p)}
      />
    </SafeAreaView>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: "#f9f9f9" },
  header:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  pageTitle:        { fontSize: 28, fontWeight: "800", color: "#18181b" },
  backBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  content:          { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },

  // Profil kartı
  profileCard:      { backgroundColor: "#fff", borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  profileAvatar:    { width: 52, height: 52, borderRadius: 999, backgroundColor: "#18181b", alignItems: "center", justifyContent: "center" },
  profileAvatarTxt: { fontSize: 22, fontWeight: "700", color: "#fff" },
  profileName:      { fontSize: 16, fontWeight: "700", color: "#18181b", marginBottom: 2 },
  profileEmail:     { fontSize: 12, color: "#a1a1aa" },
  creditRow:        { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  creditDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  creditTxt:        { fontSize: 12, color: "#10b981", fontWeight: "500" },
  editBadge:        { backgroundColor: "#f4f4f5", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editBadgeTxt:     { fontSize: 12, fontWeight: "600", color: "#52525b" },

  // Bölüm başlığı
  sectionLabel:     { fontSize: 11, fontWeight: "700", color: "#a1a1aa", letterSpacing: 0.8, paddingHorizontal: 4, marginBottom: 8, marginTop: 4 },

  // Kart
  card:             { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },

  // Row
  row:              { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon:          { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  rowIconDanger:    { backgroundColor: "#fef2f2" },
  rowLabel:         { flex: 1, fontSize: 15, color: "#3f3f46", fontWeight: "500" },
  rowLabelDanger:   { color: "#ef4444" },
  rowValue:         { fontSize: 13, color: "#a1a1aa", maxWidth: 140, textAlign: "right" },
  divider:          { height: 1, backgroundColor: "#f9f9f9", marginLeft: 62 },

  // Algoritma bölümü — kart içi
  algoHeader:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  algoIconWrap:     { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  algoTitle:        { fontSize: 15, fontWeight: "600", color: "#18181b" },
  algoSub:          { fontSize: 12, color: "#a1a1aa", marginTop: 1 },
  algoDivider:      { height: 1, backgroundColor: "#f4f4f5" },
  algoFooter:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  saveBtn:          { backgroundColor: "#18181b", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnTxt:       { fontSize: 14, fontWeight: "600", color: "#fff" },
  savedBadge:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  savedBadgeTxt:    { fontSize: 12, fontWeight: "500", color: "#16a34a" },

  // Çıkış
  signOutBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 16, marginTop: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  signOutTxt:       { fontSize: 15, fontWeight: "600", color: "#ef4444" },
  deleteBtn:        { alignItems: "center", paddingVertical: 16, marginTop: 4 },
  deleteTxt:        { fontSize: 13, color: "#a1a1aa", textDecorationLine: "underline" },
});