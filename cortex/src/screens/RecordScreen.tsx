import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { theme } from "../theme";
import { CircleButton } from "../ui/CircleButton";
import { ProcessingStages } from "../ui/ProcessingStages";
import { Waveform } from "../ui/Waveform";
import { createMeeting } from "../db/meetings";
import { WAV_16K_MONO } from "../audio/recordingOptions";
import { startSession, cancelSession, useProcessing } from "../pipeline/sessionRunner";

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function RecordScreen({
  onReview,
  onCancel,
}: {
  onReview: (meetingId: string) => void;
  onCancel: () => void;
}) {
  const recorder = useAudioRecorder(WAV_16K_MONO);
  const recState = useAudioRecorderState(recorder);
  const proc = useProcessing();
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const myMeeting = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) Alert.alert("Microphone needed", "Enable mic access to record mems.");
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    })();
  }, []);

  useEffect(() => {
    if (!recState.isRecording) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => clearInterval(t);
  }, [recState.isRecording]);

  // Once transcript + summary are ready, hand the user to the meeting; the
  // graph + embeddings keep building in the background.
  useEffect(() => {
    if (proc.reviewReady && myMeeting.current) {
      const id = myMeeting.current;
      myMeeting.current = null;
      onReview(id);
    }
  }, [proc.reviewReady, onReview]);

  async function start() {
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
    myMeeting.current = m.id;
    startSession(m.id, uri);
  }

  async function discardRecording() {
    try {
      if (recState.isRecording) await recorder.stop();
    } catch {}
    onCancel();
  }

  function cancelProcessing() {
    cancelSession();
    myMeeting.current = null;
    onCancel();
  }

  // --- Processing view ---
  if (proc.active) {
    return (
      <View style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.heading}>Processing meeting</Text>
          <Text style={styles.subtle}>You'll be taken to it once the summary is ready.</Text>
          <View style={{ height: theme.space.xl }} />
          <ProcessingStages stage={proc.stage} />
        </View>
        <Pressable style={styles.secondaryBtn} onPress={cancelProcessing}>
          <Text style={styles.secondaryText}>Cancel & discard</Text>
        </Pressable>
      </View>
    );
  }

  // --- Recording / idle view ---
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        {recState.isRecording && <Waveform active={recState.isRecording} />}
        <Text style={styles.timer}>{fmt(elapsed)}</Text>
        <Text style={styles.subtle}>
          {recState.isRecording ? "Listening…" : "Tap to record"}
        </Text>
      </View>
      <View style={styles.controls}>
        <CircleButton
          size={92}
          filled={!recState.isRecording}
          onPress={recState.isRecording ? stop : start}
          style={recState.isRecording ? styles.recording : undefined}
        >
          <View style={recState.isRecording ? styles.stopSquare : styles.recDot} />
        </CircleButton>
        <Pressable style={styles.secondaryBtn} onPress={discardRecording}>
          <Text style={styles.secondaryText}>
            {recState.isRecording ? "Discard" : "Back"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.space.xl },
  heading: { color: theme.color.text, ...theme.type.heading },
  subtle: { color: theme.color.textMuted, ...theme.type.caption, marginTop: theme.space.sm },
  timer: { color: theme.color.text, fontSize: 52, fontWeight: "800", letterSpacing: 2 },
  controls: { alignItems: "center", paddingVertical: theme.space.xl, gap: theme.space.lg },
  recording: { borderColor: theme.color.accent },
  recDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.color.accent },
  stopSquare: { width: 28, height: 28, borderRadius: 6, backgroundColor: theme.color.accent },
  secondaryBtn: { alignSelf: "center", padding: theme.space.md },
  secondaryText: { color: theme.color.textMuted, ...theme.type.body },
});
