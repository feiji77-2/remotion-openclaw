export const MOTION_PRESET_FAMILY = {
  maskReveal: "reveal",
  clipReveal: "reveal",
  lineWipe: "reveal",
  typeReveal: "reveal",
  pushIn: "spatial",
  pullBack: "spatial",
  parallaxDrift: "spatial",
  depthShift: "spatial",
  pulse: "emphasis",
  snap: "emphasis",
  focusLock: "emphasis",
  highlightSweep: "emphasis",
  matchCut: "transition",
  directionalWipe: "transition",
  panelShift: "transition",
  cameraMove: "transition",
  kineticCaption: "text",
  staggeredWords: "text",
  numberCount: "text",
  quoteBuild: "text",
  imageScan: "media",
  screenshotInspect: "media",
  productOrbit: "media",
  assetStack: "media",
};

const SAMPLE_COPY_BLACKLIST = /WorkBuddy|PPT Master|HyperFrames|UI Skill|Karpathy|好帮手/u;

const countUsage = (values) => [...values.reduce((usage, value) => {
  usage.set(value, (usage.get(value) ?? 0) + 1);
  return usage;
}, new Map()).entries()]
  .map(([id, count]) => ({id, count}))
  .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id));

const maxRunLength = (values) => {
  let maxRun = 0;
  let currentRun = 0;
  let previous = null;
  for (const value of values) {
    currentRun = value === previous ? currentRun + 1 : 1;
    previous = value;
    maxRun = Math.max(maxRun, currentRun);
  }
  return maxRun;
};

const distribution = (values) => ({
  total: values.length,
  uniqueCount: new Set(values).size,
  maxRun: maxRunLength(values),
  usage: countUsage(values),
});

export const measureVideoProductSpec = (spec) => {
  const scenes = Array.isArray(spec?.scenes) ? spec.scenes : [];
  const variants = Array.isArray(spec?.variants) ? spec.variants : [];
  const motionPresetIds = scenes.flatMap((scene) => Array.isArray(scene?.motion?.presetIds) ? scene.motion.presetIds : []);
  const motionFamilies = motionPresetIds.map((id) => MOTION_PRESET_FAMILY[id] ?? "unknown");
  const errors = [];
  const warnings = [];

  if (spec?.schemaVersion !== 2) errors.push("schemaVersion must be 2");
  if (scenes.length < 3) errors.push("video product spec must include at least three scenes");
  if (variants.length < 3) errors.push("video product spec must include at least three variants");
  if (!scenes.some((scene) => scene.intent === "hook")) errors.push("missing hook scene");
  if (!scenes.some((scene) => scene.intent === "payoff" || scene.intent === "cta")) errors.push("missing payoff or cta scene");
  if (new Set(scenes.map((scene) => scene.intent)).size < Math.min(4, scenes.length)) errors.push("scene intents are not diverse enough");
  if (new Set(scenes.map((scene) => scene.block)).size < Math.min(4, scenes.length)) errors.push("scene blocks are not diverse enough");
  if (new Set(motionFamilies).size < 4) errors.push("motion plan must cover at least four preset families");
  if (motionFamilies.includes("unknown")) errors.push("motion plan contains unknown preset ids");
  if (maxRunLength(scenes.map((scene) => scene.block)) > 2) errors.push("scene blocks repeat more than twice consecutively");
  if (SAMPLE_COPY_BLACKLIST.test(JSON.stringify(spec))) errors.push("spec contains golden sample copy");

  const densityValues = scenes.map((scene) => scene.layout?.density).filter(Boolean);
  if (new Set(densityValues).size < 2) warnings.push("layout density does not vary");
  const transitions = scenes.map((scene) => scene.motion?.transition).filter(Boolean);
  if (new Set(transitions).size < Math.min(2, transitions.length)) warnings.push("transition grammar is narrow");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metadata: spec?.metadata ?? null,
    scenes: {
      count: scenes.length,
      durationFrames: scenes.reduce((sum, scene) => sum + (Number(scene.durationFrames) || 0), 0),
      intents: distribution(scenes.map((scene) => scene.intent).filter(Boolean)),
      blocks: distribution(scenes.map((scene) => scene.block).filter(Boolean)),
      media: distribution(scenes.map((scene) => scene.medium).filter(Boolean)),
      density: distribution(densityValues),
      focus: distribution(scenes.map((scene) => scene.layout?.focus).filter(Boolean)),
    },
    motion: {
      presets: distribution(motionPresetIds),
      families: distribution(motionFamilies),
      transitions: distribution(transitions),
    },
    variants: {
      count: variants.length,
      templates: distribution(variants.map((variant) => variant.template).filter(Boolean)),
      tones: distribution(variants.map((variant) => variant.visual?.tone).filter(Boolean)),
    },
    assets: {
      count: spec?.assets && typeof spec.assets === "object" ? Object.keys(spec.assets).length : 0,
      roles: distribution(Object.values(spec?.assets ?? {}).map((asset) => asset?.role).filter(Boolean)),
      sceneRefs: scenes.reduce((sum, scene) => sum + (Array.isArray(scene.assetRefs) ? scene.assetRefs.length : 0), 0),
    },
  };
};
