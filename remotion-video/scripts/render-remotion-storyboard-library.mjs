#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import {
  assertStoryboardArtifacts,
  assertStoryboardContract,
} from "./lib/storyboard-contract.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const OUTPUT_DIR = path.join(
  PROJECT_ROOT,
  "out",
  "remotion-storyboard-library",
);
const ENTRY_POINT = path.join(PROJECT_ROOT, "src", "Root.tsx");
const checked = assertStoryboardContract({ projectRoot: PROJECT_ROOT });
const { contract, ids: items, cinematicCount, heroCount } = checked;
const { id: COMPOSITION_ID, reviewFrame: REVIEW_FRAME } = contract.composition;

const fileFor = (index) =>
  path.join(
    OUTPUT_DIR,
    `${String(index + 1).padStart(2, "0")}-${items[index]}.png`,
  );

const xstack = ({ files, columns, width, height, output, pad = false }) => {
  const inputs = [];
  files.forEach((file) => inputs.push("-i", file));
  if (pad)
    inputs.push("-f", "lavfi", "-i", `color=c=0x0f1a2b:s=${width}x${height}`);
  const count = files.length + (pad ? 1 : 0);
  const filters = Array.from(
    { length: count },
    (_, index) =>
      `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:0x0f1a2b[v${index}]`,
  );
  const layout = Array.from(
    { length: count },
    (_, index) =>
      `${(index % columns) * width}_${Math.floor(index / columns) * height}`,
  ).join("|");
  const streams = Array.from(
    { length: count },
    (_, index) => `[v${index}]`,
  ).join("");
  filters.push(
    `${streams}xstack=inputs=${count}:layout=${layout}:fill=0x0f1a2b[out]`,
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[out]",
      "-frames:v",
      "1",
      output,
    ],
    { cwd: PROJECT_ROOT, stdio: "pipe" },
  );
};

await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

console.log("[storyboard] bundling Remotion once...");
const serveUrl = await bundle({ entryPoint: ENTRY_POINT });
const composition = await selectComposition({
  serveUrl,
  id: COMPOSITION_ID,
  inputProps: { index: 0 },
});
if (
  composition.width !== contract.composition.width ||
  composition.height !== contract.composition.height ||
  composition.fps !== contract.composition.fps
) {
  throw new Error(
    `Unexpected composition contract: ${composition.width}x${composition.height}@${composition.fps}`,
  );
}

for (const [index, id] of items.entries()) {
  const output = fileFor(index);
  console.log(
    `[storyboard] ${String(index + 1).padStart(2, "0")}/${items.length} ${id}`,
  );
  // Selection resolves default/input props into the composition metadata. It
  // must be repeated per storyboard item or every still would reuse index 0.
  const selectedComposition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps: { index },
  });
  await renderStill({
    composition: selectedComposition,
    serveUrl,
    output,
    frame: REVIEW_FRAME,
    imageFormat: "png",
    inputProps: { index },
    chromiumOptions: { disableWebSecurity: false },
  });
}

const allFiles = items.map((_, index) => fileFor(index));
const { uniqueStillCount } = assertStoryboardArtifacts({
  contract,
  ids: items,
  outputDir: OUTPUT_DIR,
});
xstack({
  files: allFiles.slice(0, cinematicCount),
  columns: 4,
  width: 270,
  height: 480,
  output: path.join(OUTPUT_DIR, "contact-01-cinematic-11.png"),
  pad: cinematicCount % 4 !== 0,
});
xstack({
  files: allFiles.slice(cinematicCount),
  columns: 3,
  width: 360,
  height: 640,
  output: path.join(OUTPUT_DIR, "contact-02-hero-9.png"),
});
xstack({
  files: allFiles,
  columns: 4,
  width: 270,
  height: 480,
  output: path.join(OUTPUT_DIR, "contact-all-20.png"),
});

await fs.writeFile(
  path.join(OUTPUT_DIR, "manifest.json"),
  `${JSON.stringify(
    {
      renderer: "Remotion renderStill",
      compositionId: COMPOSITION_ID,
      frame: REVIEW_FRAME,
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      cinematicCount,
      heroCount,
      uniqueStillCount,
      items: items.map((id, index) => ({
        index: index + 1,
        id,
        file: path.basename(fileFor(index)),
      })),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      renderer: "Remotion renderStill",
      outputDir: OUTPUT_DIR,
      stills: items.length,
      uniqueStills: uniqueStillCount,
      contacts: [
        "contact-01-cinematic-11.png",
        "contact-02-hero-9.png",
        "contact-all-20.png",
      ],
    },
    null,
    2,
  ),
);
