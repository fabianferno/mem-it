import { ask } from "./ask";
import { __resetDbForTests } from "../db/sqlite";
import { insertChunk } from "../db/chunks";
import { createMeeting } from "../db/meetings";

beforeEach(() => __resetDbForTests());

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
