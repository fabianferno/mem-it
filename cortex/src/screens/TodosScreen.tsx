import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { EmptyState } from "../ui/EmptyState";
import { listAllActionItems, toggleActionItem, ActionItemWithMeeting } from "../db/meetings";
import { useProcessing } from "../pipeline/sessionRunner";

export function TodosScreen() {
  const proc = useProcessing();
  const [items, setItems] = useState<ActionItemWithMeeting[]>([]);

  function refresh() {
    setItems(listAllActionItems());
  }
  // Refresh on mount and as background sessions add action items.
  useEffect(refresh, [proc.active, proc.stage]);

  function toggle(it: ActionItemWithMeeting) {
    toggleActionItem(it.id, !it.done);
    refresh();
  }

  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  function row(it: ActionItemWithMeeting) {
    return (
      <Pressable key={it.id} style={styles.row} onPress={() => toggle(it)}>
        <Ionicons
          name={it.done ? "checkbox" : "square-outline"}
          size={22}
          color={it.done ? theme.color.ink : theme.color.textMuted}
        />
        <View style={styles.rowText}>
          <Text style={[styles.text, it.done && styles.textDone]}>{it.text}</Text>
          <Text style={styles.meta}>{it.meetingTitle}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.h1}>Act</Text>
      <Text style={styles.subtitle}>
        Action items pulled from your mems, gathered here to check off.
      </Text>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: theme.space.md, gap: theme.space.sm }}
      >
        {items.length === 0 ? (
          <EmptyState>No action items yet. They appear here after you record mems.</EmptyState>
        ) : (
          <>
            {todo.length > 0 && <Text style={styles.section}>To do · {todo.length}</Text>}
            {todo.map(row)}

            {done.length > 0 && <Text style={styles.section}>Completed · {done.length}</Text>}
            {done.map(row)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, paddingTop: theme.space.xl },
  h1: { color: theme.color.text, ...theme.type.display, paddingHorizontal: theme.space.md },
  subtitle: {
    color: theme.color.textMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: theme.space.md,
    marginTop: theme.space.xs,
  },
  section: {
    color: theme.color.textMuted,
    ...theme.type.caption,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: theme.space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
    paddingVertical: theme.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.glassBorder,
  },
  rowText: { flex: 1 },
  text: { color: theme.color.text, ...theme.type.body },
  textDone: { color: theme.color.textMuted, textDecorationLine: "line-through" },
  meta: { color: theme.color.textMuted, ...theme.type.caption, marginTop: 2 },
});
