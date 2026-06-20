import {
  createMeeting,
  getMeeting,
  updateMeeting,
  listMeetings,
  addActionItem,
  getActionItems,
  toggleActionItem,
  deleteMeeting,
  listAllActionItems,
} from "./meetings";
import { upsertNodeByLabel, getGraph } from "./graph";
import { __resetDbForTests } from "./sqlite";

beforeEach(() => __resetDbForTests());

test("create + fetch a meeting", () => {
  const m = createMeeting({ title: "Standup" });
  expect(getMeeting(m.id)?.title).toBe("Standup");
  expect(getMeeting(m.id)?.status).toBe("recording");
});

test("update transcript + status", () => {
  const m = createMeeting({ title: "X" });
  updateMeeting(m.id, { transcript: "hello", status: "done" });
  expect(getMeeting(m.id)?.transcript).toBe("hello");
  expect(getMeeting(m.id)?.status).toBe("done");
});

test("action items round-trip + toggle", () => {
  const m = createMeeting({ title: "X" });
  const a = addActionItem(m.id, "ship it");
  expect(getActionItems(m.id)[0].text).toBe("ship it");
  expect(getActionItems(m.id)[0].done).toBe(false);
  toggleActionItem(a.id, true);
  expect(getActionItems(m.id)[0].done).toBe(true);
});

test("deleteMeeting removes the meeting, its action items, and its unique nodes", () => {
  const m = createMeeting({ title: "Standup" });
  addActionItem(m.id, "ship it");
  upsertNodeByLabel({ label: "QVAC", type: "tech", meetingId: m.id });
  deleteMeeting(m.id);
  expect(getMeeting(m.id)).toBeNull();
  expect(getActionItems(m.id)).toHaveLength(0);
  expect(getGraph().nodes).toHaveLength(0);
});

test("deleteMeeting keeps concepts shared with other meetings", () => {
  const a = createMeeting({ title: "A" });
  const b = createMeeting({ title: "B" });
  upsertNodeByLabel({ label: "QVAC", type: "tech", meetingId: a.id }); // introduced by A
  upsertNodeByLabel({ label: "QVAC", type: "tech", meetingId: b.id }); // mentioned again -> count 2
  deleteMeeting(b.id);
  expect(getGraph().nodes).toHaveLength(1); // shared concept survives
});

test("listAllActionItems spans meetings and tags each with its meeting title", () => {
  const a = createMeeting({ title: "Standup" });
  const b = createMeeting({ title: "1:1" });
  addActionItem(a.id, "ship it");
  addActionItem(b.id, "book room");
  const all = listAllActionItems();
  expect(all).toHaveLength(2);
  expect(all.find((i) => i.text === "ship it")?.meetingTitle).toBe("Standup");
  expect(all.find((i) => i.text === "book room")?.meetingTitle).toBe("1:1");
});

test("listMeetings returns newest first", () => {
  const a = createMeeting({ title: "A" });
  const b = createMeeting({ title: "B" });
  // ensure distinct started_at ordering even if created in same ms
  updateMeeting(a.id, { startedAt: 1000 });
  updateMeeting(b.id, { startedAt: 2000 });
  const ids = listMeetings().map((m) => m.id);
  expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
});
