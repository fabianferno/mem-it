import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from "react-native";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { listMeetings, getActionItems, deleteMeeting } from "../db/meetings";
import { useProcessing } from "../pipeline/sessionRunner";
import type { Meeting } from "../types";

function statusLabel(s: Meeting["status"]) {
  return s === "processing" ? "Processing…" : s === "error" ? "Failed — tap to retry" : "Recording";
}

export function MeetingsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const proc = useProcessing();
  // Re-list on mount and whenever a background session changes state.
  useEffect(() => setMeetings(listMeetings()), [proc.active, proc.stage]);

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
      <Text style={styles.h1}>Meetings</Text>
      <FlatList
        data={meetings}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ gap: theme.space.sm, padding: theme.space.md }}
        ListEmptyComponent={
          <Text style={styles.empty}>No meetings yet. Tap the ● button to record your first.</Text>
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
  h1: { color: theme.color.text, ...theme.type.display, paddingHorizontal: theme.space.md },
  empty: { color: theme.color.textMuted, textAlign: "center", marginTop: theme.space.xl },
  title: { color: theme.color.text, ...theme.type.heading },
  sub: { color: theme.color.textMuted, ...theme.type.body, marginTop: theme.space.xs },
  meta: { color: theme.color.textMuted, ...theme.type.caption, marginTop: theme.space.sm },
});
