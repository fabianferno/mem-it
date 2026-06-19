import {
  createMeeting,
  getMeeting,
  updateMeeting,
  listMeetings,
  addActionItem,
  getActionItems,
  toggleActionItem,
} from "./meetings";
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

test("listMeetings returns newest first", () => {
  const a = createMeeting({ title: "A" });
  const b = createMeeting({ title: "B" });
  // ensure distinct started_at ordering even if created in same ms
  updateMeeting(a.id, { startedAt: 1000 });
  updateMeeting(b.id, { startedAt: 2000 });
  const ids = listMeetings().map((m) => m.id);
  expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
});
