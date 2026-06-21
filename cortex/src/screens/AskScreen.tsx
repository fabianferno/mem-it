import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { EmptyState } from "../ui/EmptyState";
import { ask } from "../rag/ask";
import { getAgentMessages, appendAgentMessage, clearAgentMessages } from "../db/agent";
import type { AgentMessage } from "../types";

export function AskScreen() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>(() => getAgentMessages());
  const scrollRef = useRef<ScrollView>(null);

  function scrollToEnd() {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  // Keep the latest message visible when the keyboard opens.
  useEffect(() => {
    const evt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(evt, scrollToEnd);
    return () => sub.remove();
  }, []);

  async function run() {
    if (!q.trim() || loading) return;
    const question = q.trim();
    setQ("");
    setLoading(true);
    setStreaming("");
    appendAgentMessage({ role: "user", content: question, usedTool: null, citations: [] });
    setMessages(getAgentMessages());
    scrollToEnd();
    try {
      const res = await ask(question, (tok) => {
        setStreaming((prev) => prev + tok);
        scrollToEnd();
      });
      appendAgentMessage({
        role: "assistant",
        content: res.answer,
        usedTool: res.usedTool,
        citations: res.citations,
      });
      setMessages(getAgentMessages());
    } finally {
      setStreaming("");
      setLoading(false);
      scrollToEnd();
    }
  }

  function clearConversation() {
    clearAgentMessages();
    setMessages([]);
  }

  const empty = messages.length === 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={styles.titleRow}>
        <Text style={styles.h1}>Agent</Text>
        {messages.length > 0 && (
          <Pressable onPress={clearConversation} hitSlop={8}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, empty && styles.scrollEmpty]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
      >
        {empty && (
          <EmptyState>
            Ask your second brain. The agent searches your recorded mems and action items to answer —
            fully on-device.
          </EmptyState>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <View key={m.id} style={styles.userBubble}>
              <Text style={styles.userText}>{m.content}</Text>
            </View>
          ) : (
            <View key={m.id}>
              <GlassCard>
                <View style={styles.toolChip}>
                  <Ionicons
                    name={m.usedTool === "list_todos" ? "checkbox-outline" : "search-outline"}
                    size={12}
                    color={theme.color.accent}
                  />
                  <Text style={styles.toolChipText}>
                    {m.usedTool === "list_todos" ? "Action items" : "Memory search"}
                  </Text>
                </View>
                <Text style={styles.body}>{m.content}</Text>
              </GlassCard>
              {m.citations.map((c, i) => (
                <GlassCard key={`${m.id}-${i}`}>
                  <Text style={styles.cite}>{c.meetingTitle}</Text>
                  <Text style={styles.citeText} numberOfLines={3}>
                    {c.text}
                  </Text>
                </GlassCard>
              ))}
            </View>
          )
        )}

        {loading && streaming === "" && (
          <ActivityIndicator color={theme.color.accent} style={{ marginTop: theme.space.md }} />
        )}
        {loading && streaming !== "" && (
          <GlassCard>
            <Text style={styles.body}>{streaming}</Text>
          </GlassCard>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="Ask your second brain…"
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.md,
  },
  h1: { color: theme.color.text, ...theme.type.display },
  clearText: { color: theme.color.textMuted, ...theme.type.body, fontWeight: "600" },
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
