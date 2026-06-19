// Numeric codes verified against @qvac/sdk@0.12.2 dist/schemas/sdk-errors-*.d.ts
export const QVAC_CODES = {
  MODEL_LOAD_FAILED: 52200,
  ATTACHMENT_NOT_FOUND: 52407,
  IMAGE_FILE_NOT_FOUND: 52413,
  INVALID_IMAGE_INPUT: 52414,
  INFERENCE_CANCELLED: 52419,
  CHECKSUM_VALIDATION_FAILED: 53002,
  HTTP_ERROR: 53003,
  DOWNLOAD_CANCELLED: 53001,
  DOWNLOAD_ASSET_FAILED: 53007,
  LIFECYCLE_OPERATION_BLOCKED: 53602,
} as const;

export type NormalizedError = {
  kind: "cancelled" | "error";
  code?: number;
  message: string;
  retriable: boolean;
};

function codeOf(err: unknown): number | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code: unknown }).code;
    if (typeof c === "number") return c;
  }
  return undefined;
}

export function normalizeError(err: unknown): NormalizedError {
  const code = codeOf(err);

  if (code === QVAC_CODES.INFERENCE_CANCELLED || code === QVAC_CODES.DOWNLOAD_CANCELLED) {
    return { kind: "cancelled", code, message: "Cancelled.", retriable: true };
  }

  switch (code) {
    case QVAC_CODES.IMAGE_FILE_NOT_FOUND:
    case QVAC_CODES.ATTACHMENT_NOT_FOUND:
      return { kind: "error", code, message: "Couldn't read the captured photo. Try taking it again.", retriable: true };
    case QVAC_CODES.INVALID_IMAGE_INPUT:
      return { kind: "error", code, message: "That photo couldn't be processed. Try another shot.", retriable: true };
    case QVAC_CODES.LIFECYCLE_OPERATION_BLOCKED:
      return { kind: "error", code, message: "App was backgrounded mid-step. Tap retry.", retriable: true };
    case QVAC_CODES.DOWNLOAD_ASSET_FAILED:
    case QVAC_CODES.HTTP_ERROR:
    case QVAC_CODES.CHECKSUM_VALIDATION_FAILED:
      return { kind: "error", code, message: "Model download failed. Check your connection and retry.", retriable: true };
    case QVAC_CODES.MODEL_LOAD_FAILED:
      return { kind: "error", code, message: "The model failed to load. Retry, or clear the cache in Settings.", retriable: true };
    default: {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Something went wrong.";
      return { kind: "error", code, message, retriable: true };
    }
  }
}
