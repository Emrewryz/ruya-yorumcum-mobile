import { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, StyleSheet, PanResponder,
  Animated, Keyboard, Platform,
} from "react-native";
import { SafeAreaView }                  from "react-native-safe-area-context";
import { router, useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Haptics                      from "expo-haptics";
import { Moon, Menu }                    from "lucide-react-native";
import { supabase }                      from "@/lib/supabase";
import AsyncStorage                      from "@react-native-async-storage/async-storage";

import Drawer                            from "@/components/Drawer";
import FloatingInput                     from "@/components/FloatingInput";
import AnimatedMessage, { ChatMsg }      from "@/components/AnimatedMessage";
import PaywallCard                       from "@/components/PaywallCard";
import LoadingState                      from "@/components/LoadingState";
import ReportView                        from "@/components/ReportView";
import HeaderAdButton                    from "@/components/HeaderAdButton";


const EDGE_URL          = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/analyze-dream`;
const FOLLOWUP_EDGE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/follow-up`;

const SUGGESTED_QUESTIONS = [
  "Bu rüyanın hayatımdaki anlamı nedir?",
  "Bu rüyayı tekrar görürsem ne yapmalıyım?",
  "Rüyadaki semboller bana ne söylüyor?",
];

type Phase = "idle" | "loading" | "session";

export interface AiResponse {
  kisa_ozet:          string;
  detayli_tahlil:     string;
  semboller:          string;
  islami_analiz?:     string;
  psikolojik_analiz?: string;
}

export interface DreamSession {
  id:             string;
  dream_text:     string;
  ai_response:    AiResponse;
  detay_unlocked: boolean;
}


// ─── Nefes Alan Aura Halkaları (idle state arka plan efekti) ──────────────────

function AuraRings() {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;
  const op1    = useRef(new Animated.Value(0.12)).current;
  const op2    = useRef(new Animated.Value(0.07)).current;
  const op3    = useRef(new Animated.Value(0.04)).current;

  useEffect(() => {
    const breathe = (scaleAnim: Animated.Value, opAnim: Animated.Value, delay: number, maxOp: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1.18, duration: 2800, useNativeDriver: true }),
            Animated.timing(opAnim,   { toValue: maxOp, duration: 2800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1,    duration: 2800, useNativeDriver: true }),
            Animated.timing(opAnim,   { toValue: maxOp * 0.4, duration: 2800, useNativeDriver: true }),
          ]),
        ])
      );

    const a1 = breathe(scale1, op1, 0,    0.13);
    const a2 = breathe(scale2, op2, 600,  0.08);
    const a3 = breathe(scale3, op3, 1200, 0.05);

    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={au.wrap} pointerEvents="none">
      <Animated.View style={[au.ring, au.ring3, { transform: [{ scale: scale3 }], opacity: op3 }]} />
      <Animated.View style={[au.ring, au.ring2, { transform: [{ scale: scale2 }], opacity: op2 }]} />
      <Animated.View style={[au.ring, au.ring1, { transform: [{ scale: scale1 }], opacity: op1 }]} />
    </View>
  );
}

const au = StyleSheet.create({
  wrap:  { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", marginBottom: 60 },
  ring:  { position: "absolute", borderRadius: 999, borderWidth: 1 },
  ring1: { width: 140, height: 140, borderColor: "#18181b" },
  ring2: { width: 220, height: 220, borderColor: "#18181b" },
  ring3: { width: 310, height: 310, borderColor: "#18181b" },
});

export default function HomeScreen() {
  const params = useLocalSearchParams<{ dreamId?: string }>();

  const [authChecked, setAuthChecked] = useState(false);
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [inputText,  setInputText]  = useState("");
  const [stepIdx,    setStepIdx]    = useState(0);
  const [error,      setError]      = useState<string | null>(null);
  const [session,    setSession]    = useState<DreamSession | null>(null);
  const [messages,   setMessages]   = useState<ChatMsg[]>([]);
  const [isUnlocked, setUnlocked]   = useState(false);
  const [sending,    setSending]    = useState(false);
  const [drawerOpen, setDrawer]     = useState(false);
  const [credits,    setCredits]    = useState(0);

  const scrollRef      = useRef<ScrollView>(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // Klavye animasyon değerleri — idle içeriği klavyeyle birlikte yukarı kayar
  const idleTranslateY = useRef(new Animated.Value(0)).current;
  const idleOpacity    = useRef(new Animated.Value(1)).current;
  const idleIconScale  = useRef(new Animated.Value(1)).current;

  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder:  (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dy) < 60,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 60 && g.vx > 0)                       setDrawer(true);
        else if (g.dx < -60 && g.vx < 0 && phase === "session") fadeReset();
      },
    })
  ).current;

  const fade = useCallback((fn: () => void) => {
    Animated.timing(contentOpacity, { toValue: 0, duration: 160, useNativeDriver: true })
      .start(() => {
        fn();
        Animated.timing(contentOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
  }, [contentOpacity]);

  const fadeReset = useCallback(() => {
    fade(() => {
      setPhase("idle"); setSession(null); setMessages([]);
      setInputText(""); setError(null); setUnlocked(false);
    });
  }, [fade]);

  const revealScroll = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 900);
    }, 200);
  }, []);

  // ── Auth kontrolü — en önce çalışır ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        router.replace("/(auth)/login");
        return;
      }
      setAuthChecked(true);
    });

    // Çıkış yapılınca login'e yönlendir
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/(auth)/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Klavye açılınca içerik ekranın üstüne taşınır ───────────────────────
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        // İçeriği klavye yüksekliğinin yarısı kadar yukarı taşı
        const shift = -(e.endCoordinates.height * 0.55);
        Animated.parallel([
          Animated.spring(idleTranslateY, {
            toValue: shift, tension: 70, friction: 14, useNativeDriver: true,
          }),
          Animated.timing(idleOpacity, {
            toValue: 1, duration: 200, useNativeDriver: true,
          }),
          Animated.spring(idleIconScale, {
            toValue: 0.75, tension: 70, friction: 14, useNativeDriver: true,
          }),
        ]).start();
      },
    );

    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.parallel([
          Animated.spring(idleTranslateY, {
            toValue: 0, tension: 60, friction: 14, useNativeDriver: true,
          }),
          Animated.spring(idleIconScale, {
            toValue: 1, tension: 60, friction: 14, useNativeDriver: true,
          }),
        ]).start();
      },
    );

    return () => { show.remove(); hide.remove(); };
  }, []);

  const loadCredits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles").select("credits").eq("id", user.id).single();
    if (data) setCredits(data.credits ?? 0);
  }, []);

  useEffect(() => { if (authChecked) loadCredits(); }, [authChecked]);

  // Ekran focus aldığında (credit-shop'tan dönünce) krediyi güncelle
  useFocusEffect(
    useCallback(() => { loadCredits(); }, [loadCredits])
  );

  useEffect(() => {
    if (params.dreamId) loadDream(params.dreamId as string);
  }, [params.dreamId]);

  const loadDream = useCallback(async (dreamId: string) => {
    fade(() => { setPhase("loading"); setStepIdx(0); });
    const { data: dream } = await supabase
      .from("dreams").select("id, dream_text, ai_response, detay_unlocked")
      .eq("id", dreamId).single();
    if (!dream) return;
    const { data: msgs } = await supabase
      .from("dream_chat_messages").select("id, role, content")
      .eq("dream_id", dreamId).order("created_at", { ascending: true });
    fade(() => {
      setSession(dream as DreamSession);
      setUnlocked(dream.detay_unlocked ?? false);
      setMessages((msgs ?? []) as ChatMsg[]);
      setPhase("session");
    });
    revealScroll();
  }, [fade, revealScroll]);

  const handleAnalyze = useCallback(async () => {
    const text = inputText.trim();
    if (text.length < 10) return;
    Keyboard.dismiss();
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase
        .from("profiles").select("credits").eq("id", user.id).single();
      if (!p || p.credits < 1) { router.push("/credit-shop"); return; }
    }

    setPhase("loading"); setStepIdx(0);
    const interval = setInterval(() => setStepIdx((i) => Math.min(i + 1, 3)), 2000);

    try {
      const { data: { session: authSess } } = await supabase.auth.getSession();
      let guestId: string | undefined;
      if (!authSess) {
        let gid = await AsyncStorage.getItem("guest_session_id");
        if (!gid) {
          gid = Math.random().toString(36).slice(2) + Date.now().toString(36);
          await AsyncStorage.setItem("guest_session_id", gid);
        }
        guestId = gid;
      }

      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": authSess?.access_token
            ? `Bearer ${authSess.access_token}`
            : `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          "apikey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
        },
        body: JSON.stringify({ dreamText: text, guestSessionId: guestId }),
      });

      clearInterval(interval);
      const data = await res.json();

      if (!data.success) {
        if (data.code === "NO_CREDIT" || data.code === "GUEST_LIMIT") {
          setPhase("idle"); router.push("/credit-shop"); return;
        }
        setError(data.error ?? "Analiz başarısız."); setPhase("idle"); return;
      }

      const { data: dream } = await supabase
        .from("dreams").select("id, dream_text, ai_response, detay_unlocked")
        .eq("id", data.dreamId).single();

      if (dream) {
        setSession(dream as DreamSession);
        setUnlocked(dream.detay_unlocked ?? false);
        setMessages([{ id: "teaser", role: "assistant",
          content: (dream.ai_response as AiResponse).kisa_ozet }]);
      }

      await loadCredits();
      setInputText(""); setPhase("session");
      revealScroll();

    } catch {
      clearInterval(interval);
      setError("Sunucuya bağlanılamadı."); setPhase("idle");
    }
  }, [inputText, revealScroll, loadCredits]);

  const handleSend = useCallback(async (overrideMsg?: string) => {
    const msg = (overrideMsg ?? inputText).trim();
    if (!msg || msg.length < 3 || sending || !session) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const optimisticId = `u-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, role: "user", content: msg }]);
    setInputText(""); setSending(true); setError(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

    const rollback = () => {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputText(msg);
    };

    try {
      const { data: { session: authSess } } = await supabase.auth.getSession();
      if (!authSess) { rollback(); router.push("/(auth)/login"); return; }

      const res = await fetch(FOLLOWUP_EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${authSess.access_token}`,
          "apikey":        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
        },
        body: JSON.stringify({ dreamId: session.id, message: msg }),
      });
      const data = await res.json();

      if (!data.success) {
        rollback();
        if (data.code === "NO_CREDIT") { router.push("/credit-shop"); return; }
        if (data.code === "NO_AUTH")   { router.push("/(auth)/login"); return; }
        setError(data.error ?? "Bir hata oluştu.");
        return;
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticId),
        { id: data.userMessage.id,      role: "user",      content: data.userMessage.content },
        { id: data.assistantMessage.id, role: "assistant", content: data.assistantMessage.content },
      ]);
      await loadCredits();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

    } catch {
      rollback();
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSending(false);
    }
  }, [inputText, sending, session, loadCredits]);

  const ai      = session?.ai_response;
  const detayli = ai
    ? (ai.detayli_tahlil || [ai.islami_analiz, ai.psikolojik_analiz].filter(Boolean).join("\n\n"))
    : "";

  // Auth kontrol edilmeden hiçbir şey gösterme
  if (!authChecked) return null;

  return (
    <View style={s.root}>
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawer(false); loadCredits(); }}
        onSelectDream={loadDream}
        onNewAnalysis={fadeReset}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ flex: 1 }}>

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => setDrawer(true)} style={s.menuBtn}>
              <Menu size={20} color="#18181b" strokeWidth={1.5} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            {/* Ücretsiz kredi kazan */}
            <HeaderAdButton onCreditEarned={loadCredits} />
            {/* Kredi — her zaman görünür */}
            <TouchableOpacity
              onPress={() => router.push("/credit-shop")}
              style={s.creditBadge}
            >
              <Text style={s.creditTxt}>{credits} Kredi</Text>
            </TouchableOpacity>
          </View>

          {/* İçerik */}
          <Animated.View
            style={[s.content, { opacity: contentOpacity }]}
            {...swipePan.panHandlers}
          >
            {phase === "idle" && (
              <View style={s.idleWrap}>
                <AuraRings />
                {/* İkon + yazı klavyeyle birlikte animasyonla kayar */}
                <Animated.View style={{
                  alignItems: "center", gap: 8,
                  transform: [
                    { translateY: idleTranslateY },
                    { scale: idleIconScale },
                  ],
                }}>
                  <Animated.View style={[s.idleIcon]}>
                    <Moon size={32} color="#18181b" strokeWidth={1.5} />
                  </Animated.View>
                  <Text style={s.idleTitle}>Merhaba</Text>
                  <Text style={s.idleSub}>Bu gece ne gördün?</Text>
                  {error && (
                    <View style={s.errorBox}>
                      <Text style={s.errorTxt}>{error}</Text>
                    </View>
                  )}
                </Animated.View>
              </View>
            )}

            {phase === "loading" && <LoadingState stepIdx={stepIdx} />}

            {phase === "session" && session && (
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={s.sessionContent}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
              >
                <View style={s.dreamCard}>
                  <View style={s.dreamAccent} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.dreamLabel}>RÜYA METNİ</Text>
                    <Text style={s.dreamTxt}>{session.dream_text}</Text>
                  </View>
                </View>

                {messages.map((msg) => (
                  <AnimatedMessage key={msg.id} msg={msg} showLabel={msg.id === "teaser"} />
                ))}

                {!isUnlocked && (
                  <PaywallCard
                    dreamId={session.id}
                    detayli={detayli}
                    onUnlocked={() => {
                      setUnlocked(true);
                      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
                    }}
                  />
                )}

                {isUnlocked && ai && <ReportView ai={ai} />}

                {/* Hazır sorular — henüz follow-up yokken göster */}
                {messages.length === 1 && !sending && (
                  <View style={s.suggestWrap}>
                    <Text style={s.suggestLabel}>Rüyanız hakkında merak ettiğiniz bir şey var mı?</Text>
                    <View style={s.suggestRow}>
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <TouchableOpacity
                          key={q}
                          onPress={() => handleSend(q)}
                          activeOpacity={0.7}
                          style={s.suggestChip}
                        >
                          <Text style={s.suggestChipTxt}>{q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {error && (
                  <View style={s.errorBox}>
                    <Text style={s.errorTxt}>{error}</Text>
                  </View>
                )}

                {sending && (
                  <View style={s.sendingWrap}>
                    <ActivityIndicator color="#a1a1aa" size="small" />
                  </View>
                )}

                {/* Input yüksekliği kadar boşluk */}
                <View style={{ height: 90 }} />
              </ScrollView>
            )}
          </Animated.View>

          {/* FloatingInput — absolute, klavye olaylarını kendisi dinler */}
          <FloatingInput
            value={inputText}
            onChange={setInputText}
            onSend={phase === "idle" ? handleAnalyze : () => handleSend()}
            canSend={inputText.trim().length >= (phase === "idle" ? 10 : 3)}
            sending={sending}
            loading={phase === "loading"}
            placeholder={phase === "idle" ? "Rüyanı yaz, analiz edelim..." : "Soru sor..."}
          />

        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#fafafa" },
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  menuBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7", alignItems: "center", justifyContent: "center" },
  creditBadge: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  creditTxt:   { fontSize: 12, fontWeight: "600", color: "#18181b" },
  content:     { flex: 1 },
  idleWrap:    { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 8, paddingBottom: 90 },
  idleIcon:    { width: 72, height: 72, borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7", alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  idleTitle:   { fontSize: 34, fontWeight: "800", color: "#18181b" },
  idleSub:     { fontSize: 18, color: "#71717a", textAlign: "center", lineHeight: 26 },
  errorBox:    { marginTop: 20, backgroundColor: "#fef2f2", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: "#fecaca" },
  errorTxt:    { fontSize: 13, color: "#dc2626", textAlign: "center" },
  sessionContent: { paddingHorizontal: 20, paddingTop: 16 },
  dreamCard:   { flexDirection: "row", gap: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 18, padding: 18, marginBottom: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  dreamAccent: { width: 3, borderRadius: 999, backgroundColor: "#d4d4d8" },
  dreamLabel:  { fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: 1.5, marginBottom: 8 },
  dreamTxt:    { fontSize: 14, color: "#71717a", lineHeight: 22, fontStyle: "italic" },
  sendingWrap: { paddingVertical: 16, alignItems: "flex-start" },
  suggestWrap:    { marginTop: 4, marginBottom: 20 },
  suggestLabel:   { fontSize: 12, color: "#a1a1aa", marginBottom: 10 },
  suggestRow:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestChip:    { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#fff" },
  suggestChipTxt: { fontSize: 12.5, color: "#3f3f46" },
});