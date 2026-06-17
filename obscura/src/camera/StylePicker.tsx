import React from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import { PRESETS } from "../qvac/presets";

export function StylePicker({ photoUri, onPick, onRetake }: {
  photoUri: string;
  onPick: (presetId: string) => void;
  onRetake: () => void;
}) {
  return (
    <View style={styles.fill}>
      <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
      <ScrollView horizontal style={styles.row} contentContainerStyle={styles.rowContent}>
        {PRESETS.map((p) => (
          <Pressable key={p.id} style={styles.chip} onPress={() => onPick(p.id)}>
            <Text style={styles.chipText}>{p.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable style={styles.retake} onPress={onRetake}><Text style={styles.retakeText}>Retake</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  preview: { flex: 1 },
  row: { position: "absolute", bottom: 80, left: 0, right: 0, maxHeight: 64 },
  rowContent: { paddingHorizontal: 16, gap: 12 },
  chip: { backgroundColor: "#1f6feb", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  chipText: { color: "#fff", fontWeight: "600" },
  retake: { position: "absolute", top: 56, left: 20 },
  retakeText: { color: "#fff", fontSize: 16 },
});
