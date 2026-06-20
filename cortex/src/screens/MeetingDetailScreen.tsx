import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { getMeeting, getActionItems, toggleActionItem, deleteMeeting } from "../db/meetings";
import { useProcessing } from "../pipeline/sessionRunner";
import type { ActionItem } from "../types";

export function MeetingDetailScreen({ meetingId, onBack }: { meetingId: string; onBack: () => void }) {
  const proc = useProcessing();
  const meeting = getMeeting(meetingId);
  const [items, setItems] = useState<ActionItem[]>(() => getActionItems(meetingId));
  // Refresh action items as the background pipeline persists them.
  useEffect(() => setItems(getActionItems(meetingId)), [meetingId, proc.stage, proc.active]);
  const buildingGraph =
    proc.active && proc.meetingId === meetingId && (proc.stage === "extracting" || proc.stage === "embedding");

  function toggle(it: ActionItem) {
    toggleActionItem(it.id, !it.done);
    setItems(getActionItems(meetingId));
  }

  function confirmDelete() {
    Alert.alert("Delete meeting?", "This removes its transcript, summary, and graph nodes. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteMeeting(meetingId);
          onBack();
        },
      },
    ]);
  }

  if (!meeting) return null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹ Meetings</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={8}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: theme.space.md, gap: theme.space.md }}>
        <Text style={styles.h1}>{meeting.title}</Text>

        {buildingGraph && (
          <View style={styles.building}>
            <ActivityIndicator size="small" color={theme.color.accent} />
            <Text style={styles.buildingText}>Building brain graph…</Text>
          </View>
        )}

        <GlassCard>
          <Text style={styles.label}>Summary</Text>
          <Text style={styles.body}>{meeting.summary ?? "—"}</Text>
        </GlassCard>

        <GlassCard>
          <Text style={styles.label}>Action items</Text>
          {items.length === 0 && <Text style={styles.body}>None</Text>}
          {items.map((it) => (
            <Pressable key={it.id} onPress={() => toggle(it)} style={styles.itemRow}>
              <Text style={[styles.check, it.done && styles.checkOn]}>{it.done ? "☑" : "☐"}</Text>
              <Text style={[styles.body, it.done && styles.itemDone]}>{it.text}</Text>
            </Pressable>
          ))}
        </GlassCard>

        <GlassCard>
          <Text style={styles.label}>Transcript</Text>
          <Text style={styles.body}>{meeting.transcript ?? "—"}</Text>
        </GlassCard>
      </ScrollView>
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
    paddingBottom: theme.space.sm,
  },
  back: { paddingVertical: theme.space.xs },
  backText: { color: theme.color.ink, ...theme.type.body, fontWeight: "600" },
  deleteText: { color: theme.color.danger, ...theme.type.body },
  h1: { color: theme.color.text, ...theme.type.heading },
  label: { color: theme.color.textMuted, ...theme.type.caption, marginBottom: theme.space.xs },
  body: { color: theme.color.text, ...theme.type.body, lineHeight: 22 },
  itemRow: { flexDirection: "row", gap: theme.space.sm, paddingVertical: theme.space.xs },
  check: { color: theme.color.textMuted, fontSize: 18 },
  checkOn: { color: theme.color.accent },
  itemDone: { color: theme.color.textMuted, textDecorationLine: "line-through" },
  building: { flexDirection: "row", alignItems: "center", gap: theme.space.sm },
  buildingText: { color: theme.color.textMuted, ...theme.type.caption },
});
