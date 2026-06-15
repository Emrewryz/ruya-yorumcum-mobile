import { useRef, useEffect } from "react";
import {
  View, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Keyboard,
  Animated, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUp } from "lucide-react-native";

interface Props {
  value:       string;
  onChange:    (t: string) => void;
  onSend:      () => void;
  canSend:     boolean;
  sending:     boolean;
  loading:     boolean;
  placeholder: string;
}

export default function FloatingInput({
  value, onChange, onSend, canSend, sending, loading, placeholder,
}: Props) {
  const insets     = useSafeAreaInsets();
  const bottomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const base = insets.bottom > 0 ? insets.bottom : 12;
    bottomAnim.setValue(base);

    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        Animated.timing(bottomAnim, {
          toValue:  e.endCoordinates.height + 60,
          duration: Platform.OS === "ios" ? 250 : 50,
          useNativeDriver: false,
        }).start();
      },
    );

    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(bottomAnim, {
          toValue:  base,
          duration: Platform.OS === "ios" ? 250 : 50,
          useNativeDriver: false,
        }).start();
      },
    );

    return () => { show.remove(); hide.remove(); };
  }, [insets.bottom]);

  const disabled = !canSend || loading;

  return (
    <Animated.View style={[s.outer, { bottom: bottomAnim }]}>
      {/* Beyaz bant — klavye arka planı saydam siyah görünmez */}
      <View style={s.bar}>
        <View style={s.card}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#6b6b6b"
            multiline
            maxLength={1000}
            scrollEnabled
            style={s.input}
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={disabled}
            activeOpacity={0.8}
            style={[s.sendBtn, disabled && s.sendBtnDisabled]}
          >
            {sending || loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <ArrowUp size={17} color={disabled ? "#555" : "#fff"} strokeWidth={2.5} />
            }
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  outer: {
    position: "absolute",
    left: 0, right: 0,
    zIndex: 100,
  },
  bar: {
    backgroundColor: "#fafafa",
    borderTopWidth:  1,
    borderTopColor:  "#ebebeb",
    paddingHorizontal: 14,
    paddingTop:  10,
    paddingBottom: 8,
  },
  card: {
    flexDirection:   "row",
    alignItems:      "flex-end",
    backgroundColor: "#1c1c1e",
    borderRadius:    26,
    paddingLeft:     18,
    paddingRight:    8,
    paddingTop:      10,
    paddingBottom:   8,
    gap:             8,
    shadowColor:    "#000",
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.15,
    shadowRadius:   12,
    elevation:      8,
  },
  input: {
    flex:          1,
    fontSize:      16,
    color:         "#f5f5f5",
    lineHeight:    22,
    maxHeight:     120,
    minHeight:     36,
    paddingTop:    4,
    paddingBottom: 6,
  },
  sendBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: "#fff",
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    1,
  },
  sendBtnDisabled: {
    backgroundColor: "#3a3a3c",
  },
});