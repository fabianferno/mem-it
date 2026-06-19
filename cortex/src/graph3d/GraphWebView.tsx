import React, { forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { GRAPH_HTML } from "./graphHtml";
import type { GraphNode, GraphEdge } from "../types";

export interface GraphHandle {
  setGraph: (g: { nodes: GraphNode[]; edges: GraphEdge[] }) => void;
  addNode: (n: { id: string; label: string; type: string; mentionCount?: number }) => void;
  addEdge: (e: { srcId: string; dstId: string; relation: string }) => void;
  focusNode: (id: string) => void;
}

interface Props {
  onNodeTap?: (id: string) => void;
  onReady?: () => void;
}

/**
 * Full-screen 3D brain graph. Hosts the offline 3d-force-graph page and bridges
 * RN <-> WebView. The WebView runs its own render loop, decoupled from the
 * inference worker, so nodes can be pushed in live during LLM streaming.
 */
export const GraphWebView = forwardRef<GraphHandle, Props>(function GraphWebView(
  { onNodeTap, onReady },
  ref
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const queue = useRef<string[]>([]);

  const send = useCallback((type: string, payload: unknown) => {
    const js = `window.__cortex && window.__cortex.handle(${JSON.stringify({ type, payload })}); true;`;
    if (readyRef.current) webRef.current?.injectJavaScript(js);
    else queue.current.push(js);
  }, []);

  useImperativeHandle(ref, () => ({
    setGraph: (g) => send("setGraph", g),
    addNode: (n) => send("addNode", n),
    addEdge: (e) => send("addEdge", e),
    focusNode: (id) => send("focusNode", id),
  }));

  const onMessage = useCallback(
    (ev: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === "ready") {
        readyRef.current = true;
        queue.current.forEach((js) => webRef.current?.injectJavaScript(js));
        queue.current = [];
        onReady?.();
      } else if (msg.type === "nodeTap") {
        onNodeTap?.(msg.id);
      }
    },
    [onNodeTap, onReady]
  );

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html: GRAPH_HTML }}
      onMessage={onMessage}
      style={{ flex: 1, backgroundColor: "#0A0A0B" }}
      javaScriptEnabled
      domStorageEnabled
      // WebGL needs hardware accel; keep the view opaque on a black canvas.
      androidLayerType="hardware"
    />
  );
});
