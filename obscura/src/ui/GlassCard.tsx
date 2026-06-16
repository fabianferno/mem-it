import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { theme } from "../theme";

export function GlassCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.wrap, style]}>
      <BlurView intensity={theme.blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: theme.radius.card, overflow: "hidden", borderWidth: 1,
    borderColor: theme.color.glassBorder, backgroundColor: theme.color.glassFill },
  inner: { padding: theme.space.lg },
});
