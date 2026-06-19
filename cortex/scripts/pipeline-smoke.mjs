import { readFile, writeFile } from "node:fs/promises";
import {
  loadModel, completion, diffusion, unloadModel, profiler,
  SMOLVLM2_500M_MULTIMODAL_Q8_0, MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0,
  SD_V2_1_1B_Q8_0,
} from "@qvac/sdk";

const photoPath = process.argv[2] ?? "./scripts/test-photo.jpg";
const strength = Number(process.argv[3] ?? 0.45);
const steps = Number(process.argv[4] ?? 20);

profiler.enable({ mode: "verbose" });

// 1. caption
const vlm = await loadModel({
  modelSrc: SMOLVLM2_500M_MULTIMODAL_Q8_0,
  modelType: "llm",
  modelConfig: { ctx_size: 1024, projectionModelSrc: MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0 },
  onProgress: (p) => process.stdout.write(`\rvlm ${Math.round(p.percentage)}%`),
});
const cap = completion({
  modelId: vlm,
  history: [{
    role: "user",
    content: "Describe this photo in one vivid sentence: subjects, setting, lighting, mood. No preamble.",
    attachments: [{ path: photoPath }],
  }],
  stream: true,
});
const caption = await cap.text;
console.log("\ncaption:", caption);
await unloadModel({ modelId: vlm });

// 2. stylize (img2img)
const sd = await loadModel({
  modelSrc: SD_V2_1_1B_Q8_0,
  modelType: "diffusion",
  onProgress: (p) => process.stdout.write(`\rsd ${Math.round(p.percentage)}%`),
});
const initImage = new Uint8Array(await readFile(photoPath));
const prompt = `${caption}, cyberpunk style, neon signage, rain-slicked surfaces, volumetric lighting, high contrast`;
const dz = diffusion({
  modelId: sd,
  prompt,
  negative_prompt: "blurry, low quality, watermark, text, distorted face",
  init_image: initImage,
  strength,
  steps,
  cfg_scale: 7.5,
  seed: -1,
});
for await (const { step, totalSteps } of dz.progressStream) {
  process.stdout.write(`\rstylize ${step}/${totalSteps}`);
}
const [png] = await dz.outputs;
await writeFile(`./scripts/out-s${strength}-st${steps}.png`, Buffer.from(png));
await unloadModel({ modelId: sd });
console.log("\n" + profiler.exportTable());
