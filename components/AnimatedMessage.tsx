import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

export interface ChatMsg {
  id:      string;
  role:    "user" | "assistant";
  content: string;
}

export default function AnimatedMessage({ msg, showLabel = false }: { msg: ChatMsg; showLabel?: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const isUser = msg.role === "user";
  return (
    <Animated.View style={{ opacity, transform: [{ translateY: ty }], marginBottom: 20 }}>
      {!isUser && showLabel && <Text style={s.label}>ANALİZ</Text>}
      <View style={isUser ? s.userBubble : s.aiBubble}>
        <Text style={isUser ? s.userTxt : s.aiTxt}>{msg.content}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  label:      { fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: 1.5, marginBottom: 10 },
  aiBubble:   { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 16, paddingVertical: 14 },
  aiTxt:      { fontSize: 15, color: "#18181b", lineHeight: 25 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#18181b", borderRadius: 18, borderBottomRightRadius: 5, paddingHorizontal: 16, paddingVertical: 12, maxWidth: "82%" },
  userTxt:    { fontSize: 14, color: "#fff", lineHeight: 22 },
});