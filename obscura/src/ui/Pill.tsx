import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { theme } from "../theme";

export function Pill({ label, onPress, variant = "glass", disabled, style }: {
  label: string; onPress?: () => void; variant?: "glass" | "solid" | "ghost"; disabled?: boolean; style?: ViewStyle;
}) {
  const inner = <Text style={styles.label}>{label}</Text>;
  if (variant === "glass") {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={[styles.base, style]}>
        <BlurView intensity={theme.blurIntensity} tint="dark" style={styles.glass}>{inner}</BlurView>
      </Pressable>
    );
  }
  const bg = variant === "solid" ? theme.color.accent : "transparent";
  const border = variant === "ghost" ? theme.color.glassBorder : "transparent";
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={[styles.base, { backgroundColor: bg, borderColor: border, borderWidth: variant === "ghost" ? 1 : 0, opacity: disabled ? 0.5 : 1 }, style]}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: theme.radius.pill, overflow: "hidden" },
  glass: { paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm,
    borderWidth: 1, borderColor: theme.color.glassBorder, backgroundColor: theme.color.glassFill, borderRadius: theme.radius.pill },
  label: { color: theme.color.text, fontWeight: "600", paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm },
});
