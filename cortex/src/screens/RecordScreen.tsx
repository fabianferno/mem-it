import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { theme } from "../theme";
import { CircleButton } from "../ui/CircleButton";
import { GraphWebView, GraphHandle } from "../graph3d/GraphWebView";
import { STAGE_LABELS } from "../pipeline/stages";
import { runSession } from "../pipeline/runSession";
import { createMeeting } from "../db/meetings";
import { WAV_16K_MONO } from "../audio/recordingOptions";
import type { Stage } from "../types";

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function RecordScreen({ onDone }: { onDone: (meetingId: string) => void }) {
  const recorder = useAudioRecorder(WAV_16K_MONO);
  const recState = useAudioRecorderState(recorder);
  const graph = useRef<GraphHandle>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) Alert.alert("Microphone needed", "Enable mic access to record meetings.");
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    })();
  }, []);

  useEffect(() => {
    if (!recState.isRecording) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => clearInterval(t);
  }, [recState.isRecording]);

  async function start() {
    setStage("idle");
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
    setElapsed(0);
  }

  async function stop() {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) {
      Alert.alert("No audio", "Recording produced no file.");
      return;
    }
    const m = createMeeting({ title: `Meeting ${new Date().toLocaleString()}`, audioUri: uri });
    setMeetingId(m.id);
    try {
      await runSession({
        meetingId: m.id,
        wavUri: uri,
        onStage: setStage,
        onNode: (n) =>
          graph.current?.addNode({ id: n.label, label: n.label, type: n.type, mentionCount: 1 }),
        onEdge: (e) => graph.current?.addEdge({ srcId: e.src, dstId: e.dst, relation: e.relation }),
      });
      onDone(m.id);
    } catch (err: any) {
      Alert.alert("Processing failed", String(err?.message ?? err));
    }
  }

  const busy = stage !== "idle" && stage !== "done" && stage !== "error";

  return (
    <View style={styles.root}>
      <View style={styles.graph}>
        <GraphWebView ref={graph} />
      </View>
      <View style={styles.controls}>
        <Text style={styles.timer}>{fmt(elapsed)}</Text>
        <Text style={styles.stage}>
          {busy ? STAGE_LABELS[stage] : recState.isRecording ? "Recording…" : "Tap to record"}
        </Text>
        <CircleButton
          size={88}
          filled={!recState.isRecording}
          onPress={recState.isRecording ? stop : busy ? undefined : start}
          style={recState.isRecording ? styles.recording : undefined}
        >
          <View style={recState.isRecording ? styles.stopSquare : styles.recDot} />
        </CircleButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  graph: { flex: 1 },
  controls: { alignItems: "center", paddingVertical: theme.space.lg, gap: theme.space.sm },
  timer: { color: theme.color.text, fontSize: 34, fontWeight: "800", letterSpacing: 2 },
  stage: { color: theme.color.textMuted, ...theme.type.caption },
  recording: { borderColor: theme.color.accent },
  recDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.color.accent },
  stopSquare: { width: 26, height: 26, borderRadius: 6, backgroundColor: theme.color.accent },
});
