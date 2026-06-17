import React from "react";
import { View, Pressable, Text, StyleSheet, Alert } from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import type { PipelineResult } from "../types";
import { BeforeAfter } from "./BeforeAfter";

export function ResultScreen({ result, onDiscard }: { result: PipelineResult; onDiscard: () => void }) {
  async function save() {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) { Alert.alert("Photos access needed to save."); return; }
    await MediaLibrary.saveToLibraryAsync(result.stylizedUri);
    Alert.alert("Saved to Photos.");
  }
  async function share() {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.stylizedUri);
  }
  return (
    <View style={styles.fill}>
      <BeforeAfter originalUri={result.originalUri} stylizedUri={result.stylizedUri} />
      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={save}><Text style={styles.btnText}>Save</Text></Pressable>
        <Pressable style={styles.btn} onPress={share}><Text style={styles.btnText}>Share</Text></Pressable>
        <Pressable style={styles.btnGhost} onPress={onDiscard}><Text style={styles.btnText}>Discard</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  actions: { flexDirection: "row", justifyContent: "space-around", padding: 20, backgroundColor: "#000" },
  btn: { backgroundColor: "#1f6feb", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 8 },
  btnGhost: { borderColor: "#666", borderWidth: 1, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "600" },
});
