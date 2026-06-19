import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { ask, AskResult } from "../rag/ask";

export function AskScreen() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);

  async function run() {
    if (!q.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await ask(q.trim()));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.h1}>Ask</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="What did I say about…"
          placeholderTextColor={theme.color.textMuted}
          onSubmitEditing={run}
          returnKeyType="search"
        />
        <Pressable style={styles.askBtn} onPress={run}>
          <Text style={styles.askText}>Ask</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.space.md, gap: theme.space.md }}>
        {loading && <ActivityIndicator color={theme.color.accent} />}
        {result && (
          <>
            <GlassCard>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, paddingTop: theme.space.xl },
  h1: { color: theme.color.text, ...theme.type.display, paddingHorizontal: theme.space.md },
  inputRow: { flexDirection: "row", gap: theme.space.sm, padding: theme.space.md },
  input: {
    flex: 1,
    color: theme.color.text,
    backgroundColor: theme.color.glassFill,
    borderWidth: 1,
    borderColor: theme.color.glassBorder,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    height: 48,
  },
  askBtn: {
    paddingHorizontal: theme.space.lg,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  askText: { color: theme.color.onAccent, fontWeight: "700" },
  body: { color: theme.color.text, ...theme.type.body, lineHeight: 22 },
  cite: { color: theme.color.accent, ...theme.type.caption },
  citeText: { color: theme.color.textMuted, ...theme.type.caption, marginTop: theme.space.xs },
});
