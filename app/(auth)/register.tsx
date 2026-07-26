import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { Eye, EyeOff, Moon, Mail } from "lucide-react-native";
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

export default function RegisterScreen() {
  const insets    = useSafeAreaInsets();
  const passRef   = useRef<TextInput>(null);
  const pass2Ref  = useRef<TextInput>(null);

  const [email,      setEmail]      = useState("");
  const [password,   setPass]       = useState("");
  const [password2,  setPass2]      = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [googleLoad, setGoogleLoad] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password) return;
    if (password !== password2) { setError("Şifreler eşleşmiyor."); return; }
    if (password.length < 6)    { setError("Şifre en az 6 karakter olmalı."); return; }
    setLoading(true); setError(null);
    const { data, error: e } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: Linking.createURL("/callback") },
    });
    setLoading(false);
    if (e) { setError(e.message); return; }
    // E-posta onayı açıksa signUp oturum döndürmez — kullanıcıyı
    // onboarding'e atmak yerine onay bekleme ekranını göster.
    if (data.session) {
      router.replace("/onboarding");
    } else {
      setConfirmSent(true);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoad(true); setError(null);
    const result = await signInWithGoogle();
    if (!result.success) {
      if (result.error !== "İptal edildi.") setError(result.error);
      setGoogleLoad(false);
      return;
    }
    // Yeni kullanıcıysa onboarding'e, mevcutsa ana sayfaya
    router.replace(result.isNewUser ? "/onboarding" : "/");
  };

  if (confirmSent) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={cs.wrap}>
          <View style={s.logoBox}>
            <Mail size={28} color="#18181b" strokeWidth={1.5} />
          </View>
          <Text style={cs.title}>E-postanı kontrol et</Text>
          <Text style={cs.sub}>
            {email.trim()} adresine bir onay bağlantısı gönderdik.{"\n"}
            Hesabını aktifleştirmek için e-postandaki bağlantıya dokun.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            style={[s.submitBtn, { marginTop: 28, alignSelf: "stretch" }]}
          >
            <Text style={s.submitTxt}>Girişe Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

          <Text style={s.title}>Hesap Oluştur</Text>
          <Text style={s.subtitle}>3 kredi hoş geldin bonusu ile başla.</Text>

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
                  <Text style={s.googleTxt}>Google ile Kayıt Ol</Text>
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
                placeholder="En az 6 karakter"
                placeholderTextColor="#a1a1aa"
                secureTextEntry={!showPass}
                returnKeyType="next"
                onSubmitEditing={() => pass2Ref.current?.focus()}
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

          {/* Şifre tekrar */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>ŞİFRE TEKRAR</Text>
            <TextInput
              ref={pass2Ref}
              value={password2}
              onChangeText={setPass2}
              placeholder="Şifrenizi tekrar girin"
              placeholderTextColor="#a1a1aa"
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              style={s.input}
            />
          </View>

          {error && <Text style={s.errorTxt}>{error}</Text>}

          {/* Kayıt Butonu */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading || !email.trim() || !password || !password2}
            activeOpacity={0.85}
            style={[s.submitBtn, (loading || !email.trim() || !password || !password2) && { opacity: 0.4 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.submitTxt}>Hesap Oluştur</Text>
            }
          </TouchableOpacity>

          {/* Giriş yap */}
          <View style={s.switchRow}>
            <Text style={s.switchTxt}>Zaten hesabın var mı?</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={s.switchLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.terms}>
            Kayıt olarak{" "}
            <Text style={s.termsLink}>Kullanım Koşulları</Text>
            {" "}ve{" "}
            <Text style={s.termsLink}>Gizlilik Politikası</Text>
            {"'"}nı kabul etmiş olursunuz.
          </Text>

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
  terms:       { fontSize: 12, color: "#a1a1aa", textAlign: "center", lineHeight: 18 },
  termsLink:   { fontWeight: "600", color: "#52525b" },
});

const cs = StyleSheet.create({
  wrap:  { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  title: { fontSize: 20, fontWeight: "800", color: "#18181b", marginTop: 20, marginBottom: 8, textAlign: "center" },
  sub:   { fontSize: 14, color: "#71717a", textAlign: "center", lineHeight: 21 },
});