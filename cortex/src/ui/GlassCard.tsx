import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../theme";

/** Translucent dark glass card — frosted surface over the black canvas. */
export function GlassCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.glassFill,
    borderWidth: 1,
    borderColor: theme.color.glassBorder,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  inner: { padding: theme.space.lg },
});
