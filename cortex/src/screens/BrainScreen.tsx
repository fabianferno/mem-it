import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../theme";
import { GraphWebView, GraphHandle } from "../graph3d/GraphWebView";
import { getGraph } from "../db/graph";
import { subscribeGraph } from "../pipeline/sessionRunner";
import type { GraphNode } from "../types";

export function BrainScreen() {
  const graph = useRef<GraphHandle>(null);
  const ready = useRef(false);
  const nodes = useRef<GraphNode[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [count, setCount] = useState(0);

  function refresh() {
    const g = getGraph();
    nodes.current = g.nodes;
    setCount(g.nodes.length);
    if (ready.current) graph.current?.setGraph(g);
  }

  useEffect(() => {
    refresh();
    // Re-seed whenever a session adds nodes/edges in the background.
    return subscribeGraph(refresh);
  }, []);

  function onReady() {
    ready.current = true;
    refresh();
  }

  function onNodeTap(id: string) {
    const n = nodes.current.find((x) => x.id === id) ?? null;
    setSelected(n);
    if (n) graph.current?.focusNode(id);
  }

  return (
    <View style={styles.root}>
      <GraphWebView ref={graph} onReady={onReady} onNodeTap={onNodeTap} />
      <Text style={styles.title}>Second brain</Text>
      {count === 0 && (
        <View style={styles.empty} pointerEvents="none">
          <Text style={styles.emptyText}>
            Your brain is empty. Record a meeting and concepts will appear here.
          </Text>
        </View>
      )}
      {selected && (
        <Pressable style={styles.sheet} onPress={() => setSelected(null)}>
          <Text style={styles.sheetLabel}>{selected.label}</Text>
          <Text style={styles.sheetMeta}>
            {selected.type} · mentioned {selected.mentionCount}×
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.graphBg },
  title: {
    position: "absolute",
    top: theme.space.xl,
    left: theme.space.md,
    color: theme.color.textOnDark,
    ...theme.type.display,
  },
  empty: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: theme.space.xl },
  emptyText: { color: "rgba(255,255,255,0.6)", ...theme.type.body, textAlign: "center" },
  sheet: {
    position: "absolute",
    left: theme.space.md,
    right: theme.space.md,
    bottom: theme.space.lg,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.glassBorder,
  },
  sheetLabel: { color: theme.color.text, ...theme.type.heading },
  sheetMeta: { color: theme.color.textMuted, ...theme.type.caption, marginTop: theme.space.xs },
});
