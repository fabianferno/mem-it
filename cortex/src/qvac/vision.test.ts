import { cleanVisionOutput, VISION_PROMPT } from "./vision";

test("cleanVisionOutput trims whitespace and collapses blank runs", () => {
  expect(cleanVisionOutput("  A whiteboard with Q3 goals.\n\n\n\nThree bullet points. ")).toBe(
    "A whiteboard with Q3 goals.\n\nThree bullet points."
  );
});

test("cleanVisionOutput returns empty string for whitespace-only input", () => {
  expect(cleanVisionOutput("   \n\n ")).toBe("");
});

test("VISION_PROMPT asks for both verbatim text and a scene description", () => {
  expect(VISION_PROMPT.toLowerCase()).toContain("text");
  expect(VISION_PROMPT.toLowerCase()).toContain("describe");
});
