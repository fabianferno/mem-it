import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

/**
 * Centered empty-state message — fills the available space and centers both
 * axes, matching the Memhive graph empty state. Use inside a flex:1 parent,
 * or a FlatList/ScrollView whose contentContainerStyle has flexGrow:1.
 */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space.xl,
  },
  text: {
    color: theme.color.textMuted,
    ...theme.type.body,
    textAlign: "center",
    lineHeight: 22,
  },
});
