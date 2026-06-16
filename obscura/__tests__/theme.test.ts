import { theme } from "../src/theme";
test("accent is the darkroom safelight red", () => {
  expect(theme.color.accent).toBe("#FF5B4A");
  expect(theme.color.bg).toBe("#0A0A0B");
});
test("display type is uppercase", () => {
  expect(theme.type.display.textTransform).toBe("uppercase");
});
