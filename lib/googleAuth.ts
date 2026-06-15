/**
 * lib/googleAuth.ts
 */

import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { supabase } from "@/lib/supabase";

export function configureGoogle() {
  GoogleSignin.configure({
    webClientId: "137137415580-hq2tvv602kfnqvs7li6dspc5tkipb177.apps.googleusercontent.com",
    scopes: ["profile", "email"],
    offlineAccess: true,
  });
}

export type GoogleAuthResult =
  | { success: true; isNewUser: boolean }
  | { success: false; error: string };

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Her seferinde hesap seçici çıksın diye önce çıkış yap
    await GoogleSignin.signOut();

    const response = await GoogleSignin.signIn();
    const idToken  = response.data?.idToken;

    if (!idToken) return { success: false, error: "Google token alınamadı." };

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token:    idToken,
    });

    if (error) return { success: false, error: error.message };

    // Yeni kullanıcı mı? → created_at ile now arasındaki farka bak
    const createdAt  = new Date(data.user?.created_at ?? 0).getTime();
    const isNewUser  = Date.now() - createdAt < 10_000; // 10 saniyeden yeni

    return { success: true, isNewUser };

  } catch (e: any) {
    if (e.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: "İptal edildi." };
    }
    if (e.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: "Giriş zaten devam ediyor." };
    }
    if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: "Google Play Services bulunamadı." };
    }
    return { success: false, error: "Google ile giriş başarısız." };
  }
}

export async function signOutGoogle() {
  try { await GoogleSignin.signOut(); } catch {}
}