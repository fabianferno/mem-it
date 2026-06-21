import {
  addAttachment,
  getAttachments,
  updateAttachmentAnalysis,
  deleteAttachment,
} from "./attachments";
import { __resetDbForTests } from "./sqlite";

beforeEach(() => __resetDbForTests());

test("addAttachment starts in 'analyzing' with null analysis", () => {
  const a = addAttachment("m1", "file:///photo.jpg");
  expect(a.meetingId).toBe("m1");
  expect(a.uri).toBe("file:///photo.jpg");
  expect(a.status).toBe("analyzing");
  expect(a.analysis).toBeNull();
});

test("getAttachments scopes to the meeting, oldest-first", () => {
  const a = addAttachment("m1", "file:///a.jpg");
  const b = addAttachment("m1", "file:///b.jpg");
  addAttachment("m2", "file:///c.jpg");
  const ids = getAttachments("m1").map((x) => x.id);
  expect(ids).toEqual([a.id, b.id]);
});

test("updateAttachmentAnalysis sets text + status", () => {
  const a = addAttachment("m1", "file:///a.jpg");
  updateAttachmentAnalysis(a.id, "A page of handwritten notes about Q3 goals.", "done");
  const got = getAttachments("m1")[0];
  expect(got.status).toBe("done");
  expect(got.analysis).toBe("A page of handwritten notes about Q3 goals.");
});

test("deleteAttachment removes only that row", () => {
  const a = addAttachment("m1", "file:///a.jpg");
  const b = addAttachment("m1", "file:///b.jpg");
  deleteAttachment(a.id);
  const ids = getAttachments("m1").map((x) => x.id);
  expect(ids).toEqual([b.id]);
});
