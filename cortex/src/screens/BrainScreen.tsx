import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../theme";
import { GraphWebView, GraphHandle } from "../graph3d/GraphWebView";
import { getGraph } from "../db/graph";
import type { GraphNode } from "../types";

export function BrainScreen() {
  const graph = useRef<GraphHandle>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const nodes = useRef<GraphNode[]>([]);

  useEffect(() => {
    const g = getGraph();
    nodes.current = g.nodes;
  }, []);

  function onReady() {
    graph.current?.setGraph(getGraph());
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
  root: { flex: 1, backgroundColor: theme.color.bg },
  title: {
    position: "absolute",
    top: theme.space.xl,
    left: theme.space.md,
    color: theme.color.text,
    ...theme.type.display,
  },
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
