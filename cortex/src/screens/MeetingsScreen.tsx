import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { listMeetings, getActionItems } from "../db/meetings";
import type { Meeting } from "../types";

function statusLabel(s: Meeting["status"]) {
  return s === "processing" ? "Processing…" : s === "error" ? "Failed — tap to retry" : "Recording";
}

export function MeetingsScreen({
  onOpen,
  onRecord,
}: {
  onOpen: (id: string) => void;
  onRecord: () => void;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  useEffect(() => setMeetings(listMeetings()), []);

  return (
    <View style={styles.root}>
      <Text style={styles.h1}>Meetings</Text>
      <FlatList
        data={meetings}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ gap: theme.space.sm, padding: theme.space.md }}
        ListEmptyComponent={<Text style={styles.empty}>No meetings yet. Record your first.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item.id)}>
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
      <Pressable style={styles.fab} onPress={onRecord}>
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, paddingTop: theme.space.xl },
  h1: { color: theme.color.text, ...theme.type.display, paddingHorizontal: theme.space.md },
  empty: { color: theme.color.textMuted, textAlign: "center", marginTop: theme.space.xl },
  title: { color: theme.color.text, ...theme.type.heading },
  sub: { color: theme.color.textMuted, ...theme.type.body, marginTop: theme.space.xs },
  meta: { color: theme.color.accent, ...theme.type.caption, marginTop: theme.space.sm },
  fab: {
    position: "absolute",
    right: theme.space.lg,
    bottom: theme.space.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPlus: { color: theme.color.onAccent, fontSize: 32, fontWeight: "700" },
});
