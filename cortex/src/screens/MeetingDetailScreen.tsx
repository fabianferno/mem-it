import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { getMeeting, getActionItems, toggleActionItem, deleteMeeting, updateMeeting } from "../db/meetings";
import { useProcessing, startSession } from "../pipeline/sessionRunner";
import { STAGE_LABELS } from "../pipeline/stages";
import { exportMeeting } from "../share/shareBundle";
import type { ActionItem } from "../types";

/** Inline copy-to-clipboard control with a brief "Copied" confirmation. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Pressable onPress={copy} hitSlop={8} style={styles.copyBtn}>
      <Ionicons
        name={copied ? "checkmark" : "copy-outline"}
        size={15}
        color={copied ? theme.color.accent : theme.color.textMuted}
      />
      <Text style={[styles.copyText, copied && styles.copyTextOn]}>
        {copied ? "Copied" : "Copy"}
      </Text>
    </Pressable>
  );
}

export function MeetingDetailScreen({ meetingId, onBack }: { meetingId: string; onBack: () => void }) {
  const proc = useProcessing();
  const meeting = getMeeting(meetingId);
  const [items, setItems] = useState<ActionItem[]>(() => getActionItems(meetingId));
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(meeting?.title ?? "");
  // Refresh action items as the background pipeline persists them.
  useEffect(() => setItems(getActionItems(meetingId)), [meetingId, proc.stage, proc.active]);

  function startEditTitle() {
    setTitleDraft(meeting?.title ?? "");
    setEditingTitle(true);
  }
  function saveTitle() {
    const t = titleDraft.trim();
    if (t && t !== meeting?.title) updateMeeting(meetingId, { title: t });
    setEditingTitle(false);
  }
  const buildingGraph =
    proc.active && proc.meetingId === meetingId && (proc.stage === "extracting" || proc.stage === "embedding");

  function toggle(it: ActionItem) {
    toggleActionItem(it.id, !it.done);
    setItems(getActionItems(meetingId));
  }

  function retry() {
    if (proc.active) {
      Alert.alert("Busy", "Another mem is still processing. Try again once it finishes.");
      return;
    }
    if (!meeting?.audioUri) {
      Alert.alert("Can't retry", "The original recording for this mem is missing.");
      return;
    }
    startSession(meetingId, meeting.audioUri);
  }

  async function share() {
    try {
      await exportMeeting(meetingId);
    } catch (e: any) {
      Alert.alert("Couldn't share", e?.message ?? "Unknown error");
    }
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
          <Text style={styles.backText}>‹ Mems</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={share} hitSlop={8}>
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} hitSlop={8}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: theme.space.md, gap: theme.space.md }}>
        {editingTitle ? (
          <TextInput
            style={[styles.h1, styles.titleInput]}
            value={titleDraft}
            onChangeText={setTitleDraft}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={saveTitle}
            onBlur={saveTitle}
            placeholder="Meeting title"
            placeholderTextColor={theme.color.textMuted}
          />
        ) : (
          <Pressable style={styles.titleRow} onPress={startEditTitle}>
            <Text style={styles.h1}>{meeting.title}</Text>
            <Ionicons name="pencil" size={16} color={theme.color.textMuted} />
          </Pressable>
        )}

        {buildingGraph && (
          <View style={styles.building}>
            <ActivityIndicator size="small" color={theme.color.accent} />
            <Text style={styles.buildingText}>Building brain graph…</Text>
          </View>
        )}

        {meeting.status === "error" && !(proc.active && proc.meetingId === meetingId) && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Processing failed for this mem.</Text>
            <Pressable style={styles.retryBtn} onPress={retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {proc.active && proc.meetingId === meetingId && (
          <View style={styles.building}>
            <ActivityIndicator size="small" color={theme.color.accent} />
            <Text style={styles.buildingText}>{STAGE_LABELS[proc.stage]}…</Text>
          </View>
        )}

        <GlassCard>
          <View style={styles.cardHeader}>
            <Text style={styles.label}>Summary</Text>
            {!!meeting.summary && <CopyButton text={meeting.summary} />}
          </View>
          <Text style={styles.body}>{meeting.summary ?? "—"}</Text>
        </GlassCard>

        <GlassCard>
          <View style={styles.cardHeader}>
            <Text style={styles.label}>Action items</Text>
          </View>
          {items.length === 0 && <Text style={styles.body}>None</Text>}
          {items.map((it) => (
            <Pressable key={it.id} onPress={() => toggle(it)} style={styles.itemRow}>
              <Text style={[styles.check, it.done && styles.checkOn]}>{it.done ? "☑" : "☐"}</Text>
              <Text style={[styles.body, it.done && styles.itemDone]}>{it.text}</Text>
            </Pressable>
          ))}
        </GlassCard>

        <GlassCard>
          <View style={styles.cardHeader}>
            <Text style={styles.label}>Transcript</Text>
            {!!meeting.transcript && <CopyButton text={meeting.transcript} />}
          </View>
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: theme.space.md },
  shareText: { color: theme.color.accent, ...theme.type.body, fontWeight: "600" },
  deleteText: { color: theme.color.danger, ...theme.type.body },
  h1: { color: theme.color.text, ...theme.type.heading },
  titleRow: { flexDirection: "row", alignItems: "center", gap: theme.space.sm },
  titleInput: {
    flex: 1,
    paddingVertical: theme.space.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.accent,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space.xs,
  },
  label: { color: theme.color.textMuted, ...theme.type.caption },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  copyText: { color: theme.color.textMuted, ...theme.type.caption, fontWeight: "600" },
  copyTextOn: { color: theme.color.accent },
  body: { color: theme.color.text, ...theme.type.body, lineHeight: 22 },
  itemRow: { flexDirection: "row", gap: theme.space.sm, paddingVertical: theme.space.xs },
  check: { color: theme.color.textMuted, fontSize: 18 },
  checkOn: { color: theme.color.accent },
  itemDone: { color: theme.color.textMuted, textDecorationLine: "line-through" },
  building: { flexDirection: "row", alignItems: "center", gap: theme.space.sm },
  buildingText: { color: theme.color.textMuted, ...theme.type.caption },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.danger,
  },
  errorText: { color: theme.color.text, ...theme.type.body, flex: 1 },
  retryBtn: {
    paddingVertical: theme.space.xs,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
  retryText: { color: theme.color.onAccent, ...theme.type.body, fontWeight: "700" },
});
