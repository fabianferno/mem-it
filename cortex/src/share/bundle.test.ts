import {
  buildBundle,
  serializeBundle,
  parseBundle,
  importBundle,
  MEMIT_BUNDLE_SCHEMA,
} from "./bundle";
import { __resetDbForTests } from "../db/sqlite";
import { createMeeting, updateMeeting, addActionItem, getActionItems, listMeetings } from "../db/meetings";
import { insertChunk, getChunksByMeeting } from "../db/chunks";
import { upsertNodeByLabel, insertEdge, getGraph } from "../db/graph";

beforeEach(() => __resetDbForTests());

function seedMeeting() {
  const m = createMeeting({ title: "Starknet sync" });
  updateMeeting(m.id, { transcript: "we shipped the paymaster", summary: "Shipped it." });
  addActionItem(m.id, "email Bob");
  insertChunk({
    meetingId: m.id,
    text: "we shipped the starknet paymaster",
    startMs: 0,
    embedding: new Float32Array([0.1, 0.2, 0.3]),
  });
  const a = upsertNodeByLabel({ label: "Starknet", type: "tech", meetingId: m.id });
  const b = upsertNodeByLabel({ label: "Paymaster", type: "concept", meetingId: m.id });
  insertEdge({ srcId: a.id, dstId: b.id, relation: "ships", meetingId: m.id });
  return m;
}

test("buildBundle captures meeting, items, chunks, and subgraph", () => {
  const m = seedMeeting();
  const b = buildBundle(m.id, "2026-06-21T00:00:00Z");

  expect(b.schema).toBe(MEMIT_BUNDLE_SCHEMA);
  expect(b.meeting.title).toBe("Starknet sync");
  expect(b.meeting.transcript).toContain("paymaster");
  expect(b.actionItems).toEqual([{ text: "email Bob", done: false }]);
  expect(b.chunks).toHaveLength(1);
  expect(b.chunks[0].embedding).toEqual([
    expect.closeTo(0.1, 5),
    expect.closeTo(0.2, 5),
    expect.closeTo(0.3, 5),
  ]);
  expect(b.nodes.map((n) => n.label).sort()).toEqual(["Paymaster", "Starknet"]);
  expect(b.edges).toEqual([{ srcLabel: "Starknet", dstLabel: "Paymaster", relation: "ships" }]);
});

test("serialize → parse round-trips", () => {
  const m = seedMeeting();
  const b = buildBundle(m.id, "2026-06-21T00:00:00Z");
  const parsed = parseBundle(serializeBundle(b));
  expect(parsed).toEqual(b);
});

test("importBundle merges into a fresh store as a new meeting", () => {
  const m = seedMeeting();
  const text = serializeBundle(buildBundle(m.id, "2026-06-21T00:00:00Z"));

  // Simulate the recipient device: clean DB, then import.
  __resetDbForTests();
  const res = importBundle(parseBundle(text));

  expect(res.actionItems).toBe(1);
  expect(res.chunks).toBe(1);
  expect(res.nodesAdded).toBe(2);
  expect(res.edges).toBe(1);

  const meetings = listMeetings();
  expect(meetings).toHaveLength(1);
  expect(meetings[0].title).toBe("Starknet sync (shared)");
  expect(getActionItems(meetings[0].id)).toHaveLength(1);
  expect(getChunksByMeeting(meetings[0].id)[0].text).toContain("paymaster");
  expect(getGraph().nodes).toHaveLength(2);
  expect(getGraph().edges).toHaveLength(1);
});

test("importing a node that already exists merges by label instead of duplicating", () => {
  const m = seedMeeting();
  const text = serializeBundle(buildBundle(m.id, "2026-06-21T00:00:00Z"));

  // Recipient already has a "Starknet" tech node.
  __resetDbForTests();
  upsertNodeByLabel({ label: "starknet", type: "tech", meetingId: "pre" });

  const res = importBundle(parseBundle(text));
  expect(res.nodesMerged).toBe(1); // Starknet merged
  expect(res.nodesAdded).toBe(1); // Paymaster new
  expect(getGraph().nodes).toHaveLength(2); // no duplicate Starknet
});

test("parseBundle rejects non-bundle files", () => {
  expect(() => parseBundle("not json")).toThrow(/valid mem-it file/i);
  expect(() => parseBundle('{"schema":"something-else"}')).toThrow(/isn't a mem-it bundle/i);
});
