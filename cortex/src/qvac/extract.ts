import { loadModel, completion, unloadModel } from "@qvac/sdk";
import { LLM_MODEL } from "./models";
import { createArrayItemParser } from "./jsonStream";
import { timed } from "../perf/perfLog";
import { wrapUntrusted } from "./safety";
import type { NodeType } from "../types";

export interface ExtractedNode {
  label: string;
  type: NodeType;
}
export interface ExtractedEdge {
  src: string;
  dst: string;
  relation: string;
}

type RawItem =
  | { kind: "node"; label: string; type: NodeType }
  | { kind: "edge"; src: string; dst: string; relation: string };

/** Cap the transcript fed to the LLM so prompt + generation stays within ctx. */
export const MAX_TRANSCRIPT_CHARS = 14000;

export const EXTRACTION_PROMPT = (transcript: string) =>
  `Transcript:
${wrapUntrusted(transcript.slice(0, MAX_TRANSCRIPT_CHARS))}

Extract a knowledge graph from the meeting transcript above as a JSON array.
Each element is one of:
  {"kind":"node","label":"<short noun phrase>","type":"person|concept|task|tech|value|source"}
  {"kind":"edge","src":"<node label>","dst":"<node label>","relation":"<verb phrase>"}
Rules: 6-12 nodes max. Every edge's src and dst MUST be a node label you also emit.
Respond with ONLY the JSON array — no prose, no markdown. Start with [ and end with ].`;

/**
 * Extract a knowledge graph from a transcript with the LLM, streaming. Each
 * node/edge fires its callback the moment it parses (drives the live graph),
 * and the full set is returned. Single model loaded/unloaded for the call.
 */
/**
 * JSON schema constraining the model to a graph array. llama.cpp converts it to
 * a GBNF grammar so the 1B model is forced to emit a valid JSON array of nodes
 * and edges instead of free-form prose.
 */
const GRAPH_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["node", "edge"] },
      label: { type: "string" },
      type: { type: "string", enum: ["person", "concept", "task", "tech", "value", "source"] },
      src: { type: "string" },
      dst: { type: "string" },
      relation: { type: "string" },
    },
    required: ["kind"],
  },
} as const;

export async function extractEntities(
  transcript: string,
  onNode?: (n: ExtractedNode) => void,
  onEdge?: (e: ExtractedEdge) => void
): Promise<{ nodes: ExtractedNode[]; edges: ExtractedEdge[] }> {
  const prompt = EXTRACTION_PROMPT(transcript);
  const nodes: ExtractedNode[] = [];
  const edges: ExtractedEdge[] = [];
  const ingest = (item: RawItem) => {
    if (item.kind === "node" && item.label) {
      const n: ExtractedNode = { label: item.label, type: item.type };
      nodes.push(n);
      onNode?.(n);
    } else if (item.kind === "edge" && item.src && item.dst) {
      const e: ExtractedEdge = { src: item.src, dst: item.dst, relation: item.relation };
      edges.push(e);
      onEdge?.(e);
    }
  };
  return timed(
    { stage: "extract", model: LLM_MODEL.name, modelType: "llm", promptChars: prompt.length },
    () =>
      loadModel({
        modelSrc: LLM_MODEL,
        modelType: "llm",
        // Cap generation + penalize repeats so a runaway loop can't overflow ctx.
        modelConfig: { ctx_size: 4096, predict: 768, repeat_penalty: 1.1 },
      }),
    async (ctx, modelId) => {
      const parser = createArrayItemParser<RawItem>(ingest);
      const run = completion({
        modelId,
        history: [{ role: "user", content: prompt }],
        stream: true,
        responseFormat: {
          type: "json_schema",
          json_schema: { name: "knowledge_graph", schema: GRAPH_SCHEMA },
        },
      });
      for await (const tok of run.tokenStream) {
        ctx.markFirstToken();
        ctx.addTokens(1);
        parser.push(tok);
      }
      parser.end();
      // Fallback: if the streamed tokens yielded nothing, re-parse the SDK's
      // canonical aggregated output before giving up.
      if (nodes.length === 0) {
        const final = await run.final;
        const text = final.contentText?.trim() || final.raw?.fullText?.trim() || "";
        if (text) {
          const fb = createArrayItemParser<RawItem>(ingest);
          fb.push(text);
          fb.end();
        }
        if (nodes.length === 0) {
          console.warn(`[extract] no nodes; model output (${text.length} chars): ${text.slice(0, 300)}`);
        }
      }
      return { nodes, edges };
    },
    (modelId) => unloadModel({ modelId })
  );
}
