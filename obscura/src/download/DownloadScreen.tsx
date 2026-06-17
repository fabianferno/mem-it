import React, { useState } from "react";
import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import * as Network from "expo-network";
import {
  loadModel, unloadModel,
  SMOLVLM2_500M_MULTIMODAL_Q8_0, MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0, SD_V2_1_1B_Q8_0,
} from "@qvac/sdk";

export function DownloadScreen({ onReady }: { onReady: () => void }) {
  const [wifiOnly, setWifiOnly] = useState(true);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    if (wifiOnly) {
      const s = await Network.getNetworkStateAsync();
      if (s.type !== Network.NetworkStateType.WIFI) { setError("Not on Wi-Fi. Connect or disable Wi-Fi-only."); return; }
    }
    setBusy(true);
    try {
      const vlm = await loadModel({
        modelSrc: SMOLVLM2_500M_MULTIMODAL_Q8_0, modelType: "llm",
        modelConfig: { ctx_size: 1024, projectionModelSrc: MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0 },
        onProgress: (p) => setPct(p.percentage * 0.4),
      });
      await unloadModel({ modelId: vlm });
      const sd = await loadModel({
        modelSrc: SD_V2_1_1B_Q8_0, modelType: "diffusion",
        onProgress: (p) => setPct(40 + p.percentage * 0.6),
      });
      await unloadModel({ modelId: sd });
      onReady();
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) ?? "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.fill}>
      <Text style={styles.title}>One-time setup</Text>
      <Text style={styles.body}>Obscura runs entirely on your phone. It needs to download ~2.8 GB of AI models once.</Text>
      <View style={styles.row}><Text style={styles.body}>Wi-Fi only</Text><Switch value={wifiOnly} onValueChange={setWifiOnly} /></View>
      {busy ? <Text style={styles.pct}>{Math.round(pct)}%</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} disabled={busy} onPress={download}>
        <Text style={styles.btnText}>{busy ? "Downloading…" : "Download models"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000", padding: 28, justifyContent: "center", gap: 20 },
  title: { color: "#fff", fontSize: 26, fontWeight: "700" },
  body: { color: "#bbb", fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pct: { color: "#ff5b4a", fontSize: 20, textAlign: "center" },
  error: { color: "#ff5b4a" },
  btn: { backgroundColor: "#1f6feb", padding: 16, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
