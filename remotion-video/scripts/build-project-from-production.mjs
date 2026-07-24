#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStarterProject } from "./lib/starter-project.mjs";
import { styleForPalette } from "./lib/production-style-contract.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const input = process.argv[2];
if (!input) {
  console.error("Usage: npm run project:from-pack -- <project-dir> [--out project.json]");
  process.exit(1);
}

const args = process.argv.slice(3);
const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const hasFlag = (flag) => args.includes(flag);

const projectDir = path.resolve(process.cwd(), input);
const readJson = async (file) =>
  JSON.parse(await fs.readFile(path.join(projectDir, file), "utf8"));
const [brief, script, assetPack] = await Promise.all([
  readJson("brief.json"),
  readJson("script-pack.json"),
  readJson("asset-pack.json"),
]);

const readCaptions = async () => {
  if (hasFlag("--ignore-captions")) return null;
  const captionsFile = valueFor("--captions");
  if (!captionsFile) return null;
  const absolute = path.resolve(projectDir, captionsFile);
  try {
    return JSON.parse(await fs.readFile(absolute, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`[CAPTIONS_MISSING] ${path.relative(projectDir, absolute)}`);
    }
    throw error;
  }
};
const captions = await readCaptions();

const projectId = String(brief.productionId ?? script.productionId ?? "project");
const title = String(script.title ?? brief.title ?? projectId);
const spokenScript = String(script.spokenScript ?? "").trim();
if (spokenScript.length < 20) {
  throw new Error("[SCRIPT_TOO_SHORT] script-pack.spokenScript must contain at least 20 characters");
}

const style = brief.visualStyle?.presetId
  ?? styleForPalette(brief.visualStyle?.palette);

const assets = {};
for (const asset of Array.isArray(assetPack.assets) ? assetPack.assets : []) {
  if (!asset?.id || !asset?.kind || !asset?.src) continue;
  assets[asset.id] = {
    kind: asset.kind,
    src: asset.src,
    required: Boolean(asset.required),
  };
}
const voiceAsset = Object.entries(assets).find(([, asset]) => asset.kind === "audio");

const project = buildStarterProject(
  projectId,
  title,
  spokenScript,
  "portrait",
  style,
  script.keywords ?? "",
  {
    captions,
    voiceSrc: voiceAsset?.[1]?.src,
    projectRoot: PROJECT_ROOT,
  },
);

project.assets = assets;
project.audio = voiceAsset ? { voiceAssetId: voiceAsset[0] } : {};

const output = path.resolve(projectDir, valueFor("--out", "project.json"));
await fs.writeFile(output, `${JSON.stringify(project, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  project: output,
  projectId: project.projectId,
  scenes: project.scenes.length,
  durationInFrames: project.scenes.reduce(
    (sum, scene) => sum + scene.durationInFrames,
    0,
  ),
  captions: project.captions.length,
  families: [...new Set(project.scenes.map((scene) => scene.family))],
  renderers: [...new Set(project.scenes.map((scene) => scene.payload.heroStyle))],
}, null, 2));
