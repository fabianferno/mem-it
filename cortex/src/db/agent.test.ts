import { appendAgentMessage, getAgentMessages, clearAgentMessages } from "./agent";
import { __resetDbForTests } from "./sqlite";

beforeEach(() => __resetDbForTests());

test("append + fetch a user message", () => {
  appendAgentMessage({ role: "user", content: "what did we decide?", usedTool: null, citations: [] });
  const msgs = getAgentMessages();
  expect(msgs).toHaveLength(1);
  expect(msgs[0].role).toBe("user");
  expect(msgs[0].content).toBe("what did we decide?");
  expect(msgs[0].usedTool).toBeNull();
  expect(msgs[0].citations).toEqual([]);
});

test("assistant message round-trips usedTool + citations", () => {
  appendAgentMessage({
    role: "assistant",
    content: "We decided to ship Friday.",
    usedTool: "search_memory",
    citations: [{ meetingId: "m1", meetingTitle: "Standup", text: "ship Friday" }],
  });
  const m = getAgentMessages()[0];
  expect(m.usedTool).toBe("search_memory");
  expect(m.citations).toHaveLength(1);
  expect(m.citations[0].meetingTitle).toBe("Standup");
});

test("getAgentMessages returns oldest-first", () => {
  const a = appendAgentMessage({ role: "user", content: "first", usedTool: null, citations: [] });
  const b = appendAgentMessage({ role: "assistant", content: "second", usedTool: "list_todos", citations: [] });
  const ids = getAgentMessages().map((m) => m.id);
  expect(ids).toEqual([a.id, b.id]);
});

test("clearAgentMessages empties the conversation", () => {
  appendAgentMessage({ role: "user", content: "hi", usedTool: null, citations: [] });
  clearAgentMessages();
  expect(getAgentMessages()).toHaveLength(0);
});
