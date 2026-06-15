/**
 * components/SplashOverlay.tsx
 * Auth hazır olduğunda fade-out başlar.
 */

import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Moon } from "lucide-react-native";

interface Props {
  authReady: boolean;   // auth kontrolü bitti mi?
  onFinish:  () => void;
}

export default function SplashOverlay({ authReady, onFinish }: Props) {
  const iconScale   = useRef(new Animated.Value(0.7)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(14)).current;
  const overlayOp   = useRef(new Animated.Value(1)).current;
  const exitStarted = useRef(false);

  // Giriş animasyonu — mount'ta başlar
  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1, tension: 55, friction: 9, useNativeDriver: true,
      }),
      Animated.timing(iconOpacity, {
        toValue: 1, duration: 450, useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1, duration: 350, useNativeDriver: true,
        }),
        Animated.spring(textY, {
          toValue: 0, tension: 70, friction: 13, useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  // Auth hazır olduğunda çıkış animasyonu
  useEffect(() => {
    if (!authReady || exitStarted.current) return;
    exitStarted.current = true;

    // Minimum 1.4 saniye göster, auth daha hızlı biterse bekle
    setTimeout(() => {
      Animated.timing(overlayOp, {
        toValue: 0, duration: 400, useNativeDriver: true,
      }).start(() => onFinish());
    }, 1400);
  }, [authReady]);

  return (
    <Animated.View style={[s.overlay, { opacity: overlayOp }]}>
      <Animated.View style={[
        s.iconWrap,
        { opacity: iconOpacity, transform: [{ scale: iconScale }] },
      ]}>
        <Moon size={38} color="#18181b" strokeWidth={1.5} />
      </Animated.View>

      <Animated.View style={{
        opacity:   textOpacity,
        transform: [{ translateY: textY }],
        alignItems: "center",
        marginTop:  22,
      }}>
        <Text style={s.appName}>Rüya Yorumcum</Text>
        <Text style={s.appSub}>Yapay zeka ile rüya analizi</Text>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          999,
  },
  iconWrap: {
    width:           88,
    height:          88,
    borderRadius:    28,
    backgroundColor: "#f4f4f5",
    alignItems:      "center",
    justifyContent:  "center",
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.08,
    shadowRadius:    16,
    elevation:       6,
  },
  appName: {
    fontSize:      24,
    fontWeight:    "800",
    color:         "#18181b",
    letterSpacing: -0.5,
  },
  appSub: {
    fontSize:  13,
    color:     "#a1a1aa",
    marginTop: 6,
  },
});