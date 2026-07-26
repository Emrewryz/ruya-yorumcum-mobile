import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Eye, EyeOff, Moon } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { configureGoogle, signInWithGoogle } from "@/lib/googleAuth";

configureGoogle();

function GoogleIcon() {
  return (
    <View style={g.wrap}>
      <Text style={g.txt}>G</Text>
    </View>
  );
}
const g = StyleSheet.create({
  wrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  txt:  { fontSize: 13, fontWeight: "800", color: "#4285F4" },
});

export default function LoginScreen() {
  const insets  = useSafeAreaInsets();
  const passRef = useRef<TextInput>(null);

  const [email,      setEmail]      = useState("");
  const [password,   setPass]       = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [googleLoad, setGoogleLoad] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password) return;
    setLoading(true); setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    if (e) { setError(e.message); setLoading(false); return; }
    router.replace("/");
  };

  const handleGoogle = async () => {
    setGoogleLoad(true); setError(null);
    const result = await signInWithGoogle();
    if (!result.success) {
      if (result.error !== "İptal edildi.") setError(result.error);
      setGoogleLoad(false);
      return;
    }
    // Giriş yapınca ana sayfaya veya yeni kullanıcıysa onboarding'e yönlendir
    router.replace(result.isNewUser ? "/onboarding" : "/");
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoBox}>
              <Moon size={28} color="#18181b" strokeWidth={1.5} />
            </View>
            <Text style={s.logoTxt}>Rüya Yorumcum</Text>
            <Text style={s.logoSub}>Yapay zeka ile rüya analizi</Text>
          </View>

          <Text style={s.title}>Tekrar Hoş Geldin</Text>
          <Text style={s.subtitle}>Rüyalarının şifresini çözmeye devam et.</Text>

          {/* Google — beyaz */}
          <TouchableOpacity
            onPress={handleGoogle}
            disabled={googleLoad || loading}
            activeOpacity={0.85}
            style={s.googleBtn}
          >
            {googleLoad
              ? <ActivityIndicator color="#18181b" size="small" />
              : <>
                  <GoogleIcon />
                  <Text style={s.googleTxt}>Google ile Giriş Yap</Text>
                </>
            }
          </TouchableOpacity>

          {/* Ayırıcı */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>veya e-posta ile</Text>
            <View style={s.dividerLine} />
          </View>

          {/* E-posta */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>E-POSTA</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              placeholderTextColor="#a1a1aa"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              style={s.input}
            />
          </View>

          {/* Şifre */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>ŞİFRE</Text>
            <View>
              <TextInput
                ref={passRef}
                value={password}
                onChangeText={setPass}
                placeholder="Şifrenizi girin"
                placeholderTextColor="#a1a1aa"
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={s.input}
              />
              <TouchableOpacity
                onPress={() => setShowPass((v) => !v)}
                style={s.eyeBtn}
              >
                {showPass
                  ? <EyeOff size={17} color="#a1a1aa" strokeWidth={1.5} />
                  : <Eye    size={17} color="#a1a1aa" strokeWidth={1.5} />
                }
              </TouchableOpacity>
            </View>
          </View>

          {error && <Text style={s.errorTxt}>{error}</Text>}

          {/* Giriş Butonu */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading || !email.trim() || !password}
            activeOpacity={0.85}
            style={[s.submitBtn, (loading || !email.trim() || !password) && { opacity: 0.4 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.submitTxt}>Giriş Yap</Text>
            }
          </TouchableOpacity>

          {/* Kayıt ol */}
          <View style={s.switchRow}>
            <Text style={s.switchTxt}>Hesabın yok mu?</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={s.switchLink}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: "#fff" },
  content:     { paddingHorizontal: 24, paddingTop: 32 },
  logoWrap:    { alignItems: "center", marginBottom: 36 },
  logoBox:     { width: 64, height: 64, borderRadius: 20, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoTxt:     { fontSize: 20, fontWeight: "800", color: "#18181b" },
  logoSub:     { fontSize: 13, color: "#a1a1aa", marginTop: 4 },
  title:       { fontSize: 26, fontWeight: "800", color: "#18181b", marginBottom: 6 },
  subtitle:    { fontSize: 14, color: "#71717a", marginBottom: 20 },

  // Google — beyaz
  googleBtn:   {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5, borderColor: "#e4e4e7",
    borderRadius: 14, paddingVertical: 15, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  googleTxt:   { fontSize: 15, fontWeight: "600", color: "#18181b" },

  dividerRow:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e4e4e7" },
  dividerTxt:  { fontSize: 13, color: "#a1a1aa" },

  field:       { marginBottom: 16 },
  fieldLabel:  { fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: 1.2, marginBottom: 8 },
  input:       { backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#18181b" },
  eyeBtn:      { position: "absolute", right: 14, top: 14 },
  errorTxt:    { fontSize: 13, color: "#ef4444", textAlign: "center", marginBottom: 16 },
  submitBtn:   { backgroundColor: "#18181b", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 20 },
  submitTxt:   { fontSize: 15, fontWeight: "700", color: "#fff" },
  switchRow:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 },
  switchTxt:   { fontSize: 14, color: "#71717a" },
  switchLink:  { fontSize: 14, fontWeight: "700", color: "#18181b" },
});