import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, PanResponder, LayoutChangeEvent, StyleSheet } from "react-native";
import { theme } from "../theme";
import type { GraphNode, GraphEdge, NodeType } from "../types";

// On-theme palette: crimson family + white + greys, over the black canvas.
const TYPE_COLOR: Record<NodeType, string> = {
  person: "#E53659", // signature crimson — people are central
  task: "#FF5C78", // lighter red — actionable
  concept: "#F5F5F4", // near-white — ideas
  value: "#FF8DA1", // rose — values/principles
  tech: "#9A9AA2", // grey — tools/tech
  source: "#5C5C64", // dim grey — sources
};

interface Pos {
  x: number;
  y: number;
}
interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Fruchterman-Reingold-style force layout within a usable rect (kept clear of the
 * title and tab dock). Cheap for the 6-12 nodes a meeting produces; deterministic.
 */
function computeLayout(nodes: GraphNode[], edges: GraphEdge[], rect: Rect): Pos[] {
  const n = nodes.length;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  if (n === 0 || w <= 0 || h <= 0) return [];
  const cx = rect.x0 + w / 2;
  const cy = rect.y0 + h / 2;
  const R = Math.min(w, h) * 0.45;
  const pos: Pos[] = nodes.map((_, i) => ({
    x: cx + R * Math.cos((2 * Math.PI * i) / n),
    y: cy + R * Math.sin((2 * Math.PI * i) / n),
  }));
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const links = edges
    .map((e) => [idx.get(e.srcNodeId), idx.get(e.dstNodeId)] as [number | undefined, number | undefined])
    .filter(([a, b]) => a != null && b != null) as [number, number][];

  // Large ideal edge length + strong repulsion so nodes (and their labels) keep
  // their distance instead of clumping.
  const k = Math.max(150, Math.min(w, h) / Math.max(1.6, Math.sqrt(n)));
  for (let iter = 0; iter < 300; iter++) {
    const disp: Pos[] = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const d = Math.hypot(dx, dy) || 0.01;
        const rep = (k * k * 1.4) / (d * d); // strong repulsion
        disp[i].x += (dx / d) * rep;
        disp[i].y += (dy / d) * rep;
        disp[j].x -= (dx / d) * rep;
        disp[j].y -= (dy / d) * rep;
      }
    }
    for (const [a, b] of links) {
      const dx = pos[a].x - pos[b].x;
      const dy = pos[a].y - pos[b].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const att = (d * d) / (k * 1.3);
      disp[a].x -= (dx / d) * att;
      disp[a].y -= (dy / d) * att;
      disp[b].x += (dx / d) * att;
      disp[b].y += (dy / d) * att;
    }
    const temp = 14 * (1 - iter / 300);
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(disp[i].x, disp[i].y) || 0.01;
      const step = Math.min(d, temp);
      pos[i].x += (disp[i].x / d) * step;
      pos[i].y += (disp[i].y / d) * step;
      pos[i].x += (cx - pos[i].x) * 0.015;
      pos[i].y += (cy - pos[i].y) * 0.015;
    }
  }
  for (const p of pos) {
    p.x = Math.max(rect.x0, Math.min(rect.x1, p.x));
    p.y = Math.max(rect.y0, Math.min(rect.y1, p.y));
  }
  return pos;
}

function nodeSize(mentionCount: number) {
  return Math.max(16, Math.min(40, 16 + (mentionCount - 1) * 5));
}
function shortLabel(s: string) {
  return s.length > 18 ? s.slice(0, 17) + "…" : s;
}

// Insets keep nodes clear of the title/description (top) and tab dock (bottom).
const INSET = { top: 168, bottom: 132, side: 30 };
const WRAP = 112; // draggable wrapper width (node + label)

/** A node the user can drag; a tap (negligible movement) selects it instead. */
function DraggableNode({
  node,
  pos,
  selected,
  onSelect,
  onDrag,
}: {
  node: GraphNode;
  pos: Pos;
  selected: boolean;
  onSelect: (n: GraphNode) => void;
  onDrag: (id: string, x: number, y: number) => void;
}) {
  const posRef = useRef(pos);
  posRef.current = pos;
  const start = useRef<Pos>({ x: 0, y: 0 });
  const cbs = useRef({ onSelect, onDrag, node });
  cbs.current = { onSelect, onDrag, node };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        start.current = { x: posRef.current.x, y: posRef.current.y };
      },
      onPanResponderMove: (_e, g) => {
        cbs.current.onDrag(cbs.current.node.id, start.current.x + g.dx, start.current.y + g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dx) < 4 && Math.abs(g.dy) < 4) cbs.current.onSelect(cbs.current.node);
      },
    })
  ).current;

  const s = nodeSize(node.mentionCount);
  const color = TYPE_COLOR[node.type] ?? theme.color.textMuted;
  const glow = color === "#9A9AA2" || color === "#5C5C64" ? undefined : color;

  return (
    <View
      {...responder.panHandlers}
      style={{ position: "absolute", left: pos.x - WRAP / 2, top: pos.y - s / 2, width: WRAP, alignItems: "center" }}
    >
      <View
        style={[
          {
            width: s,
            height: s,
            borderRadius: s / 2,
            backgroundColor: color,
            shadowColor: glow ?? "#000",
            shadowOpacity: glow ? 0.8 : 0,
            shadowRadius: glow ? 9 : 0,
            shadowOffset: { width: 0, height: 0 },
          },
          selected && styles.nodeSelected,
        ]}
      />
      <View style={[styles.labelChip, selected && styles.labelChipSelected]}>
        <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
          {shortLabel(node.label)}
        </Text>
      </View>
    </View>
  );
}

export function Graph2D({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId?: string | null;
  onSelect: (n: GraphNode) => void;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  const sig = nodes.map((n) => n.id).join(",") + "|" + edges.map((e) => e.id).join(",");

  // (Re)seed positions from the force layout when the graph or size changes.
  // Dragging mutates `positions` directly afterwards without recomputing.
  useEffect(() => {
    if (size.w === 0 || size.h === 0 || nodes.length === 0) return;
    const rect: Rect = { x0: INSET.side, y0: INSET.top, x1: size.w - INSET.side, y1: size.h - INSET.bottom };
    const pos = computeLayout(nodes, edges, rect);
    const map: Record<string, Pos> = {};
    nodes.forEach((n, i) => {
      if (pos[i]) map[n.id] = pos[i];
    });
    setPositions(map);
  }, [sig, size.w, size.h]);

  const onDrag = (id: string, x: number, y: number) =>
    setPositions((prev) => ({ ...prev, [id]: { x, y } }));

  const ready = Object.keys(positions).length === nodes.length && nodes.length > 0;

  return (
    <View style={styles.root} onLayout={onLayout}>
      {ready &&
        edges.map((e) => {
          const pa = positions[e.srcNodeId];
          const pb = positions[e.dstNodeId];
          if (!pa || !pb) return null;
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const len = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          const mx = (pa.x + pb.x) / 2;
          const my = (pa.y + pb.y) / 2;
          return (
            <View
              key={e.id}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: mx - len / 2,
                top: my - 1,
                width: len,
                height: 2,
                backgroundColor: "rgba(255,92,120,0.55)",
                transform: [{ rotate: `${angle}rad` }],
              }}
            />
          );
        })}
      {ready &&
        nodes.map((n) => (
          <DraggableNode
            key={n.id}
            node={n}
            pos={positions[n.id]}
            selected={n.id === selectedId}
            onSelect={onSelect}
            onDrag={onDrag}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  nodeSelected: { borderWidth: 2.5, borderColor: theme.color.ink },
  labelChip: {
    marginTop: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    maxWidth: WRAP,
  },
  labelChipSelected: { backgroundColor: theme.color.accentDim },
  label: { color: theme.color.text, fontSize: 11, textAlign: "center" },
  labelSelected: { color: theme.color.ink, fontWeight: "700" },
});
