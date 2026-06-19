jest.mock("../qvac/stt");
jest.mock("../qvac/extract");
jest.mock("../qvac/summarize");
jest.mock("../qvac/embed");

import { runSession, chunkText } from "./runSession";
import { transcribeSession } from "../qvac/stt";
import { extractEntities } from "../qvac/extract";
import { summarize } from "../qvac/summarize";
import { withEmbedder } from "../qvac/embed";
import { createMeeting, getMeeting, getActionItems } from "../db/meetings";
import { getGraph } from "../db/graph";
import { __resetDbForTests } from "../db/sqlite";

beforeEach(() => {
  __resetDbForTests();
  jest.clearAllMocks();
});

test("runs stages strictly in order and persists transcript/summary/actions/graph", async () => {
  const callLog: string[] = [];
  (transcribeSession as jest.Mock).mockImplementation(async () => {
    callLog.push("stt");
    return "hello world transcript";
  });
  (extractEntities as jest.Mock).mockImplementation(async (_t, onNode, onEdge) => {
    callLog.push("extract");
    onNode?.({ label: "QVAC", type: "tech" });
    onNode?.({ label: "Privacy", type: "value" });
    onEdge?.({ src: "QVAC", dst: "Privacy", relation: "enables" });
    return {
      nodes: [
        { label: "QVAC", type: "tech" },
        { label: "Privacy", type: "value" },
      ],
      edges: [{ src: "QVAC", dst: "Privacy", relation: "enables" }],
    };
  });
  (summarize as jest.Mock).mockImplementation(async () => {
    callLog.push("summarize");
    return { summary: "We discussed QVAC.", actionItems: ["email Bob"] };
  });
  (withEmbedder as jest.Mock).mockImplementation(async (fn: any) => {
    callLog.push("embed");
    let i = 0;
    return fn(async () => new Float32Array([i++, 1]));
  });

  const m = createMeeting({ title: "T" });
  const stages: string[] = [];
  await runSession({
    meetingId: m.id,
    wavUri: "file:///a.wav",
    onStage: (s) => stages.push(s),
  });

  expect(callLog).toEqual(["stt", "extract", "summarize", "embed"]);
  expect(stages).toEqual(["transcribing", "extracting", "summarizing", "embedding", "done"]);
  const saved = getMeeting(m.id);
  expect(saved?.status).toBe("done");
  expect(saved?.transcript).toBe("hello world transcript");
  expect(saved?.summary).toBe("We discussed QVAC.");
  expect(getActionItems(m.id).map((a) => a.text)).toEqual(["email Bob"]);
  const g = getGraph();
  expect(g.nodes).toHaveLength(2);
  expect(g.edges).toHaveLength(1);
});

test("marks meeting error and rethrows when a stage throws", async () => {
  (transcribeSession as jest.Mock).mockRejectedValue(new Error("whisper boom"));
  const m = createMeeting({ title: "T" });
  const stages: string[] = [];
  await expect(
    runSession({ meetingId: m.id, wavUri: "file:///a.wav", onStage: (s) => stages.push(s) })
  ).rejects.toThrow("whisper boom");
  expect(getMeeting(m.id)?.status).toBe("error");
  expect(stages).toContain("error");
});

test("chunkText splits on ~500-char windows", () => {
  const text = Array.from({ length: 300 }, () => "word").join(" ");
  const chunks = chunkText(text, 100);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.every((c) => c.length <= 100)).toBe(true);
});
