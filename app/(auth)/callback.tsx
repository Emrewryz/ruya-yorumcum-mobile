/**
 * app/(auth)/callback.tsx  →  route: /callback
 *
 * E-posta onay bağlantısından (register.tsx → emailRedirectTo) dönen
 * deep link'i yakalar, Supabase oturumunu kurar ve onboarding'e yönlendirir.
 *
 * (auth) grubu altında olması bilinçli: _layout.tsx'teki AuthGuard, oturum
 * kurulana kadar geçen sürede segments[0] === "(auth)" olan ekranları
 * login'e zorla yönlendirmeden muaf tutuyor — bu ekran o gruba dahil
 * olmasaydı, oturum henüz kurulmadan AuthGuard araya girip login'e
 * fırlatırdı.
 *
 * Supabase projesinin Auth → URL Configuration → Redirect URLs listesine
 * bu uygulamanın şeması (ör. ruyayorumcum://callback) eklenmiş olmalı,
 * aksi halde Supabase bu adrese yönlendirmeyi reddeder.
 */

import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { Moon, AlertCircle } from "lucide-react-native";
import { supabase } from "@/lib/supabase";

// Supabase yönlendirmesi bazen tokenları query'de (?code=...) bazen
// hash'te (#access_token=...&refresh_token=...) gönderir — ikisini de topla.
function extractParams(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  const segments = url.split(/[?#]/).slice(1);
  for (const segment of segments) {
    for (const pair of segment.split("&")) {
      if (!pair) continue;
      const [key, value] = pair.split("=");
      if (key) result[decodeURIComponent(key)] = decodeURIComponent(value ?? "");
    }
  }
  return result;
}

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<"working" | "error">("working");

  useEffect(() => {
    let mounted = true;

    async function handle(url: string | null) {
      if (!url) return;
      const params = extractParams(url);

      try {
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        } else if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token:  params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;
        } else {
          throw new Error("Onay bilgisi bulunamadı.");
        }
        if (mounted) router.replace("/onboarding");
      } catch {
        if (mounted) setStatus("error");
      }
    }

    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (e) => handle(e.url));

    return () => { mounted = false; sub.remove(); };
  }, []);

  if (status === "error") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <AlertCircle size={32} color="#ef4444" strokeWidth={1.5} />
          <Text style={s.title}>Onay bağlantısı geçersiz</Text>
          <Text style={s.sub}>Lütfen giriş ekranından tekrar deneyin.</Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={s.btn}>
            <Text style={s.btnTxt}>Girişe Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Moon size={28} color="#18181b" strokeWidth={1.5} />
        <ActivityIndicator color="#18181b" style={{ marginTop: 16 }} />
        <Text style={s.sub}>Hesabın onaylanıyor...</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 32 },
  title:  { fontSize: 17, fontWeight: "700", color: "#18181b", marginTop: 12, textAlign: "center" },
  sub:    { fontSize: 13, color: "#71717a", textAlign: "center", marginTop: 4 },
  btn:    { marginTop: 20, backgroundColor: "#18181b", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  btnTxt: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
