import type { StylePreset } from "../types";

const CYBERPUNK: StylePreset = {
  id: "cyberpunk",
  label: "Cyberpunk",
  promptTemplate:
    "{caption}, cyberpunk style, neon signage, rain-slicked surfaces, volumetric lighting, high contrast",
  negativePrompt: "blurry, low quality, watermark, text, distorted face",
  strength: 0.45,
  steps: 20,
  cfgScale: 7.5,
};

export const PRESETS: StylePreset[] = [CYBERPUNK];

export function getPreset(id: string): StylePreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function buildPrompt(preset: StylePreset, caption: string): string {
  return preset.promptTemplate.replace("{caption}", caption);
}
