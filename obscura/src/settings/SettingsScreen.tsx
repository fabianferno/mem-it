import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
// deleteCache from @qvac/sdk clears KV/prompt caches (not model weight files on disk).
// Model weights are managed by the SDK's own storage; we clear the first-run sentinel
// so weights re-download on next launch, and call deleteCache({ all: true }) to flush
// any in-memory context caches.
import { deleteCache } from "@qvac/sdk";

export function SettingsScreen({ onBack, onCacheCleared }: { onBack: () => void; onCacheCleared: () => void }) {
  const [docSize, setDocSize] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory!);
      setDocSize(info.exists ? info.size : null);
    })();
  }, []);

  async function clearCache() {
    try {
      // Flush KV/prompt caches via SDK
      await deleteCache({ all: true });
    } catch {
      // Best-effort — ignore if nothing to clear
    }
    try {
      // Remove sentinel so models re-download on next launch
      await FileSystem.deleteAsync(`${FileSystem.documentDirectory}models-ready`, { idempotent: true });
    } catch {
      // Ignore
    }
    Alert.alert("Cache cleared", "Models will re-download on next launch.", [{ text: "OK", onPress: onCacheCleared }]);
  }

  return (
    <View style={styles.fill}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.body}>App storage: {docSize != null ? `${(docSize / 1e6).toFixed(0)} MB` : "—"}</Text>
      <Text style={styles.note}>Models are multi-GB and cached on device. Clearing forces a re-download.</Text>
      <Pressable style={styles.btn} onPress={clearCache}><Text style={styles.btnText}>Clear model cache</Text></Pressable>
      <Pressable style={styles.ghost} onPress={onBack}><Text style={styles.btnText}>Back</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000", padding: 28, gap: 18, justifyContent: "center" },
  title: { color: "#fff", fontSize: 26, fontWeight: "700" },
  body: { color: "#fff", fontSize: 16 },
  note: { color: "#999" },
  btn: { backgroundColor: "#b3261e", padding: 14, borderRadius: 10, alignItems: "center" },
  ghost: { borderColor: "#666", borderWidth: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});
