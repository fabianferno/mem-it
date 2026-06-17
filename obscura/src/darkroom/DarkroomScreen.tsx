import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import type { Stage, StylePreset, PipelineResult } from "../types";
import { runPipeline, PipelineHandle } from "../qvac/pipeline";
import { normalizeError } from "../qvac/errors";
import { StageIndicator } from "./StageIndicator";
import { theme } from "../theme";
import { Glow } from "../ui/Glow";
import { GlassCard } from "../ui/GlassCard";
import { Pill } from "../ui/Pill";

export function DarkroomScreen({ photoUri, preset, onDone, onError, onCancelled }: {
  photoUri: string;
  preset: StylePreset;
  onDone: (r: PipelineResult) => void;
  onError: (message: string, retriable: boolean) => void;
  onCancelled: () => void;
}) {
  const [stage, setStage] = useState<Stage>("loading-vlm");
  const [percent, setPercent] = useState(0);
  const handle = useRef<PipelineHandle | null>(null);

  useEffect(() => {
    const h = runPipeline({
      photoUri,
      preset,
      onStage: (s) => { setStage(s); setPercent(0); Haptics.selectionAsync(); },
      onProgress: (_s, p) => setPercent(p),
    });
    handle.current = h;
    h.promise.then(onDone).catch((err) => {
      const n = normalizeError(err);
      if (n.kind === "cancelled") onCancelled();
      else onError(n.message, n.retriable);
    });
    return () => { h.cancel(); };
  }, [photoUri, preset]);

  // Hero screen — METAMUSIC aesthetic: glowing safelight blob behind a frosted glass card.
  return (
    <View style={styles.fill}>
      <Glow size={320} style={styles.glow} />
      <GlassCard style={styles.card}>
        <StageIndicator stage={stage} percent={percent} />
      </GlassCard>
      <Pill label="Cancel" variant="glass" onPress={() => handle.current?.cancel()} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.bg, alignItems: "center", justifyContent: "center", gap: theme.space.xl },
  glow: { position: "absolute" },
  card: { minWidth: 300, alignItems: "center" },
});
