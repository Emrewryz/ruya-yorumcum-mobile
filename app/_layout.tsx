import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import SplashOverlay from "@/components/SplashOverlay";

const TEST_DEVICE_IDS = ["EMULATOR"];

async function initAds() {
  try {
    const MobileAds = require("react-native-google-mobile-ads").default;
    await MobileAds().setRequestConfiguration({ testDeviceIdentifiers: TEST_DEVICE_IDS });
    await MobileAds().initialize();
  } catch {}
}

function AuthGuard({ session, ready }: { session: Session | null; ready: boolean }) {
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth)       router.replace("/(auth)/login");
    else if (session && inAuth)    router.replace("/");
  }, [session, ready, segments]);

  return null;
}

export default function RootLayout() {
  const [session,    setSession]    = useState<Session | null>(null);
  const [authReady,  setAuthReady]  = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initAds();

    supabase.auth.getSession().then(({ data, error }) => {
      if (!error && data.session) setSession(data.session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />

      {/* Stack her zaman render'da — arka planda hazırlanır */}
      <Stack
        screenOptions={{
          headerShown:  false,
          contentStyle: { backgroundColor: "#fff" },
          // Android'de iOS gibi yumuşak sağdan giriş
          animation:    "ios_from_right",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            contentStyle: { backgroundColor: "#fafafa" },
            animation:    "fade",
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ contentStyle: { backgroundColor: "#fff" }, animation: "fade" }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: "modal",
            contentStyle: { backgroundColor: "#f9f9f9" },
            animation:    "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="credit-shop"
          options={{
            presentation: "modal",
            contentStyle: { backgroundColor: "#fafafa" },
            animation:    "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="dictionary"
          options={{
            contentStyle: { backgroundColor: "#f9f9f9" },
            animation:    "ios_from_right",
          }}
        />
        <Stack.Screen
          name="dictionary-detail"
          options={{
            contentStyle: { backgroundColor: "#fff" },
            animation:    "ios_from_right",
          }}
        />
        <Stack.Screen
          name="tests"
          options={{
            contentStyle: { backgroundColor: "#f9f9f9" },
            animation:    "ios_from_right",
          }}
        />
        <Stack.Screen
          name="test-detail"
          options={{
            contentStyle: { backgroundColor: "#fff" },
            animation:    "ios_from_right",
          }}
        />
      </Stack>

      {/* Splash — Stack render olurken üstünü kaplar, kopukluk olmaz */}
      {!splashDone && (
        <SplashOverlay
          authReady={authReady}
          onFinish={() => setSplashDone(true)}
        />
      )}

      {/* Auth yönlendirme — splash bittikten sonra aktif */}
      <AuthGuard session={session} ready={authReady && splashDone} />
    </View>
  );
}