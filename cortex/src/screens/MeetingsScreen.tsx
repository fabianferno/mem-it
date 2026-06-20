import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, Pressable, Alert, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { BrandMark } from "../ui/BrandMark";
import { EmptyState } from "../ui/EmptyState";
import { listMeetings, getActionItems, deleteMeeting } from "../db/meetings";
import { useProcessing } from "../pipeline/sessionRunner";
import { importMeetingFromFile } from "../share/shareBundle";
import type { Meeting } from "../types";

function statusLabel(s: Meeting["status"]) {
  return s === "processing" ? "Processing…" : s === "error" ? "Failed — tap to retry" : "Recording";
}

export function MeetingsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const proc = useProcessing();
  // Re-list on mount and whenever a background session changes state.
  useEffect(() => setMeetings(listMeetings()), [proc.active, proc.stage]);

  async function importFile() {
    try {
      const r = await importMeetingFromFile();
      if (!r) return;
      setMeetings(listMeetings());
      Alert.alert(
        "Mem imported",
        `${r.chunks} chunks, ${r.actionItems} action items, ${r.nodesAdded} new + ${r.nodesMerged} merged concepts woven into your brain.`
      );
    } catch (e: any) {
      Alert.alert("Import failed", e?.message ?? "Unknown error");
    }
  }

  function confirmDelete(id: string, title: string) {
    Alert.alert("Delete meeting?", `"${title}" and its graph nodes will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteMeeting(id);
          setMeetings(listMeetings());
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BrandMark size={36} wordmark />
        <Pressable onPress={importFile} hitSlop={8} style={styles.importBtn}>
          <Text style={styles.importText}>Import</Text>
        </Pressable>
      </View>
      <Text style={styles.h1}>Mems</Text>
      <Text style={styles.subtitle}>
        Record a meeting or a moment — each mem is transcribed on-device and woven into your second
        brain.
      </Text>
      <View style={styles.hero}>
        <Image
          source={require("../../assets/mems-hero.gif")}
          style={styles.heroImg}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["transparent", "transparent", theme.color.bg]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>
      <FlatList
        data={meetings}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ flexGrow: 1, gap: theme.space.sm, padding: theme.space.md }}
        ListEmptyComponent={
          <EmptyState>No mems yet. Tap the mic button to record your first.</EmptyState>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onOpen(item.id)}
            onLongPress={() => confirmDelete(item.id, item.title)}
          >
            <GlassCard>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub} numberOfLines={2}>
                {item.summary ?? statusLabel(item.status)}
              </Text>
              <Text style={styles.meta}>{getActionItems(item.id).length} action items</Text>
            </GlassCard>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, paddingTop: theme.space.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.md,
  },
  importBtn: { paddingVertical: theme.space.xs, paddingHorizontal: theme.space.sm },
  importText: { color: theme.color.accent, ...theme.type.body, fontWeight: "600" },
  h1: { color: theme.color.text, ...theme.type.display, paddingHorizontal: theme.space.md },
  subtitle: {
    color: theme.color.textMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: theme.space.md,
    marginTop: theme.space.xs,
  },
  hero: {
    height: 160,
    marginHorizontal: theme.space.md,
    marginTop: theme.space.sm,
    borderRadius: theme.radius.card,
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  title: { color: theme.color.text, ...theme.type.heading },
  sub: { color: theme.color.textMuted, ...theme.type.body, marginTop: theme.space.xs },
  meta: { color: theme.color.textMuted, ...theme.type.caption, marginTop: theme.space.sm },
});
