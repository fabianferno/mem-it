import { nextStage, isTerminal, TERMINAL_STAGES } from "../src/qvac/stateMachine";

test("happy path advances through every stage in order", () => {
  let s = nextStage("idle", "advance"); expect(s).toBe("capturing");
  s = nextStage(s, "advance"); expect(s).toBe("loading-vlm");
  s = nextStage(s, "advance"); expect(s).toBe("captioning");
  s = nextStage(s, "advance"); expect(s).toBe("unloading-vlm");
  s = nextStage(s, "advance"); expect(s).toBe("loading-diffusion");
  s = nextStage(s, "advance"); expect(s).toBe("stylizing");
  s = nextStage(s, "advance"); expect(s).toBe("unloading-diffusion");
  s = nextStage(s, "advance"); expect(s).toBe("done");
});

test("first run inserts downloading-models after capturing", () => {
  const s = nextStage("capturing", "needs-download");
  expect(s).toBe("downloading-models");
  expect(nextStage(s, "advance")).toBe("loading-vlm");
});

test("error is reachable from any non-terminal stage", () => {
  expect(nextStage("stylizing", "error")).toBe("error");
  expect(nextStage("loading-vlm", "error")).toBe("error");
});

test("cancel is reachable from any non-terminal stage", () => {
  expect(nextStage("captioning", "cancel")).toBe("cancelled");
});

test("terminal stages do not advance", () => {
  for (const t of TERMINAL_STAGES) {
    expect(isTerminal(t)).toBe(true);
    expect(nextStage(t, "advance")).toBe(t);
  }
});

test("reset returns to idle from a terminal stage", () => {
  expect(nextStage("done", "reset")).toBe("idle");
  expect(nextStage("error", "reset")).toBe("idle");
});
