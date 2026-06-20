import { loadModel, completion, unloadModel } from "@qvac/sdk";
import { LLM_MODEL } from "./models";
import { createArrayItemParser } from "./jsonStream";
import { timed } from "../perf/perfLog";
import { INSTRUCTION_HIERARCHY, wrapUntrusted } from "./safety";
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

export const EXTRACTION_PROMPT = (transcript: string) =>
  `${INSTRUCTION_HIERARCHY}

You extract a knowledge graph from a meeting transcript. Output ONLY a JSON array.
Each element is one of:
  {"kind":"node","label":"<short noun phrase>","type":"person|concept|task|tech|value|source"}
  {"kind":"edge","src":"<node label>","dst":"<node label>","relation":"<verb phrase>"}
Rules: 6-12 nodes max. Every edge's src and dst MUST be a node label you also emit.
No prose, no markdown, no trailing text. Start with [ and end with ].
Transcript:
${wrapUntrusted(transcript)}`;

/**
 * Extract a knowledge graph from a transcript with the LLM, streaming. Each
 * node/edge fires its callback the moment it parses (drives the live graph),
 * and the full set is returned. Single model loaded/unloaded for the call.
 */
export async function extractEntities(
  transcript: string,
  onNode?: (n: ExtractedNode) => void,
  onEdge?: (e: ExtractedEdge) => void
): Promise<{ nodes: ExtractedNode[]; edges: ExtractedEdge[] }> {
  const prompt = EXTRACTION_PROMPT(transcript);
  const nodes: ExtractedNode[] = [];
  const edges: ExtractedEdge[] = [];
  return timed(
    { stage: "extract", model: LLM_MODEL.name, modelType: "llm", promptChars: prompt.length },
    () => loadModel({ modelSrc: LLM_MODEL, modelType: "llm", modelConfig: { ctx_size: 4096 } }),
    async (ctx, modelId) => {
      const parser = createArrayItemParser<RawItem>((item) => {
        if (item.kind === "node" && item.label) {
          const n: ExtractedNode = { label: item.label, type: item.type };
          nodes.push(n);
          onNode?.(n);
        } else if (item.kind === "edge" && item.src && item.dst) {
          const e: ExtractedEdge = { src: item.src, dst: item.dst, relation: item.relation };
          edges.push(e);
          onEdge?.(e);
        }
      });
      const run = completion({
        modelId,
        history: [{ role: "user", content: prompt }],
        stream: true,
      });
      for await (const tok of run.tokenStream) {
        ctx.markFirstToken();
        ctx.addTokens(1);
        parser.push(tok);
      }
      parser.end();
      return { nodes, edges };
    },
    (modelId) => unloadModel({ modelId })
  );
}
