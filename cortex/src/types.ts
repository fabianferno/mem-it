import type { Citation, ToolName } from "./rag/ask";

export type Stage =
  | "idle"
  | "transcribing"
  | "extracting"
  | "summarizing"
  | "embedding"
  | "done"
  | "error";

export type NodeType = "person" | "concept" | "task" | "tech" | "value" | "source";

export interface Meeting {
  id: string;
  title: string;
  startedAt: number;
  endedAt: number | null;
  audioUri: string | null;
  transcript: string | null;
  summary: string | null;
  status: "recording" | "processing" | "done" | "error";
}

export interface ActionItem {
  id: string;
  meetingId: string;
  text: string;
  done: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  mentionCount: number;
  firstMeetingId: string;
  createdAt: number;
}

export interface GraphEdge {
  id: string;
  srcNodeId: string;
  dstNodeId: string;
  relation: string;
  weight: number;
  meetingId: string;
}

export interface Chunk {
  id: string;
  meetingId: string;
  text: string;
  startMs: number;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Which tool the assistant used (assistant turns only); null for user turns. */
  usedTool: ToolName | null;
  /** Citations attached to an assistant turn; empty for user turns. */
  citations: Citation[];
  createdAt: number;
}
