import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CONTRACT_PATH =
  "src/components/ultimate-kit/families/skill-showcase/storyboardContract.json";
const CATALOG_SOURCE_PATH = "src/compositions/RemotionStoryboardLibrary.tsx";
const PORTRAIT_SOURCE_PATH =
  "src/components/ultimate-kit/families/skill-showcase/PortraitCinematicSkillShowcase.tsx";
const RENDER_SOURCE_PATH = "scripts/render-remotion-storyboard-library.mjs";
const AI_IMAGE_MARKERS = [
  "image_gen",
  "imagegen",
  ".codex/generated_images",
  "generatedImage(",
];

const fail = (message) => {
  throw new Error(`[storyboard-contract] ${message}`);
};

const readUtf8 = (projectRoot, relativePath) => {
  const absolute = path.join(projectRoot, relativePath);
  if (!existsSync(absolute)) fail(`missing ${relativePath}`);
  return readFileSync(absolute, "utf8");
};

const zoneIsValid = (zone, height) =>
  Number.isInteger(zone?.top) &&
  Number.isInteger(zone?.bottom) &&
  zone.top >= 0 &&
  zone.bottom > zone.top &&
  zone.bottom <= height;

export const loadStoryboardContract = (projectRoot) => {
  const source = readUtf8(projectRoot, CONTRACT_PATH);
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(
      `${CONTRACT_PATH} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

export const assertStoryboardContract = ({ projectRoot }) => {
  const contract = loadStoryboardContract(projectRoot);
  const composition = contract?.composition ?? {};
  const zones = contract?.zones ?? {};
  const cinematic = Array.isArray(contract?.catalog?.cinematic)
    ? contract.catalog.cinematic
    : [];
  const hero = Array.isArray(contract?.catalog?.hero)
    ? contract.catalog.hero
    : [];
  const ids = [...cinematic, ...hero];

  if (contract.schemaVersion !== 1)
    fail(`schemaVersion must be 1, received ${contract.schemaVersion}`);
  if (composition.id !== "RemotionStoryboardLibrary")
    fail(`unexpected composition id ${composition.id}`);
  if (
    composition.width !== 1080 ||
    composition.height !== 1920 ||
    composition.fps !== 30
  ) {
    fail(
      `composition must be 1080x1920@30, received ${composition.width}x${composition.height}@${composition.fps}`,
    );
  }
  if (
    !Number.isInteger(composition.durationInFrames) ||
    composition.durationInFrames <= 0
  )
    fail("durationInFrames must be a positive integer");
  if (
    !Number.isInteger(composition.reviewFrame) ||
    composition.reviewFrame < 0 ||
    composition.reviewFrame >= composition.durationInFrames
  )
    fail("reviewFrame must be inside the composition");
  if (cinematic.length !== 11 || hero.length !== 9 || ids.length !== 20)
    fail(
      `catalog must contain 11 Cinematic + 9 Hero Track, received ${cinematic.length} + ${hero.length}`,
    );
  if (new Set(ids).size !== ids.length) fail("catalog IDs must be unique");

  for (const [name, zone] of Object.entries(zones)) {
    if (!zoneIsValid(zone, composition.height)) fail(`${name} zone is invalid`);
  }
  if (
    !(
      zones.chapter.bottom <= zones.hero.top &&
      zones.hero.bottom < zones.semantic.top &&
      zones.semantic.bottom < zones.caption.top &&
      zones.caption.bottom <= composition.height
    )
  ) {
    fail("chapter, hero, semantic and caption zones must not overlap");
  }

  if (contract?.policies?.imageGeneration !== "remotion-code-only")
    fail("imageGeneration policy must be remotion-code-only");
  if (contract?.policies?.heroText !== "entity-and-evidence-only")
    fail("Hero text policy must be entity-and-evidence-only");

  const catalogSource = readUtf8(projectRoot, CATALOG_SOURCE_PATH);
  const declaredIds = [
    ...catalogSource.matchAll(/\{\s*id:\s*["']([^"']+)["']/g),
  ].map((match) => match[1]);
  if (JSON.stringify(declaredIds) !== JSON.stringify(ids))
    fail("TS catalog order does not match storyboardContract.json");

  const portraitSource = readUtf8(projectRoot, PORTRAIT_SOURCE_PATH);
  const convergenceStart = portraitSource.indexOf(
    "const SystemConvergenceShot",
  );
  const convergenceEnd = portraitSource.indexOf(
    "export const CinematicShot",
    convergenceStart,
  );
  if (convergenceStart < 0 || convergenceEnd <= convergenceStart)
    fail("cannot locate SystemConvergenceShot");
  const convergenceSource = portraitSource.slice(
    convergenceStart,
    convergenceEnd,
  );
  for (const literal of contract.forbiddenMainVisualLiterals ?? []) {
    if (convergenceSource.includes(literal))
      fail(
        `SystemConvergenceShot must not render narration literal: ${literal}`,
      );
  }

  const renderSource = readUtf8(projectRoot, RENDER_SOURCE_PATH);
  const renderScope = `${catalogSource}\n${renderSource}`.toLocaleLowerCase();
  for (const marker of AI_IMAGE_MARKERS) {
    if (renderScope.includes(marker.toLocaleLowerCase()))
      fail(
        `Remotion storyboard chain must not reference AI image generation marker: ${marker}`,
      );
  }
  if (
    !/selectComposition\s*\(\s*\{/u.test(renderSource) ||
    !/inputProps:\s*\{\s*index\s*\}/u.test(renderSource)
  ) {
    fail(
      "renderer must select the composition separately for every storyboard index",
    );
  }

  return {
    contract,
    ids,
    cinematicCount: cinematic.length,
    heroCount: hero.length,
  };
};

const readPngDimensions = (file) => {
  const buffer = readFileSync(file);
  const pngSignature = "89504e470d0a1a0a";
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString("hex") !== pngSignature
  )
    fail(`${path.basename(file)} is not a PNG`);
  return {
    buffer,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

export const assertStoryboardArtifacts = ({ contract, ids, outputDir }) => {
  const hashes = [];
  for (const [index, id] of ids.entries()) {
    const file = path.join(
      outputDir,
      `${String(index + 1).padStart(2, "0")}-${id}.png`,
    );
    if (!existsSync(file)) fail(`missing rendered still ${file}`);
    const { buffer, width, height } = readPngDimensions(file);
    if (
      width !== contract.composition.width ||
      height !== contract.composition.height
    ) {
      fail(
        `${path.basename(file)} must be ${contract.composition.width}x${contract.composition.height}, received ${width}x${height}`,
      );
    }
    hashes.push(createHash("sha256").update(buffer).digest("hex"));
  }
  const uniqueStillCount = new Set(hashes).size;
  if (uniqueStillCount !== ids.length)
    fail(`expected ${ids.length} unique stills, received ${uniqueStillCount}`);
  return { uniqueStillCount };
};
