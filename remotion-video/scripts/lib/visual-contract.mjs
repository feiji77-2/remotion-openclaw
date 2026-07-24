import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import {productionComponentCatalog} from "./semantic-component-resolver.mjs";

const GOLDEN_PROJECT_ID = "workbuddy-six-skills-showcase";

const INTRO_OUTRO_VARIANTS = new Set(["intro", "overview", "outro"]);
const REQUIRED_GOLDEN_NARRATION_TERMS = [
  "WorkBuddy",
  "PPT Master",
  "HyperFrames",
  "正文配图",
];

const STALE_GOLDEN_TERMS = [
  "WorkBuddy",
  "编码原则",
  "Karpathy",
  "Remotion",
  "PPT Master",
  "小黑",
  "正文配图",
  "HyperFrames",
  "UI Skill",
  "好帮手",
];

const FORBIDDEN_COMPONENT_LITERALS = [
  "它才算真正的好帮手",
  "我一直在用的",
  "今天，一次分享给你",
  "装上 <span",
];

const PRODUCT_ICON_ROOT = "public/projects/skill-showcase/product-icons";
// Project data uses stable semantic icon keys. A few of those keys deliberately
// point at differently named source SVGs (the same mapping used by the runtime).
// Keep the visual contract aligned with the renderer so a valid Project is not
// rejected just because its public asset uses a descriptive filename.
const PRODUCT_ICON_FILES = {
  coding: "karpathy-guidelines",
  ppt: "ppt-master",
  ui: "ui-skill",
};
const FPS = 30;
const SKILL_SHOWCASE_STYLES = new Set(["cinematic", "hero-track-v2"]);
const CINEMATIC_PRESETS = new Set([
  "kinetic-type",
  "split-wipe",
  "particle-field",
  "orbital-map",
  "ui-scan",
  "material-carousel",
  "focus-lock",
  "pipeline-flow",
  "token-assembly",
  "surface-morph",
  "system-convergence",
]);
const HERO_TRACK_KINDS = new Set([
  "overview-matrix",
  "rule-compare",
  "code-render",
  "slide-editor",
  "article-map",
  "video-agent",
  "design-compare",
  "system-summary",
  "generic-explainer",
]);
const HERO_SHOT_KINDS = new Set([
  "browser-demo",
  "terminal-execution",
  "code-diff",
  "config-check",
  "interface-audit",
  "flow-trace",
  "test-report",
  "asset-library",
  "system-map",
  "before-after",
  "metric-highlight",
  "concept-explainer",
]);
const PRODUCTION_COMPONENTS = new Map(
  productionComponentCatalog.components.map((descriptor) => [descriptor.componentId, descriptor]),
);

const collectStrings = (value, output = []) => {
  if (typeof value === "string") {
    const text = value.trim();
    if (text) output.push(text);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, output));
  }
  return output;
};

const VISUAL_METADATA_KEYS = new Set([
  "accent",
  "brandIcon",
  "captionEndIndex",
  "captionStartIndex",
  "componentId",
  "diagnostics",
  "heroStyle",
  "kind",
  "labelIcons",
  "layoutSignature",
  "narrativeSignal",
  "productIcon",
  "productIcons",
  "progressIndex",
  "progressTotal",
  "rendererComponentId",
  "resolution",
  "signal",
  "sourceComponentId",
  "variant",
  "visualMode",
]);

const collectVisibleStrings = (value, output = []) => {
  if (typeof value === "string") {
    const text = value.trim();
    if (text) output.push(text);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectVisibleStrings(item, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      if (VISUAL_METADATA_KEYS.has(key)) return;
      collectVisibleStrings(item, output);
    });
  }
  return output;
};

const hasText = (haystack, needle) =>
  haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());

const asArray = (value) => (Array.isArray(value) ? value : []);

const frameForMs = (ms) => Math.round((ms / 1000) * FPS);

const compactMeaningText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：,.!?;:《》「」“”"'`~()[\]{}<>|/\\-]/g, "")
    .toLocaleLowerCase();

const sourceTextIsCoveredByNarration = (sourceText, narrationText) => {
  const source = compactMeaningText(sourceText);
  const narration = compactMeaningText(narrationText);
  if (source.length < 4 || narration.length < 4) return false;
  if (narration.includes(source)) return true;
  const anchors = [
    source.slice(0, Math.min(36, source.length)),
    source.slice(
      Math.max(0, Math.floor(source.length / 2) - 18),
      Math.min(source.length, Math.floor(source.length / 2) + 18),
    ),
    source.slice(Math.max(0, source.length - 36)),
  ].filter((anchor) => anchor.length >= 4);
  return anchors.some((anchor) => narration.includes(anchor));
};

const captionTextForRange = (captions, startIndex, endIndex) =>
  captions
    .slice(startIndex, endIndex + 1)
    .map((caption) => caption.text)
    .join("");

const keywordIsCoveredByCaption = (beat, captionText) => {
  const keyword = compactMeaningText(beat.keyword);
  if (keyword.length < 2) return true;
  const caption = compactMeaningText(captionText);
  if (caption.includes(keyword)) return true;
  const semantic = compactMeaningText(
    [
      beat.detail,
      beat.visualState,
      ...(Array.isArray(beat.evidence) ? beat.evidence : []),
    ]
      .filter(Boolean)
      .join(""),
  );
  if (semantic.includes(keyword)) return true;
  if (keyword.length >= 4) {
    const left = keyword.slice(0, Math.ceil(keyword.length / 2));
    const right = keyword.slice(Math.floor(keyword.length / 2));
    return caption.includes(left) || caption.includes(right);
  }
  return false;
};

const isGoldenNarration = (project, narrationText) =>
  project?.projectId === GOLDEN_PROJECT_ID &&
  REQUIRED_GOLDEN_NARRATION_TERMS.every((term) => hasText(narrationText, term));

const assertProductIconExists = (projectRoot, iconId, pathLabel, errors) => {
  if (!iconId) return;
  const iconFile = PRODUCT_ICON_FILES[iconId] ?? iconId;
  const iconPath = path.join(projectRoot, PRODUCT_ICON_ROOT, `${iconFile}.svg`);
  if (!existsSync(iconPath)) {
    errors.push(
      `${pathLabel}: product icon asset missing at ${path.relative(projectRoot, iconPath)}`,
    );
  }
};

const layoutSignatureForScene = (scene) => {
  const payload = scene?.payload ?? {};
  if (
    typeof payload.layoutSignature === "string" &&
    payload.layoutSignature.trim()
  ) {
    return payload.layoutSignature.trim();
  }
  if (typeof payload.variant === "string" && payload.variant !== "generic") {
    return `variant:${payload.variant}`;
  }
  if (typeof payload.visualMode === "string" && payload.visualMode.trim()) {
    return `visual:${payload.visualMode}`;
  }
  return `family:${scene?.family ?? "unknown"}`;
};

const checkSceneCaptionRange = (scene, sceneIndex, captions, errors) => {
  const range = scene?.captionRange;
  if (!range) {
    errors.push(
      `scenes[${sceneIndex}]: non-golden skill-showcase scene must declare captionRange`,
    );
    return null;
  }
  if (
    !Number.isInteger(range.startIndex) ||
    !Number.isInteger(range.endIndex) ||
    range.endIndex < range.startIndex
  ) {
    errors.push(
      `scenes[${sceneIndex}].captionRange: startIndex/endIndex must be ascending integer caption indexes`,
    );
    return null;
  }
  const startCaption = captions[range.startIndex];
  const endCaption = captions[range.endIndex];
  if (!startCaption || !endCaption) {
    errors.push(`scenes[${sceneIndex}].captionRange: points outside captions`);
    return null;
  }
  const expectedDuration =
    frameForMs(endCaption.endMs) - frameForMs(startCaption.startMs);
  if (Math.abs(expectedDuration - scene.durationInFrames) > 1) {
    errors.push(
      `scenes[${sceneIndex}].durationInFrames: must match captionRange within 1 frame; expected ${expectedDuration}, received ${scene.durationInFrames}`,
    );
  }
  return range;
};

const checkBeats = (
  scene,
  sceneIndex,
  errors,
  { captions = [], requireCaptionBinding = false } = {},
) => {
  const beats = asArray(scene?.payload?.beats);
  if (beats.length === 0) {
    errors.push(
      `scenes[${sceneIndex}]: skill-showcase scene must declare beats`,
    );
    return;
  }
  if (beats[0]?.startFrame > 30) {
    errors.push(
      `scenes[${sceneIndex}]: first beat must start within the first second`,
    );
  }
  if (beats.at(-1)?.endFrame !== scene.durationInFrames) {
    errors.push(
      `scenes[${sceneIndex}]: last beat must end at scene.durationInFrames`,
    );
  }
  let previousEnd = null;
  beats.forEach((beat, beatIndex) => {
    if (
      !Number.isInteger(beat.startFrame) ||
      !Number.isInteger(beat.endFrame)
    ) {
      errors.push(
        `scenes[${sceneIndex}].payload.beats[${beatIndex}]: beat frames must be integers`,
      );
    }
    if (beat.endFrame <= beat.startFrame) {
      errors.push(
        `scenes[${sceneIndex}].payload.beats[${beatIndex}]: beat endFrame must be after startFrame`,
      );
    }
    if (beat.endFrame > scene.durationInFrames) {
      errors.push(
        `scenes[${sceneIndex}].payload.beats[${beatIndex}]: beat exceeds scene duration`,
      );
    }
    if (
      previousEnd !== null &&
      !requireCaptionBinding &&
      beat.startFrame - previousEnd > 6
    ) {
      errors.push(
        `scenes[${sceneIndex}].payload.beats[${beatIndex}]: visible beat gap exceeds 6 frames`,
      );
    }
    if (requireCaptionBinding) {
      if (
        !Number.isInteger(beat.captionStartIndex) ||
        !Number.isInteger(beat.captionEndIndex)
      ) {
        errors.push(
          `scenes[${sceneIndex}].payload.beats[${beatIndex}]: captionStartIndex/captionEndIndex are required`,
        );
      } else if (beat.captionEndIndex < beat.captionStartIndex) {
        errors.push(
          `scenes[${sceneIndex}].payload.beats[${beatIndex}]: caption indexes must be ascending`,
        );
      } else {
        const sceneRange = scene.captionRange;
        if (
          sceneRange &&
          (beat.captionStartIndex < sceneRange.startIndex ||
            beat.captionEndIndex > sceneRange.endIndex)
        ) {
          errors.push(
            `scenes[${sceneIndex}].payload.beats[${beatIndex}]: caption range must stay inside scene captionRange`,
          );
        }
        const startCaption = captions[beat.captionStartIndex];
        const endCaption = captions[beat.captionEndIndex];
        if (!startCaption || !endCaption) {
          errors.push(
            `scenes[${sceneIndex}].payload.beats[${beatIndex}]: caption indexes point outside captions`,
          );
        } else if (sceneRange && captions[sceneRange.startIndex]) {
          const sceneStartFrame = frameForMs(
            captions[sceneRange.startIndex].startMs,
          );
          const expectedStart =
            frameForMs(startCaption.startMs) - sceneStartFrame;
          const expectedEnd = frameForMs(endCaption.endMs) - sceneStartFrame;
          if (Math.abs(expectedStart - beat.startFrame) > 1) {
            errors.push(
              `scenes[${sceneIndex}].payload.beats[${beatIndex}].startFrame: must match bound caption within 1 frame`,
            );
          }
          if (Math.abs(expectedEnd - beat.endFrame) > 1) {
            errors.push(
              `scenes[${sceneIndex}].payload.beats[${beatIndex}].endFrame: must match bound caption within 1 frame`,
            );
          }
          const captionText = captionTextForRange(
            captions,
            beat.captionStartIndex,
            beat.captionEndIndex,
          );
          if (!keywordIsCoveredByCaption(beat, captionText)) {
            errors.push(
              `scenes[${sceneIndex}].payload.beats[${beatIndex}].keyword: "${beat.keyword}" is not present in its bound caption range or explicit beat summary`,
            );
          }
        }
      }
      if (!beat.visualState)
        errors.push(
          `scenes[${sceneIndex}].payload.beats[${beatIndex}].visualState is required`,
        );
      if (!beat.motionPreset)
        errors.push(
          `scenes[${sceneIndex}].payload.beats[${beatIndex}].motionPreset is required`,
        );
      if (!beat.placement)
        errors.push(
          `scenes[${sceneIndex}].payload.beats[${beatIndex}].placement is required`,
        );
    }
    previousEnd = beat.endFrame;
  });
};

const resolvedRenderMode = (payload) =>
  payload?.heroStyle === "cinematic" ||
  payload?.layoutSignature?.startsWith("portrait:cinematic-v4")
    ? "cinematic"
    : "hero-track-v2";

const checkRendererContract = (scene, sceneIndex, errors) => {
  const payload = scene?.payload ?? {};
  if (
    payload.heroStyle !== undefined &&
    !SKILL_SHOWCASE_STYLES.has(payload.heroStyle)
  ) {
    errors.push(
      `scenes[${sceneIndex}].payload.heroStyle must be cinematic or hero-track-v2`,
    );
  }
  if (Object.hasOwn(payload, "workbench")) {
    errors.push(
      `scenes[${sceneIndex}].payload.workbench is obsolete; use CinematicShot or HeroTrackV2`,
    );
  }
  asArray(payload.beats).forEach((beat, beatIndex) => {
    if (Object.hasOwn(beat, "heroPreset")) {
      errors.push(
        `scenes[${sceneIndex}].payload.beats[${beatIndex}].heroPreset is obsolete; use shotPreset`,
      );
    }
    if (
      resolvedRenderMode(payload) === "cinematic" &&
      !CINEMATIC_PRESETS.has(beat.shotPreset)
    ) {
      errors.push(
        `scenes[${sceneIndex}].payload.beats[${beatIndex}].shotPreset must be one of the 11 Cinematic presets`,
      );
    }
  });
};

const checkHeroTrack = (scene, sceneIndex, captions, errors) => {
  if (resolvedRenderMode(scene?.payload) !== "hero-track-v2") return;
  const track = scene.payload.heroTrack;
  const range = scene.captionRange;
  if (!track && scene?.payload?.heroStyle === undefined) return;
  if (!track || !Array.isArray(track.states)) {
    errors.push(
      `scenes[${sceneIndex}].payload.heroTrack is required for hero-track-v2`,
    );
    return;
  }
  if (!HERO_TRACK_KINDS.has(track.kind)) {
    errors.push(
      `scenes[${sceneIndex}].payload.heroTrack.kind must be one of the 9 Hero Track kinds`,
    );
  }
  if (
    !range ||
    track.captionStartIndex !== range.startIndex ||
    track.captionEndIndex !== range.endIndex
  ) {
    errors.push(
      `scenes[${sceneIndex}].payload.heroTrack must match the scene captionRange`,
    );
  }
  const captionCount = range ? range.endIndex - range.startIndex + 1 : 0;
  if (
    captionCount >= 3 &&
    (track.states.length < 3 || track.states.length > 24)
  ) {
    errors.push(
      `scenes[${sceneIndex}].payload.heroTrack.states must contain 3–24 states for a multi-caption hero track`,
    );
  }
  let previousEnd = null;
  let previousCaptionEnd = null;
  track.states.forEach((state, stateIndex) => {
    if (
      state.endFrame <= state.startFrame ||
      state.startFrame < 0 ||
      state.endFrame > scene.durationInFrames
    ) {
      errors.push(
        `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}]: state frames must stay inside the scene`,
      );
    }
    if (previousEnd !== null && state.startFrame !== previousEnd) {
      errors.push(
        `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}]: state frames must be continuous without a hard-cut gap`,
      );
    }
    if (
      previousCaptionEnd !== null &&
      state.captionStartIndex !== previousCaptionEnd + 1
    ) {
      errors.push(
        `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}]: caption ranges must be continuous`,
      );
    }
    if (
      !range ||
      state.captionStartIndex < range.startIndex ||
      state.captionEndIndex > range.endIndex ||
      state.captionEndIndex < state.captionStartIndex
    ) {
      errors.push(
        `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}]: caption range must stay inside the hero track`,
      );
    } else {
      const stateText = captionTextForRange(
        captions,
        state.captionStartIndex,
        state.captionEndIndex,
      );
      if (!sourceTextIsCoveredByNarration(state.detail, stateText)) {
        errors.push(
          `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].detail must be sourced from its bound captions`,
        );
      }
      if (asArray(state.evidence).length === 0) {
        errors.push(
          `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].evidence must contain readable visual entities`,
        );
      }
      if (
        state.entityTarget !== undefined &&
        !String(state.entityTarget).trim()
      ) {
        errors.push(
          `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].entityTarget must be a readable entity ID when supplied`,
        );
      }
      if (
        state.cinematicPreset !== undefined &&
        !CINEMATIC_PRESETS.has(state.cinematicPreset)
      ) {
        errors.push(
          `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].cinematicPreset must be one of the 11 Cinematic presets`,
        );
      }
      if (state.lens !== undefined) {
        if (!state.lens || typeof state.lens !== "object") {
          errors.push(
            `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].lens must be an object`,
          );
        } else if (
          !String(state.lens.objective ?? "").trim() ||
          !String(state.lens.actionLabel ?? "").trim()
        ) {
          errors.push(
            `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].lens must declare objective and actionLabel`,
          );
        }
      }
      if (state.shot !== undefined) {
        if (!state.shot || typeof state.shot !== "object") {
          errors.push(
            `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].shot must be an object`,
          );
        } else {
          if (!HERO_SHOT_KINDS.has(state.shot.kind)) {
            errors.push(
              `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].shot.kind must be one of the 12 production shot kinds`,
            );
          }
          if (asArray(state.shot.evidence).length === 0) {
            errors.push(
              `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].shot.evidence must contain operation evidence`,
            );
          }
          if (
            !String(state.shot.environment ?? "").trim() ||
            !String(state.shot.target ?? "").trim()
          ) {
            errors.push(
              `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}].shot must declare environment and target`,
            );
          }
        }
      }
      if (state.shot !== undefined && state.lens === undefined) {
        errors.push(
          `scenes[${sceneIndex}].payload.heroTrack.states[${stateIndex}] with a technical shot must also declare a lens`,
        );
      }
    }
    previousEnd = state.endFrame;
    previousCaptionEnd = state.captionEndIndex;
  });
  if (
    track.states[0]?.startFrame !== 0 ||
    track.states.at(-1)?.endFrame !== scene.durationInFrames
  ) {
    errors.push(
      `scenes[${sceneIndex}].payload.heroTrack.states must cover the full hero track duration`,
    );
  }
  if (
    track.states[0]?.captionStartIndex !== track.captionStartIndex ||
    track.states.at(-1)?.captionEndIndex !== track.captionEndIndex
  ) {
    errors.push(
      `scenes[${sceneIndex}].payload.heroTrack.states must cover the full hero track caption range`,
    );
  }
};

const narrationHashForCaptions = (captions) => createHash("sha256")
  .update(JSON.stringify(captions.map(({text, startMs, endMs}) => ({text, startMs, endMs}))))
  .digest("hex");

const checkVisualPlan = (project, scenes, captions, errors, {required}) => {
  const plan = project?.visualPlan;
  if (!plan) {
    if (required) errors.push("visualPlan is required for non-golden production projects");
    return;
  }
  if (plan.version !== 1 || plan.generatedFrom !== "captions") {
    errors.push("visualPlan must declare version=1 and generatedFrom=captions");
  }
  if (plan.narrationHash !== narrationHashForCaptions(captions)) {
    errors.push("visualPlan.narrationHash does not match the current caption text and timestamps");
  }
  const entries = asArray(plan.entries);
  const coveredCaptions = new Map();
  const byScene = new Map();
  entries.forEach((entry, entryIndex) => {
    const prefix = `visualPlan.entries[${entryIndex}]`;
    const scene = scenes[entry.sceneIndex];
    if (!scene || scene.id !== entry.sceneId) {
      errors.push(`${prefix}: sceneId/sceneIndex must reference the same current scene`);
      return;
    }
    const sceneEntries = byScene.get(entry.sceneId) ?? [];
    sceneEntries.push(entry);
    byScene.set(entry.sceneId, sceneEntries);
    for (let captionIndex = entry.captionStartIndex; captionIndex <= entry.captionEndIndex; captionIndex += 1) {
      coveredCaptions.set(captionIndex, (coveredCaptions.get(captionIndex) ?? 0) + 1);
    }
    const caption = captions[entry.captionStartIndex];
    const endCaption = captions[entry.captionEndIndex];
    const sceneStartCaption = captions[scene.captionRange?.startIndex];
    if (!caption || !endCaption || !sceneStartCaption) {
      errors.push(`${prefix}: caption range points outside the current scene captions`);
      return;
    }
    const expectedStart = frameForMs(caption.startMs) - frameForMs(sceneStartCaption.startMs);
    const nextCaption = captions[entry.captionEndIndex + 1];
    const expectedEnd = nextCaption && entry.captionEndIndex < scene.captionRange.endIndex
      ? frameForMs(nextCaption.startMs) - frameForMs(sceneStartCaption.startMs)
      : frameForMs(endCaption.endMs) - frameForMs(sceneStartCaption.startMs);
    if (entry.startFrame !== expectedStart || entry.endFrame !== expectedEnd) {
      errors.push(`${prefix}: startFrame/endFrame must be derived from the bound caption timestamps`);
    }
    if (!sourceTextIsCoveredByNarration(entry.intent?.sourceText, captionTextForRange(captions, entry.captionStartIndex, entry.captionEndIndex))) {
      errors.push(`${prefix}.intent.sourceText must come from the bound caption text`);
    }
    if (entry.intent?.shotKind !== entry.shot?.kind) {
      errors.push(`${prefix}: semantic intent shotKind must match shot.kind`);
    }
    const descriptor = PRODUCTION_COMPONENTS.get(entry.componentId);
    if (!descriptor || !descriptor.productionReady) {
      errors.push(`${prefix}.componentId must resolve to a productionReady component`);
    } else {
      if (!descriptor.compatibleIntents.includes(entry.intent?.key)) {
        errors.push(`${prefix}.componentId is incompatible with intent=${entry.intent?.key}`);
      }
      if (!descriptor.compatibleShotKinds.includes(entry.shot?.kind)) {
        errors.push(`${prefix}.componentId is incompatible with shot=${entry.shot?.kind}`);
      }
    }
    if (entry.resolution !== "matched" || asArray(entry.diagnostics).some((diagnostic) => diagnostic?.level === "error")) {
      errors.push(`${prefix}: fallback/error Visual Plan entries cannot enter a production render`);
    }
    const state = asArray(scene.payload?.heroTrack?.states).find((candidate) => candidate?.visualPlanEntryId === entry.id)
      ?? asArray(scene.payload?.heroTrack?.states).find((candidate) => candidate?.captionStartIndex === entry.captionStartIndex);
    if (!state || state.componentId !== entry.componentId || state.shot?.kind !== entry.shot?.kind) {
      errors.push(`${prefix}: scene Hero state must be derived from the same component and shot`);
    }
  });

  if (entries.length === 0) errors.push("visualPlan.entries must contain at least one production entry");
  captions.forEach((_, captionIndex) => {
    if (coveredCaptions.get(captionIndex) !== 1) {
      errors.push(`visualPlan must cover captions[${captionIndex}] exactly once`);
    }
  });
  scenes.forEach((scene, sceneIndex) => {
    const sceneEntries = byScene.get(scene.id) ?? [];
    if (required && sceneEntries.length === 0) {
      errors.push(`scenes[${sceneIndex}] has no Visual Plan entries`);
      return;
    }
    if (sceneEntries.length > 0 && (sceneEntries[0].startFrame !== 0 || sceneEntries.at(-1).endFrame !== scene.durationInFrames)) {
      errors.push(`scenes[${sceneIndex}] Visual Plan entries must cover the complete scene duration`);
    }
    sceneEntries.forEach((entry, entryIndex) => {
      const previous = sceneEntries[entryIndex - 1];
      if (previous && entry.startFrame !== previous.endFrame) {
        errors.push(`scenes[${sceneIndex}] Visual Plan entries must be continuous`);
      }
    });
  });
};

export const checkVisualContract = (
  project,
  { projectRoot = process.cwd() } = {},
) => {
  const errors = [];
  const warnings = [];
  const scenes = asArray(project?.scenes);
  const captions = asArray(project?.captions);
  const skillScenes = scenes.filter(
    (scene) => scene?.family === "skill-showcase",
  );
  if (skillScenes.length === 0)
    return { ok: true, errors, warnings, checkedScenes: 0 };

  const narrationText = collectStrings([
    project?.title,
    project?.captions,
  ]).join("\n");
  const isGolden = isGoldenNarration(project, narrationText);
  const visualText = collectVisibleStrings(
    skillScenes.map((scene) => {
      const { sceneEditor: _sceneEditor, ...renderedPayload } = scene.payload ?? {};
      return renderedPayload;
    }),
  ).join("\n");

  if (project?.projectId === GOLDEN_PROJECT_ID && !isGolden) {
    errors.push(
      `projectId=${GOLDEN_PROJECT_ID} is reserved for the WorkBuddy golden sample; changed narration must use a new projectId and regenerated scenes`,
    );
  }

  checkVisualPlan(project, skillScenes, captions, errors, {required: !isGolden});

  let previousRange = null;
  const layoutSignatures = [];
  skillScenes.forEach((scene, sceneIndex) => {
    const payload = scene.payload ?? {};
    layoutSignatures.push(layoutSignatureForScene(scene));
    const range = !isGolden
      ? checkSceneCaptionRange(scene, sceneIndex, captions, errors)
      : (scene.captionRange ?? null);
    if (!isGolden && range) {
      if (previousRange && range.startIndex !== previousRange.endIndex + 1) {
        errors.push(
          `scenes[${sceneIndex}].captionRange: non-golden skill-showcase captionRanges must be continuous`,
        );
      }
      previousRange = range;
    }
    checkBeats(scene, sceneIndex, errors, {
      captions,
      requireCaptionBinding: !isGolden,
    });
    checkRendererContract(scene, sceneIndex, errors);
    checkHeroTrack(scene, sceneIndex, captions, errors);
    assertProductIconExists(
      projectRoot,
      payload.productIcon,
      `scenes[${sceneIndex}].payload.productIcon`,
      errors,
    );
    assertProductIconExists(
      projectRoot,
      payload.brandIcon,
      `scenes[${sceneIndex}].payload.brandIcon`,
      errors,
    );
    asArray(payload.productIcons).forEach((icon, iconIndex) => {
      assertProductIconExists(
        projectRoot,
        icon,
        `scenes[${sceneIndex}].payload.productIcons[${iconIndex}]`,
        errors,
      );
    });

    if (!isGolden && INTRO_OUTRO_VARIANTS.has(payload.variant)) {
      if (!payload.brandName)
        errors.push(
          `scenes[${sceneIndex}].payload.brandName is required for reusable intro/overview/outro scenes`,
        );
      if (!payload.headline && !payload.body)
        errors.push(
          `scenes[${sceneIndex}].payload.headline or body is required for reusable intro/overview/outro scenes`,
        );
      if (
        asArray(payload.labels).length > 0 &&
        asArray(payload.labelIcons).length < asArray(payload.labels).length
      ) {
        errors.push(
          `scenes[${sceneIndex}].payload.labelIcons must cover every label`,
        );
      }
      if (
        asArray(payload.labels).length > 0 &&
        asArray(payload.productIcons).length < asArray(payload.labels).length
      ) {
        errors.push(
          `scenes[${sceneIndex}].payload.productIcons must cover every label`,
        );
      }
    }

    if (!isGolden) {
      if (payload.variant === "generic" && !payload.visualMode) {
        errors.push(
          `scenes[${sceneIndex}].payload.visualMode is required for generic scenes`,
        );
      }
      if (
        !payload.sourceText ||
        compactMeaningText(payload.sourceText).length < 4
      ) {
        errors.push(
          `scenes[${sceneIndex}].payload.sourceText is required for changed-script skill-showcase scenes`,
        );
      } else if (
        asArray(project?.captions).length > 0 &&
        !sourceTextIsCoveredByNarration(payload.sourceText, narrationText)
      ) {
        errors.push(
          `scenes[${sceneIndex}].payload.sourceText is not covered by current captions; regenerate scene payload after changing voiceover`,
        );
      }
      if (!INTRO_OUTRO_VARIANTS.has(payload.variant)) {
        if (!payload.productIcon)
          errors.push(
            `scenes[${sceneIndex}].payload.productIcon is required for reusable body scenes`,
          );
        if (
          !Number.isInteger(payload.progressIndex) ||
          !Number.isInteger(payload.progressTotal)
        ) {
          errors.push(
            `scenes[${sceneIndex}].payload.progressIndex/progressTotal are required for reusable body scenes`,
          );
        }
      }
    }
  });

  if (!isGolden) {
    for (let index = 2; index < layoutSignatures.length; index += 1) {
      const current = layoutSignatures[index];
      if (
        current === layoutSignatures[index - 1] &&
        current === layoutSignatures[index - 2]
      ) {
        errors.push(
          `scenes[${index - 2}..${index}]: three consecutive skill-showcase scenes reuse the same body layout: ${current}`,
        );
      }
    }
  }

  if (!isGolden) {
    for (const term of STALE_GOLDEN_TERMS) {
      if (hasText(visualText, term) && !hasText(narrationText, term)) {
        errors.push(
          `visual payload contains stale golden-sample term not present in narration: ${term}`,
        );
      }
    }
  }

  const componentPath = path.join(
    projectRoot,
    "src/components/ultimate-kit/families/skill-showcase/SkillShowcase.tsx",
  );
  if (existsSync(componentPath)) {
    const source = readFileSync(componentPath, "utf8");
    for (const literal of FORBIDDEN_COMPONENT_LITERALS) {
      if (source.includes(literal)) {
        errors.push(
          `SkillShowcase.tsx contains non-data-driven legacy literal: ${literal}`,
        );
      }
    }
  } else {
    warnings.push(
      "SkillShowcase.tsx was not found; skipped source literal audit",
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checkedScenes: skillScenes.length,
  };
};

export const assertVisualContract = (project, options = {}) => {
  const result = checkVisualContract(project, options);
  if (!result.ok) {
    throw new Error(
      `[VISUAL_CONTRACT_INVALID]\n${result.errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }
  return result;
};
