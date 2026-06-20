import { ask, parseToolCall } from "./ask";
import { __resetDbForTests } from "../db/sqlite";
import { insertChunk } from "../db/chunks";
import { createMeeting } from "../db/meetings";

beforeEach(() => __resetDbForTests());

describe("parseToolCall (router)", () => {
  test("routes task questions to list_todos", () => {
    expect(parseToolCall('{"tool":"list_todos"}', "x")).toEqual({ tool: "list_todos" });
  });

  test("routes memory questions to search_memory with the model's query", () => {
    expect(parseToolCall('{"tool":"search_memory","query":"starknet paymaster"}', "orig")).toEqual({
      tool: "search_memory",
      query: "starknet paymaster",
    });
  });

  test("tolerates prose/fences around the JSON", () => {
    const raw = 'Sure! ```json\n{"tool":"list_todos"}\n``` done';
    expect(parseToolCall(raw, "x")).toEqual({ tool: "list_todos" });
  });

  test("defaults to memory search with the fallback query on junk", () => {
    expect(parseToolCall("not json at all", "my question")).toEqual({
      tool: "search_memory",
      query: "my question",
    });
  });

  test("falls back to the original question when search query is empty", () => {
    expect(parseToolCall('{"tool":"search_memory","query":""}', "orig")).toEqual({
      tool: "search_memory",
      query: "orig",
    });
  });
});

test("returns a no-data fallback when nothing has been recorded", async () => {
  const r = await ask("what about starknet?");
  expect(r.citations).toEqual([]);
  expect(r.answer).toMatch(/don't have/i);
});

test("retrieves chunks and returns citations mapped to meetings", async () => {
  const m = createMeeting({ title: "Starknet sync" });
  insertChunk({
    meetingId: m.id,
    text: "we shipped the starknet paymaster",
    startMs: 0,
    embedding: new Float32Array([1, 0, 0]),
  });
  const r = await ask("starknet?");
  // mocked completion streams "[]" → trimmed answer; citations come from the chunk
  expect(r.citations).toHaveLength(1);
  expect(r.citations[0].meetingTitle).toBe("Starknet sync");
  expect(r.citations[0].text).toContain("paymaster");
});
