import { normalizeError, QVAC_CODES, NormalizedError } from "../src/qvac/errors";

function fakeQvacError(code: number, message = "boom") {
  return { name: "QvacError", code, message, cause: undefined };
}

test("INFERENCE_CANCELLED maps to cancelled (not an error)", () => {
  const n: NormalizedError = normalizeError(fakeQvacError(QVAC_CODES.INFERENCE_CANCELLED));
  expect(n.kind).toBe("cancelled");
});

test("IMAGE_FILE_NOT_FOUND maps to error with friendly message", () => {
  const n = normalizeError(fakeQvacError(QVAC_CODES.IMAGE_FILE_NOT_FOUND));
  expect(n.kind).toBe("error");
  expect(n.message.toLowerCase()).toContain("photo");
  expect(n.code).toBe(QVAC_CODES.IMAGE_FILE_NOT_FOUND);
});

test("LIFECYCLE_OPERATION_BLOCKED maps to a retriable error", () => {
  const n = normalizeError(fakeQvacError(QVAC_CODES.LIFECYCLE_OPERATION_BLOCKED));
  expect(n.kind).toBe("error");
  expect(n.retriable).toBe(true);
});

test("download failure is retriable", () => {
  const n = normalizeError(fakeQvacError(QVAC_CODES.DOWNLOAD_ASSET_FAILED));
  expect(n.retriable).toBe(true);
});

test("unknown / non-qvac error falls back to generic error", () => {
  const n = normalizeError(new Error("random"));
  expect(n.kind).toBe("error");
  expect(n.message.length).toBeGreaterThan(0);
});
