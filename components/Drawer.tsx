import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Pressable,
  Animated, StyleSheet, Dimensions, PanResponder,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Moon, X, Plus, CreditCard, FlaskConical,
  BookOpen, Settings, Clock, User, ChevronRight, LogOut,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

interface DreamItem { id: string; dream_text: string; created_at: string; }
interface Props {
  open:          boolean;
  onClose:       () => void;
  onSelectDream: (id: string) => void;
  onNewAnalysis: () => void;
}

function MenuItem({ icon: Icon, label, onPress }: {
  icon: any; label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={mi.row}>
      <View style={mi.iconWrap}>
        <Icon size={18} color="#52525b" strokeWidth={1.5} />
      </View>
      <Text style={mi.label}>{label}</Text>
      <ChevronRight size={14} color="#d4d4d8" strokeWidth={1.5} />
    </TouchableOpacity>
  );
}

const mi = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  label:    { flex: 1, fontSize: 15, fontWeight: "500", color: "#3f3f46" },
});

export default function Drawer({ open, onClose, onSelectDream, onNewAnalysis }: Props) {
  const insets  = useSafeAreaInsets();
  const slideX  = useRef(new Animated.Value(-width)).current;
  const overlay = useRef(new Animated.Value(0)).current;
  const isOpen  = useRef(false);

  const [dreams,    setDreams]    = useState<DreamItem[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName,  setUserName]  = useState<string | null>(null);
  const [credits,   setCredits]   = useState(0);

  // Sola kaydırarak kapat
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder:  (_, g) => g.dx < -8 && Math.abs(g.dy) < 50,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) slideX.setValue(Math.max(g.dx, -width));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -70 || g.vx < -0.6) {
          onClose();
        } else {
          Animated.spring(slideX, {
            toValue: 0, tension: 120, friction: 18, useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Mount'ta veriyi önceden yükle — drawer açılınca hazır olsun
  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (open === isOpen.current) return;
    isOpen.current = open;
    slideX.stopAnimation();
    overlay.stopAnimation();

    if (open) {
      slideX.setValue(-width);
      overlay.setValue(0);
      Animated.parallel([
        Animated.spring(slideX, { toValue: 0, tension: 85, friction: 15, useNativeDriver: true }),
        Animated.timing(overlay, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
      loadData(); // yenile
    } else {
      Animated.parallel([
        Animated.spring(slideX, { toValue: -width, tension: 100, friction: 16, useNativeDriver: true }),
        Animated.timing(overlay, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email ?? null);
    if (user) {
      const { data: p } = await supabase.from("profiles")
        .select("full_name, credits").eq("id", user.id).single();
      setUserName(p?.full_name ?? null);
      setCredits(p?.credits ?? 0);
    }
    let q = supabase.from("dreams").select("id, dream_text, created_at")
      .eq("status", "completed").order("created_at", { ascending: false }).limit(20);
    if (user) q = q.eq("user_id", user.id);
    else {
      const gid = await AsyncStorage.getItem("guest_session_id");
      if (gid) q = q.eq("guest_session_id", gid);
    }
    const { data } = await q;
    setDreams((data ?? []) as DreamItem[]);
  };

  const pointerEvents = open ? "box-none" : "none";
  const displayName   = userName ?? userEmail ?? "Misafir";

  /**
   * Drawer'dan navigate:
   * Önce drawer'ı kapat, hemen navigate et — gecikme yok.
   * Drawer kapanış animasyonu arka planda devam eder.
   */
  const tap = (fn: () => void) => async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();        // 1. Önce navigate — yeni ekran HOME+DRAWER üstüne gelir
    onClose();   // 2. Sonra kapat — yeni ekranın altında kapanır, home görünmez
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={pointerEvents}>

      {/* Karartma */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.3)", opacity: overlay }]}
        pointerEvents={open ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[s.panel, { transform: [{ translateX: slideX }] }]}
        {...pan.panHandlers}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

          {/* Marka + kapat */}
          <View style={s.brandRow}>
            <View style={s.brandLeft}>
              <View style={s.brandIcon}>
                <Moon size={18} color="#18181b" strokeWidth={1.5} />
              </View>
              <Text style={s.brandTxt}>Rüya Yorumcum</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={17} color="#71717a" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}>

            {/* Yeni Analiz */}
            <TouchableOpacity
              onPress={tap(() => onNewAnalysis())}
              activeOpacity={0.7}
              style={s.newBtn}
            >
              <View style={s.newBtnIcon}>
                <Plus size={17} color="#18181b" strokeWidth={2} />
              </View>
              <Text style={s.newBtnTxt}>Yeni Analiz</Text>
            </TouchableOpacity>

            {/* Menü */}
            <View style={s.menuSection}>
              <MenuItem icon={CreditCard}   label="Kredi Mağazası" onPress={tap(() => router.push("/credit-shop"))} />
              <MenuItem icon={FlaskConical} label="Testler"         onPress={tap(() => router.push("/tests"))} />
              <MenuItem icon={BookOpen}     label="Rüya Tabirleri" onPress={tap(() => router.push("/dictionary"))} />
              <MenuItem icon={Settings}     label="Ayarlar"         onPress={tap(() => router.push("/settings"))} />
            </View>

            {/* Geçmiş */}
            <View style={s.sectionHeader}>
              <Clock size={12} color="#a1a1aa" strokeWidth={1.5} />
              <Text style={s.sectionTitle}>SON ANALİZLER</Text>
            </View>

            <View style={s.historyWrap}>
              {dreams.length === 0
                ? <Text style={s.emptyTxt}>Henüz analiz yok.</Text>
                : dreams.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    onPress={tap(() => onSelectDream(d.id))}
                    style={s.historyItem}
                  >
                    <Text numberOfLines={1} style={s.historyTxt}>{d.dream_text}</Text>
                    <Text style={s.historyDate}>
                      {new Date(d.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          </ScrollView>

          {/* Profil */}
          <View style={[s.footer, { paddingBottom: insets.bottom + 8 }]}>
            <View style={s.profileRow}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.profileName} numberOfLines={1}>{displayName}</Text>
                {userEmail && userName && (
                  <Text style={s.profileEmail} numberOfLines={1}>{userEmail}</Text>
                )}
                <Text style={s.profileCredits}>{credits} kredi</Text>
              </View>
              {userEmail ? (
                <TouchableOpacity
                  onPress={async () => {
                    onClose();
                    await supabase.auth.signOut();
                    // _layout.tsx onAuthStateChange otomatik login'e yönlendirir
                  }}
                  style={s.actionBtn}
                >
                  <LogOut size={15} color="#71717a" strokeWidth={1.5} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={tap(() => router.push("/(auth)/login"))}
                  style={[s.actionBtn, { flexDirection: "row", gap: 6, paddingHorizontal: 12, width: "auto" }]}
                >
                  <User size={14} color="#52525b" strokeWidth={1.5} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#52525b" }}>Giriş</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  panel:        { position: "absolute", top: 0, left: 0, bottom: 0, width, backgroundColor: "#fff", zIndex: 200 },
  brandRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
  brandLeft:    { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon:    { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  brandTxt:     { fontSize: 17, fontWeight: "700", color: "#18181b" },
  closeBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
  newBtn:       { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, marginTop: 16, marginBottom: 8, backgroundColor: "#f4f4f5", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  newBtnIcon:   { width: 32, height: 32, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  newBtnTxt:    { fontSize: 15, fontWeight: "600", color: "#18181b" },
  menuSection:  { paddingTop: 4, paddingBottom: 8 },
  sectionHeader:{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#a1a1aa", letterSpacing: 0.8 },
  historyWrap:  { paddingHorizontal: 12 },
  historyItem:  { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, borderBottomWidth: 1, borderBottomColor: "#fafafa" },
  historyTxt:   { fontSize: 14, fontWeight: "500", color: "#3f3f46", marginBottom: 2 },
  historyDate:  { fontSize: 11, color: "#a1a1aa" },
  emptyTxt:     { paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: "#a1a1aa" },
  footer:       { borderTopWidth: 1, borderTopColor: "#f4f4f5", paddingHorizontal: 20, paddingTop: 16 },
  profileRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:       { width: 40, height: 40, borderRadius: 999, backgroundColor: "#18181b", alignItems: "center", justifyContent: "center" },
  avatarTxt:    { fontSize: 16, fontWeight: "700", color: "#fff" },
  profileName:  { fontSize: 14, fontWeight: "600", color: "#18181b" },
  profileEmail: { fontSize: 12, color: "#a1a1aa", marginTop: 1 },
  profileCredits:{ fontSize: 11, color: "#a1a1aa", marginTop: 1 },
  actionBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" },
});