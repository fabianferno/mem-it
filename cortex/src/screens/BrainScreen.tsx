import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../theme";
import { Graph2D } from "../graph2d/Graph2D";
import { getGraph } from "../db/graph";
import { subscribeGraph } from "../pipeline/sessionRunner";
import type { GraphNode, GraphEdge } from "../types";

export function BrainScreen() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  function refresh() {
    const g = getGraph();
    setNodes(g.nodes);
    setEdges(g.edges);
  }

  useEffect(() => {
    refresh();
    // Re-seed whenever a session adds nodes/edges in the background.
    return subscribeGraph(refresh);
  }, []);

  return (
    <View style={styles.root}>
      <Graph2D
        nodes={nodes}
        edges={edges}
        selectedId={selected?.id}
        onSelect={(n) => setSelected(n)}
      />
      <View style={styles.header} pointerEvents="none">
        <Text style={styles.title}>Memhive</Text>
        <Text style={styles.subtitle}>
          The people, concepts, and tasks from your mems, woven into one living graph that grows
          with every recording. Tap a node to explore.
        </Text>
      </View>
      {nodes.length === 0 && (
        <View style={styles.empty} pointerEvents="none">
          <Text style={styles.emptyText}>
            Your memhive is empty. Record a mem and concepts will appear here.
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
  root: { flex: 1, backgroundColor: theme.color.bg },
  header: {
    position: "absolute",
    top: theme.space.xl,
    left: theme.space.md,
    right: theme.space.md,
  },
  title: { color: theme.color.text, ...theme.type.display },
  subtitle: {
    color: theme.color.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.space.xs,
    maxWidth: "92%",
  },
  empty: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space.xl,
  },
  emptyText: { color: theme.color.textMuted, ...theme.type.body, textAlign: "center" },
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
