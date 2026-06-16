import { PRESETS, getPreset, buildPrompt } from "../src/qvac/presets";

test("cyberpunk preset exists with valid template", () => {
  const p = getPreset("cyberpunk");
  expect(p).toBeDefined();
  expect(p!.promptTemplate).toContain("{caption}");
  expect(p!.strength).toBeGreaterThan(0);
  expect(p!.strength).toBeLessThanOrEqual(1);
});

test("getPreset returns undefined for unknown id", () => {
  expect(getPreset("nope")).toBeUndefined();
});

test("buildPrompt substitutes the caption", () => {
  const prompt = buildPrompt(getPreset("cyberpunk")!, "a dog on a beach");
  expect(prompt).toContain("a dog on a beach");
  expect(prompt).not.toContain("{caption}");
});

test("PRESETS is a non-empty registry", () => {
  expect(PRESETS.length).toBeGreaterThanOrEqual(1);
});
