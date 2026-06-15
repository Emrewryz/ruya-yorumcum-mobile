import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Animated, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Lock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

interface Props {
  dreamId:    string;
  detayli:    string;
  onUnlocked: () => void;
}

export default function PaywallCard({ dreamId, detayli, onUnlocked }: Props) {
  const [loading, setLoading] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const unlock = async () => {
    if (loading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/credit-shop"); setLoading(false); return; }
      const { data: p } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
      if (!p || p.credits < 2) { router.push("/credit-shop"); setLoading(false); return; }
      await supabase.from("dreams").update({ detay_unlocked: true }).eq("id", dreamId).eq("user_id", user.id);
      await supabase.rpc("handle_credit_transaction", {
        p_user_id: user.id, p_amount: -2,
        p_process_type: "analysis_unlock", p_description: `Kilit: ${dreamId}`,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlocked();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  };

  return (
    <Animated.View style={[s.wrap, { opacity, transform: [{ translateY: ty }] }]}>
      <View style={s.textWrap}>
        <Text style={s.label}>DETAYLI RÜYA TAHLİLİ</Text>
        <Text numberOfLines={5} style={s.preview}>{detayli}</Text>
      </View>
      <LinearGradient colors={["transparent","rgba(250,250,250,0.96)","#fafafa"]} style={s.grad} />
      <TouchableOpacity onPress={unlock} disabled={loading}
        style={[s.btn, loading && { opacity: 0.65 }]}>
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <>
              <Lock size={15} color="#fff" strokeWidth={1.5} />
              <Text style={s.btnTxt}>Detaylı Tahlili Gör</Text>
              <View style={s.pill}><Text style={s.pillTxt}>2 Kredi</Text></View>
            </>
        }
      </TouchableOpacity>
      <Text style={s.note}>İslami tabir · Psikolojik analiz · Semboller dahil</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap:    { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 20, overflow: "hidden", marginBottom: 20 },
  textWrap:{ padding: 20, paddingBottom: 0 },
  label:   { fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: 1.5, marginBottom: 10 },
  preview: { fontSize: 15, color: "#3f3f46", lineHeight: 26 },
  grad:    { height: 72, marginTop: -56 },
  btn:     { backgroundColor: "#18181b", borderRadius: 14, marginHorizontal: 20, marginTop: 4, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  btnTxt:  { fontSize: 14, fontWeight: "600", color: "#fff" },
  pill:    { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pillTxt: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
  note:    { textAlign: "center", fontSize: 11, color: "#a1a1aa", paddingVertical: 12 },
});