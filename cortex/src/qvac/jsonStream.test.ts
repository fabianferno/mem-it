import { createArrayItemParser } from "./jsonStream";

test("emits objects from a streamed JSON array as they complete", () => {
  const got: any[] = [];
  const p = createArrayItemParser<any>((x) => got.push(x));
  p.push('[{"label":"QVAC",'); // partial — nothing yet
  expect(got).toHaveLength(0);
  p.push('"type":"tech"},{"label":"Privacy","type":"value"}]');
  expect(got).toEqual([
    { label: "QVAC", type: "tech" },
    { label: "Privacy", type: "value" },
  ]);
});

test("handles strings containing braces and escaped quotes", () => {
  const got: any[] = [];
  const p = createArrayItemParser<any>((x) => got.push(x));
  p.push('[{"label":"a {b} \\"c\\"","type":"concept"}]');
  expect(got[0].label).toBe('a {b} "c"');
});

test("tolerates leading prose / markdown fence before the array", () => {
  const got: any[] = [];
  const p = createArrayItemParser<any>((x) => got.push(x));
  p.push('Here you go:\n```json\n[{"label":"X","type":"tech"}]\n```');
  expect(got).toEqual([{ label: "X", type: "tech" }]);
});

test("end() returns all collected items", () => {
  const p = createArrayItemParser<any>(() => {});
  p.push('[{"a":1},{"a":2}]');
  expect(p.end()).toEqual([{ a: 1 }, { a: 2 }]);
});
