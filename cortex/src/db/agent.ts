import type { AgentMessage } from "../types";
import { openDb, newId } from "./sqlite";

type AgentRow = {
  id: string;
  role: AgentMessage["role"];
  content: string;
  used_tool: AgentMessage["usedTool"];
  citations: string | null;
  created_at: number;
};

function toMessage(r: AgentRow): AgentMessage {
  let citations: AgentMessage["citations"] = [];
  if (r.citations) {
    try {
      const parsed = JSON.parse(r.citations);
      if (Array.isArray(parsed)) citations = parsed;
    } catch {
      citations = [];
    }
  }
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    usedTool: r.used_tool ?? null,
    citations,
    createdAt: r.created_at,
  };
}

/** Persist one turn. Counter in the id keeps insert order stable within a tick. */
export function appendAgentMessage(
  msg: Omit<AgentMessage, "id" | "createdAt">
): AgentMessage {
  const full: AgentMessage = { ...msg, id: newId(), createdAt: Date.now() };
  openDb().runSync(
    `INSERT INTO agent_messages (id, role, content, used_tool, citations, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      full.id,
      full.role,
      full.content,
      full.usedTool,
      JSON.stringify(full.citations),
      full.createdAt,
    ]
  );
  return full;
}

export function getAgentMessages(): AgentMessage[] {
  const rows = openDb().getAllSync(
    `SELECT * FROM agent_messages ORDER BY created_at ASC, rowid ASC`
  ) as AgentRow[];
  return rows.map(toMessage);
}

export function clearAgentMessages(): void {
  openDb().runSync(`DELETE FROM agent_messages`);
}
