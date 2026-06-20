import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { theme } from "../theme";
import { PROCESSING_STAGES, STAGE_LABELS } from "../pipeline/stages";
import type { Stage } from "../types";

const ORDER: Stage[] = PROCESSING_STAGES;

/** Vertical checklist of pipeline stages with a spinner on the active one. */
export function ProcessingStages({ stage }: { stage: Stage }) {
  const activeIdx = ORDER.indexOf(stage);
  return (
    <View style={styles.wrap}>
      {ORDER.map((s, i) => {
        const done = stage === "done" || (activeIdx >= 0 && i < activeIdx);
        const active = i === activeIdx;
        return (
          <View key={s} style={styles.row}>
            <View style={styles.icon}>
              {active ? (
                <ActivityIndicator size="small" color={theme.color.ink} />
              ) : (
                <Text style={[styles.dot, done && styles.dotDone]}>{done ? "✓" : "○"}</Text>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive, done && styles.labelDone]}>
              {STAGE_LABELS[s]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.md },
  row: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
  icon: { width: 24, alignItems: "center" },
  dot: { color: theme.color.textMuted, fontSize: 16 },
  dotDone: { color: theme.color.ink },
  label: { color: theme.color.textMuted, ...theme.type.body },
  labelActive: { color: theme.color.text, fontWeight: "700" },
  labelDone: { color: theme.color.text },
});
