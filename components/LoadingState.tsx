/**
 * components/LoadingState.tsx
 *
 * Profesyonel işlem adımları göstergesi.
 * Sihir dili yok — sistemin ne yaptığını net anlatır.
 */

import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, Animated, StyleSheet } from "react-native";

const STEPS: { label: string; sub: string }[] = [
  { label: "Rüya metni işleniyor...",             sub: "Doğal dil analizi çalışıyor"             },
  { label: "Anahtar semboller tespit ediliyor...", sub: "Arketip ve motif eşleştirmesi yapılıyor" },
  { label: "İslami kaynaklar taranıyor...",        sub: "Klasik tabir literatürü inceleniyor"     },
  { label: "Tahlil raporu derleniyor...",          sub: "Bulgular sentezleniyor"                  },
];

interface Props { stepIdx: number; }

export default function LoadingState({ stepIdx }: Props) {
  // Metin geçişi için fade animasyonu
  const textOpacity = useRef(new Animated.Value(1)).current;
  const prevIdx     = useRef(stepIdx);

  useEffect(() => {
    if (prevIdx.current === stepIdx) return;
    prevIdx.current = stepIdx;

    // Eski metin → fade-out → yeni metin → fade-in
    Animated.sequence([
      Animated.timing(textOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [stepIdx, textOpacity]);

  const pct = `${((stepIdx + 1) / STEPS.length) * 100}%` as unknown as number;

  return (
    <View style={s.wrap}>

      {/* Spinner */}
      <View style={s.spinnerRing}>
        <ActivityIndicator color="#18181b" size="large" />
      </View>

      {/* Adım metni (fade ile geçiş) */}
      <Animated.View style={[s.textWrap, { opacity: textOpacity }]}>
        <Text style={s.label}>{STEPS[stepIdx].label}</Text>
        <Text style={s.sub}>{STEPS[stepIdx].sub}</Text>
      </Animated.View>

      {/* Progress bar */}
      <View style={s.track}>
        <View style={[s.fill, { width: pct }]} />
      </View>

      {/* Adım noktaları */}
      <View style={s.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.dot, i <= stepIdx && s.dotActive]} />
        ))}
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 24,
  },
  spinnerRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  textWrap: { alignItems: "center", gap: 4 },
  label:    { fontSize: 15, fontWeight: "600", color: "#18181b" },
  sub:      { fontSize: 12, color: "#a1a1aa" },
  track: {
    width: 220, height: 3, backgroundColor: "#e4e4e7",
    borderRadius: 999, overflow: "hidden",
  },
  fill:     { height: 3, backgroundColor: "#18181b", borderRadius: 999 },
  dots:     { flexDirection: "row", gap: 6 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e4e4e7" },
  dotActive:{ backgroundColor: "#18181b" },
});