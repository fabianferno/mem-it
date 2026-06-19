import { parseSummary } from "./summarize";

test("extracts summary + action items from fenced JSON", () => {
  const raw =
    'Sure!\n```json\n{"summary":"We discussed QVAC.","actionItems":["email Bob","book room"]}\n```';
  const r = parseSummary(raw);
  expect(r.summary).toBe("We discussed QVAC.");
  expect(r.actionItems).toEqual(["email Bob", "book room"]);
});

test("falls back to empty action items when missing", () => {
  const r = parseSummary('{"summary":"x"}');
  expect(r.summary).toBe("x");
  expect(r.actionItems).toEqual([]);
});

test("returns empty result on unparseable output", () => {
  const r = parseSummary("the model rambled with no json");
  expect(r).toEqual({ summary: "", actionItems: [] });
});
