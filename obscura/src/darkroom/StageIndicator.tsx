import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Stage } from "../types";
import { theme } from "../theme";
import { DisplayHeading } from "../ui/DisplayHeading";

const LABELS: Partial<Record<Stage, string>> = {
  capturing: "Expose",
  "downloading-models": "Preparing chemicals",
  "loading-vlm": "Develop",
  captioning: "Develop",
  "unloading-vlm": "Develop",
  "loading-diffusion": "Fix",
  stylizing: "Fix",
  "unloading-diffusion": "Fix",
  done: "Wash & dry",
};

export function StageIndicator({ stage, percent }: { stage: Stage; percent: number }) {
  return (
    <View style={styles.wrap}>
      <DisplayHeading color={theme.color.accent}>{LABELS[stage] ?? "…"}</DisplayHeading>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
      </View>
      <Text style={styles.pct}>{Math.round(percent)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: theme.space.sm },
  barBg: { width: 240, height: 8, borderRadius: 4, backgroundColor: theme.color.accentDim, overflow: "hidden" },
  barFill: { height: 8, backgroundColor: theme.color.accent },
  pct: { color: theme.color.textMuted },
});
