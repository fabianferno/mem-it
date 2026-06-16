import { AppState, AppStateStatus } from "react-native";
import { suspend, resume, state, cancel } from "@qvac/sdk";

export function installLifecycle(): () => void {
  const sub = AppState.addEventListener("change", async (next: AppStateStatus) => {
    try {
      if (next === "active") {
        const s = await state();
        if (s === "suspended" || s === "suspending") await resume();
      } else if (next === "background") {
        await suspend();
      }
    } catch {
      // lifecycle calls are best-effort; ignore races
    }
  });
  return () => sub.remove();
}

// Safety net: kill any in-flight inference for a model on unmount/cancel.
export async function cancelModel(modelId: string, kind: "completion" | "diffusion"): Promise<void> {
  try {
    await cancel({ modelId, kind });
  } catch {
    // nothing in flight
  }
}
