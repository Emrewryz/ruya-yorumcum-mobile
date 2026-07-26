/**
 * components/HeaderAdButton.tsx
 *
 * Header'daki kompakt "Ücretsiz Kredi Kazan" butonu.
 * Reklam yükleme/gösterme mantığı lib/useRewardedAd.ts'de merkezileşti.
 */

import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRewardedAd } from "@/lib/useRewardedAd";

interface Props {
  onCreditEarned: () => void; // üst bileşen krediyi yeniler
}

export default function HeaderAdButton({ onCreditEarned }: Props) {
  const { watching, cooldown, handleWatch, isDisabled } = useRewardedAd(onCreditEarned);

  return (
    <TouchableOpacity
      onPress={handleWatch}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[s.btn, isDisabled && s.btnDisabled]}
    >
      {watching
        ? <ActivityIndicator color="#52525b" size="small" style={{ width: 14, height: 14 }} />
        : <Text style={[s.txt, isDisabled && s.txtDisabled]}>
            {cooldown ? `⏱ ${cooldown}` : "🎁 Ücretsiz Kredi"}
          </Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor:  "#fff",
    borderWidth:      1,
    borderColor:      "#e4e4e7",
    borderRadius:     999,
    paddingHorizontal: 11,
    paddingVertical:  7,
  },
  btnDisabled: {
    backgroundColor: "#f4f4f5",
    borderColor:     "#e4e4e7",
  },
  txt:        { fontSize: 11, fontWeight: "600", color: "#52525b" },
  txtDisabled:{ color: "#a1a1aa" },
});
