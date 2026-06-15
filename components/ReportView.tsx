/**
 * components/ReportView.tsx
 *
 * Kilidi açılmış tek sayfa tahlil raporu.
 * Yukarıdan aşağıya akan bölümler:
 *   1. Detaylı Tahlil  (islami + psikolojik ayrı alt başlıklarla)
 *   2. Semboller       (staggered animasyonlu liste)
 *   3. Kilit açıldı rozeti
 *
 * index.tsx'te yalnızca <ReportView ai={ai} /> ile çağrılır.
 */

import { useEffect, useRef } from "react";
import {
  View, Text, Animated, StyleSheet,
} from "react-native";
import { Brain, BookOpen, FileText, Moon, CheckCircle } from "lucide-react-native";
import type { AiResponse } from "@/app/index";   // paylaşılan tip

// ─── Sembol Satırı ────────────────────────────────────────────────────────────

function SymbolRow({ text, index }: { text: string; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const tx      = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 260, delay: index * 70, useNativeDriver: true,
      }),
      Animated.spring(tx, {
        toValue: 0, tension: 90, friction: 16, delay: index * 70, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[r.symbolRow, { opacity, transform: [{ translateX: tx }] }]}>
      <View style={r.symbolBar} />
      <Text style={r.symbolTxt}>{text.trim()}</Text>
    </Animated.View>
  );
}

// ─── Bölüm Başlığı ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title,
}: { icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>; title: string }) {
  return (
    <View style={r.sectionHeader}>
      <View style={r.iconWrap}>
        <Icon size={14} color="#18181b" strokeWidth={1.5} />
      </View>
      <Text style={r.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

interface Props { ai: AiResponse; }

export default function ReportView({ ai }: Props) {
  const symbolLines = ai.semboller
    ? ai.semboller.split("\n").filter((l) => l.trim())
    : [];

  // Detaylı tahlil metni: islami + psiko varsa onları kullan, yoksa detayli_tahlil
  const hasAyrinti = !!(ai.islami_analiz || ai.psikolojik_analiz);
  const detayli    = !hasAyrinti
    ? (ai.detayli_tahlil || "")
    : "";

  return (
    <View>

      {/* ── 1. Detaylı Tahlil ─────────────────────────────────────────── */}
      <View style={r.card}>
        <SectionHeader icon={Brain} title="DETAYLI RÜYA TAHLİLİ" />

        {/* Ayrı bölümler: İslami */}
        {ai.islami_analiz && (
          <>
            <View style={r.subHeader}>
              <BookOpen size={12} color="#71717a" strokeWidth={1.5} />
              <Text style={r.subTitle}>İslami Tabir</Text>
            </View>
            {ai.islami_analiz.split("\n\n").filter(Boolean).map((p, i) => (
              <Text key={`islami-${i}`} style={r.bodyTxt}>{p.trim()}</Text>
            ))}
          </>
        )}

        {/* Ayrı bölümler: Psikolojik */}
        {ai.psikolojik_analiz && (
          <>
            <View style={[r.subHeader, ai.islami_analiz ? { marginTop: 20 } : undefined]}>
              <FileText size={12} color="#71717a" strokeWidth={1.5} />
              <Text style={r.subTitle}>Psikolojik Analiz</Text>
            </View>
            {ai.psikolojik_analiz.split("\n\n").filter(Boolean).map((p, i) => (
              <Text key={`psiko-${i}`} style={r.bodyTxt}>{p.trim()}</Text>
            ))}
          </>
        )}

        {/* Birleşik detayli_tahlil (ayrıntı yoksa) */}
        {!hasAyrinti && detayli.split("\n\n").filter(Boolean).map((p, i) => (
          <Text key={`detay-${i}`} style={r.bodyTxt}>{p.trim()}</Text>
        ))}
      </View>

      {/* ── 2. Semboller ──────────────────────────────────────────────── */}
      {symbolLines.length > 0 && (
        <View style={r.card}>
          <SectionHeader icon={Moon} title="SEMBOLLER" />
          {symbolLines.map((line, i) => (
            <SymbolRow key={i} text={line} index={i} />
          ))}
        </View>
      )}

      {/* ── 3. Kilit açıldı rozeti ────────────────────────────────────── */}
      <View style={r.badge}>
        <CheckCircle size={13} color="#10b981" strokeWidth={1.5} />
        <Text style={r.badgeTxt}>Tüm analizler açıldı</Text>
      </View>

    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────

const r = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7",
    borderRadius: 18, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },

  // Bölüm başlığı
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#f4f4f5",
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 10, fontWeight: "700", color: "#71717a", letterSpacing: 1.5,
  },

  // Alt başlık (İslami / Psikolojik)
  subHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  subTitle:  { fontSize: 12, fontWeight: "600", color: "#71717a" },

  // Paragraf
  bodyTxt: {
    fontSize: 15, color: "#3f3f46", lineHeight: 27, marginBottom: 12,
  },

  // Sembol satırı
  symbolRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#fafafa",
  },
  symbolBar: {
    width: 3, minHeight: 18, borderRadius: 999,
    backgroundColor: "#d4d4d8", marginTop: 4,
  },
  symbolTxt: { flex: 1, fontSize: 14, color: "#3f3f46", lineHeight: 22 },

  // Kilit açıldı rozeti
  badge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8,
  },
  badgeTxt: { fontSize: 12, fontWeight: "500", color: "#16a34a" },
});