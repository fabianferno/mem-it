import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { getMeeting, getActionItems, toggleActionItem } from "../db/meetings";
import type { ActionItem } from "../types";

export function MeetingDetailScreen({ meetingId, onBack }: { meetingId: string; onBack: () => void }) {
  const meeting = getMeeting(meetingId);
  const [items, setItems] = useState<ActionItem[]>(() => getActionItems(meetingId));

  function toggle(it: ActionItem) {
    toggleActionItem(it.id, !it.done);
    setItems(getActionItems(meetingId));
  }

  if (!meeting) return null;

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ Meetings</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ padding: theme.space.md, gap: theme.space.md }}>
        <Text style={styles.h1}>{meeting.title}</Text>

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
  back: { paddingHorizontal: theme.space.md, paddingBottom: theme.space.sm },
  backText: { color: theme.color.accent, ...theme.type.body },
  h1: { color: theme.color.text, ...theme.type.heading },
  label: { color: theme.color.textMuted, ...theme.type.caption, marginBottom: theme.space.xs },
  body: { color: theme.color.text, ...theme.type.body, lineHeight: 22 },
  itemRow: { flexDirection: "row", gap: theme.space.sm, paddingVertical: theme.space.xs },
  check: { color: theme.color.textMuted, fontSize: 18 },
  checkOn: { color: theme.color.accent },
  itemDone: { color: theme.color.textMuted, textDecorationLine: "line-through" },
});
