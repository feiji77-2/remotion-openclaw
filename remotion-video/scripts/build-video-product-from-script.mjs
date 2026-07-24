#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  buildVideoProductSpecFromProductionPack,
  buildVideoProductSpecFromScript,
  relativeProjectPath,
} from "./lib/narrative-planner.mjs";
import {measureVideoProductSpec} from "./lib/video-product-metrics.mjs";
import {slugify} from "./lib/script-project-generator.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const hasFlag = (flag) => args.includes(flag);

const positional = args.find((arg, index) => !arg.startsWith("--") && (index === 0 || !args[index - 1]?.startsWith("--")));

const readJsonIfPresent = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
};

const readCaptionsInput = async (baseDir = process.cwd()) => {
  const captionsFile = valueFor("--captions-file") ?? valueFor("--captions");
  if (!captionsFile) return null;
  return JSON.parse(await fs.readFile(path.resolve(baseDir, captionsFile), "utf8"));
};

const readTextInput = async () => {
  const inline = valueFor("--script");
  if (inline) return inline;
  const file = valueFor("--script-file");
  if (file) return fs.readFile(path.resolve(process.cwd(), file), "utf8");
  return "";
};

const maybePackDir = positional ? path.resolve(process.cwd(), positional) : null;
const packBrief = maybePackDir ? await readJsonIfPresent(path.join(maybePackDir, "brief.json")) : null;
const packScript = maybePackDir ? await readJsonIfPresent(path.join(maybePackDir, "script-pack.json")) : null;
const packAssets = maybePackDir ? await readJsonIfPresent(path.join(maybePackDir, "asset-pack.json")) : null;
const maxScenes = Math.max(3, Number(valueFor("--max-scenes", "8")) || 8);

const spec = packBrief && packScript
  ? buildVideoProductSpecFromProductionPack({
      brief: packBrief,
      scriptPack: packScript,
      assetPack: packAssets,
      captions: await readCaptionsInput(maybePackDir),
      maxScenes,
    })
  : buildVideoProductSpecFromScript({
      scriptText: await readTextInput(),
      captions: await readCaptionsInput(),
      projectId: valueFor("--id"),
      title: valueFor("--title"),
      keywords: valueFor("--keywords", ""),
      maxScenes,
    });

if (hasFlag("--strict")) {
  const metrics = measureVideoProductSpec(spec);
  if (!metrics.ok) {
    throw new Error(`[VIDEO_PRODUCT_SPEC_QUALITY_FAILED] ${metrics.errors.join("; ")}`);
  }
}

const defaultOut = packBrief && packScript
  ? "video-product.json"
  : `examples/${slugify(spec.metadata.projectId, "video-product")}.video-product.json`;
const outputPath = path.resolve(packBrief && packScript ? maybePackDir : PROJECT_ROOT, valueFor("--out", defaultOut));
await fs.mkdir(path.dirname(outputPath), {recursive: true});
await fs.writeFile(outputPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");

const relativeOut = relativeProjectPath(PROJECT_ROOT, outputPath);
console.log(JSON.stringify({
  ok: true,
  spec: outputPath,
  projectId: spec.metadata.projectId,
  scenes: spec.scenes.length,
  variants: spec.variants.length,
  motionPresets: [...new Set(spec.scenes.flatMap((scene) => scene.motion.presetIds))].length,
  next: [
    `npm --prefix remotion-video run product:metrics -- ${relativeOut} --strict`,
    `npm --prefix remotion-video run dev`,
  ],
}, null, 2));
