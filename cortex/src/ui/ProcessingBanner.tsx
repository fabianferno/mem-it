import React from "react";
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { theme } from "../theme";
import { useProcessing, cancelSession } from "../pipeline/sessionRunner";
import { STAGE_LABELS } from "../pipeline/stages";

/** Compact global progress strip shown while a session processes in the background. */
export function ProcessingBanner() {
  const proc = useProcessing();
  if (!proc.active) return null;
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="small" color={theme.color.ink} />
      <Text style={styles.text} numberOfLines={1}>
        {STAGE_LABELS[proc.stage]}…
      </Text>
      <Pressable hitSlop={8} onPress={cancelSession}>
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    backgroundColor: theme.color.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.glassBorder,
  },
  text: { flex: 1, color: theme.color.text, ...theme.type.caption },
  cancel: { color: theme.color.danger, ...theme.type.caption, fontWeight: "700" },
});
