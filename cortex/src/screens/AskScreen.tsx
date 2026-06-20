import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { EmptyState } from "../ui/EmptyState";
import { ask, AskResult } from "../rag/ask";

export function AskScreen() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [streaming, setStreaming] = useState("");
  const [asked, setAsked] = useState("");

  async function run() {
    if (!q.trim() || loading) return;
    const question = q.trim();
    setAsked(question);
    setQ("");
    setLoading(true);
    setResult(null);
    setStreaming("");
    try {
      const res = await ask(question, (tok) => setStreaming((prev) => prev + tok));
      setResult(res);
    } finally {
      setStreaming("");
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.h1}>Recall</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, !asked && !result && styles.scrollEmpty]}
        keyboardShouldPersistTaps="handled"
      >
        {!asked && !result && (
          <EmptyState>
            Recall anything from your recorded mems. Answers come only from what you've recorded —
            fully on-device.
          </EmptyState>
        )}
        {asked !== "" && (
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{asked}</Text>
          </View>
        )}
        {loading && streaming === "" && (
          <ActivityIndicator color={theme.color.accent} style={{ marginTop: theme.space.md }} />
        )}
        {loading && streaming !== "" && (
          <GlassCard>
            <Text style={styles.body}>{streaming}</Text>
          </GlassCard>
        )}
        {result && (
          <>
            <GlassCard>
              <View style={styles.toolChip}>
                <Ionicons
                  name={result.usedTool === "list_todos" ? "checkbox-outline" : "search-outline"}
                  size={12}
                  color={theme.color.accent}
                />
                <Text style={styles.toolChipText}>
                  {result.usedTool === "list_todos" ? "Action items" : "Memory search"}
                </Text>
              </View>
              <Text style={styles.body}>{result.answer}</Text>
            </GlassCard>
            {result.citations.map((c, i) => (
              <GlassCard key={i}>
                <Text style={styles.cite}>{c.meetingTitle}</Text>
                <Text style={styles.citeText} numberOfLines={3}>
                  {c.text}
                </Text>
              </GlassCard>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="Ask about your mems…"
          placeholderTextColor={theme.color.textMuted}
          onSubmitEditing={run}
          returnKeyType="send"
          multiline
        />
        <Pressable style={[styles.sendBtn, !q.trim() && styles.sendBtnDim]} onPress={run}>
          <Ionicons name="arrow-up" color={theme.color.onAccent} size={22} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, paddingTop: theme.space.xl },
  h1: { color: theme.color.text, ...theme.type.display, paddingHorizontal: theme.space.md },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.space.md, gap: theme.space.md },
  scrollEmpty: { flexGrow: 1 },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.card,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.md,
  },
  userText: { color: theme.color.onAccent, ...theme.type.body },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: theme.space.xs,
  },
  toolChipText: {
    color: theme.color.accent,
    ...theme.type.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: { color: theme.color.text, ...theme.type.body, lineHeight: 22 },
  cite: { color: theme.color.ink, ...theme.type.caption, fontWeight: "700" },
  citeText: { color: theme.color.textMuted, ...theme.type.caption, marginTop: theme.space.xs },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color.glassBorder,
    backgroundColor: theme.color.surface,
  },
  input: {
    flex: 1,
    color: theme.color.text,
    backgroundColor: theme.color.glassFill,
    borderWidth: 1,
    borderColor: theme.color.glassBorder,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.sm,
    minHeight: 44,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDim: { opacity: 0.5 },
});
