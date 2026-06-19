import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

// Approximate a radial glow with a soft blurred gradient disc.
export function Glow({ size = 280, style }: { size?: number; style?: any }) {
  return (
    <View pointerEvents="none" style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <LinearGradient
        colors={[theme.color.accent, theme.color.accentWarm, "transparent"]}
        style={{ width: size, height: size, borderRadius: size / 2, opacity: 0.55 }}
        start={{ x: 0.3, y: 0.2 }} end={{ x: 0.8, y: 0.9 }}
      />
    </View>
  );
}
const _g = StyleSheet;
