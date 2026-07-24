import {measureVideoProductSpec} from "./video-product-metrics.mjs";

const FPS = 30;

const targetDurationFrames = (spec) =>
  Math.round(Number(spec?.metadata?.targetDurationSec ?? 0) * FPS);

const pacingWeightForScene = (scene) => {
  if (scene?.intent === "hook") return 0.82;
  if (scene?.intent === "proof" || scene?.intent === "process" || scene?.intent === "product-reveal") return 1.18;
  if (scene?.intent === "payoff" || scene?.intent === "cta") return 0.9;
  return 1;
};

export const scenesForVideoProductVariant = (spec, variantId = spec?.render?.variantId) => {
  const scenes = Array.isArray(spec?.scenes) ? spec.scenes : [];
  const variant = Array.isArray(spec?.variants)
    ? spec.variants.find((item) => item.id === variantId)
    : null;
  if (!variant?.sceneOrder?.length) return scenes;
  const byId = new Map(scenes.map((scene) => [scene.id, scene]));
  const ordered = variant.sceneOrder
    .map((sceneId) => byId.get(sceneId))
    .filter(Boolean);
  const orderedIds = new Set(ordered.map((scene) => scene.id));
  return [...ordered, ...scenes.filter((scene) => !orderedIds.has(scene.id))];
};

export const timelineForVideoProductSpec = (spec, variantId = spec?.render?.variantId) => {
  const scenes = scenesForVideoProductVariant(spec, variantId);
  const explicitDuration = scenes.reduce((sum, scene) => sum + (Number(scene.durationFrames) || 0), 0);
  const missingScenes = scenes.filter((scene) => !Number(scene.durationFrames));
  const target = Math.max(targetDurationFrames(spec), explicitDuration + missingScenes.length * 45);
  const remaining = Math.max(0, target - explicitDuration);
  const weightTotal = missingScenes.reduce((sum, scene) => sum + pacingWeightForScene(scene), 0) || 1;
  let cursor = 0;
  return scenes.map((scene, index) => {
    const isLast = index === scenes.length - 1;
    const durationFrames = Number(scene.durationFrames) || (
      isLast
        ? Math.max(45, target - cursor)
        : Math.max(45, Math.round(remaining * pacingWeightForScene(scene) / weightTotal))
    );
    const item = {
      index,
      id: scene.id,
      intent: scene.intent,
      block: scene.block,
      medium: scene.medium,
      startFrame: cursor,
      endFrame: cursor + durationFrames,
      durationFrames,
      message: scene.message ?? {},
      layout: scene.layout ?? {},
      motion: scene.motion ?? {},
      emphasisCount: Array.isArray(scene.emphasis) ? scene.emphasis.length : 0,
      assetRefs: Array.isArray(scene.assetRefs) ? scene.assetRefs : [],
    };
    cursor += durationFrames;
    return item;
  });
};

const visualForVariant = (spec, variant) => ({
  ...(spec?.visual ?? {}),
  ...(variant?.visual ?? {}),
});

const outNameForVariant = (spec, variantId) =>
  variantId
    ? `${spec?.metadata?.projectId ?? "video-product"}-${variantId}.mp4`
    : `${spec?.metadata?.projectId ?? "video-product"}.mp4`;

const variantSummaries = (spec) => {
  const variants = Array.isArray(spec?.variants) ? spec.variants : [];
  return variants.map((variant) => {
    const timeline = timelineForVideoProductSpec(spec, variant.id);
    return {
      id: variant.id,
      label: variant.label,
      template: variant.template,
      visual: visualForVariant(spec, variant),
      defaultOutName: outNameForVariant(spec, variant.id),
      sceneCount: timeline.length,
      durationFrames: timeline.at(-1)?.endFrame ?? 0,
      firstSceneIds: timeline.slice(0, 3).map((scene) => scene.id),
    };
  });
};

const sceneCards = (timeline) => timeline.map((scene) => ({
  id: scene.id,
  label: scene.message.primary ?? scene.id,
  detail: scene.message.secondary ?? "",
  badges: [scene.intent, scene.block, scene.medium].filter(Boolean),
  frameRange: [scene.startFrame, scene.endFrame],
  motionPresets: Array.isArray(scene.motion.presetIds) ? scene.motion.presetIds : [],
  transition: scene.motion.transition ?? null,
  keywords: Array.isArray(scene.message.keywords) ? scene.message.keywords : [],
  emphasisCount: scene.emphasisCount,
  assetRefCount: scene.assetRefs.length,
}));

const stageForIntent = (intent) => {
  if (intent === "hook" || intent === "context") return "opening";
  if (intent === "payoff" || intent === "cta") return "payoff";
  if (intent === "turning-point" || intent === "contrast") return "turn";
  return "proof";
};

const timelineSections = (timeline) => {
  const sections = [];
  for (const scene of timeline) {
    const stage = stageForIntent(scene.intent);
    const current = sections.at(-1);
    if (current?.stage === stage) {
      current.endFrame = scene.endFrame;
      current.sceneIds.push(scene.id);
      continue;
    }
    sections.push({
      stage,
      startFrame: scene.startFrame,
      endFrame: scene.endFrame,
      sceneIds: [scene.id],
    });
  }
  return sections.map((section) => ({
    ...section,
    durationFrames: section.endFrame - section.startFrame,
  }));
};

const gate = ({id, label, passed, detail, severity = "error", weight = 1}) => ({
  id,
  label,
  status: passed ? "pass" : severity === "warning" ? "warn" : "fail",
  severity,
  weight,
  detail,
});

const buildQualityGates = ({spec, metrics, timeline, activeVariant, requestedVariantId}) => {
  const scenes = metrics.scenes ?? {};
  const motion = metrics.motion ?? {};
  const variants = metrics.variants ?? {};
  const assets = metrics.assets ?? {};
  return [
    gate({
      id: "schema-v2",
      label: "Product schema",
      passed: spec?.schemaVersion === 2,
      detail: "Spec uses the v2 video product contract.",
      weight: 1.2,
    }),
    gate({
      id: "story-arc",
      label: "Narrative arc",
      passed: Boolean(spec?.narrative?.hook && spec?.narrative?.proof?.length && spec?.narrative?.payoff),
      detail: "Hook, proof, and payoff are present.",
      weight: 1.4,
    }),
    gate({
      id: "scene-system",
      label: "Scene composition",
      passed: scenes.count >= 3 && scenes.intents?.uniqueCount >= Math.min(4, scenes.count),
      detail: `${scenes.count ?? 0} scenes, ${scenes.intents?.uniqueCount ?? 0} intent types.`,
      weight: 1.2,
    }),
    gate({
      id: "block-diversity",
      label: "Block diversity",
      passed: scenes.blocks?.uniqueCount >= Math.min(4, scenes.count),
      detail: `${scenes.blocks?.uniqueCount ?? 0} scene block types.`,
      weight: 1,
    }),
    gate({
      id: "motion-language",
      label: "Motion language",
      passed: motion.families?.uniqueCount >= 4 && !metrics.errors?.some((error) => error.includes("unknown preset")),
      detail: `${motion.families?.uniqueCount ?? 0} motion families across ${motion.presets?.uniqueCount ?? 0} presets.`,
      weight: 1.3,
    }),
    gate({
      id: "variant-system",
      label: "Variant system",
      passed: variants.count >= 3 && variants.templates?.uniqueCount >= 3,
      detail: `${variants.count ?? 0} variants, ${variants.templates?.uniqueCount ?? 0} template directions.`,
      weight: 1,
    }),
    gate({
      id: "active-variant",
      label: "Active variant",
      passed: !requestedVariantId || Boolean(activeVariant),
      detail: requestedVariantId ? `Requested variant: ${requestedVariantId}` : "No variant override requested.",
      weight: 0.9,
    }),
    gate({
      id: "timeline",
      label: "Timeline",
      passed: timeline.length > 0 && timeline.every((scene) => scene.durationFrames > 0),
      detail: `${timeline.length} timeline scenes, ${timeline.at(-1)?.endFrame ?? 0} total frames.`,
      weight: 0.9,
    }),
    gate({
      id: "layout-variety",
      label: "Layout variety",
      passed: scenes.density?.uniqueCount >= 2 && scenes.focus?.uniqueCount >= 2,
      detail: `${scenes.density?.uniqueCount ?? 0} density levels, ${scenes.focus?.uniqueCount ?? 0} focus modes.`,
      severity: "warning",
      weight: 0.7,
    }),
    gate({
      id: "transition-grammar",
      label: "Transition grammar",
      passed: motion.transitions?.uniqueCount >= Math.min(2, motion.transitions?.total ?? 0),
      detail: `${motion.transitions?.uniqueCount ?? 0} transition types.`,
      severity: "warning",
      weight: 0.6,
    }),
    gate({
      id: "asset-readiness",
      label: "Asset readiness",
      passed: assets.count > 0 || assets.sceneRefs === 0,
      detail: `${assets.count ?? 0} assets, ${assets.sceneRefs ?? 0} scene refs.`,
      severity: "warning",
      weight: 0.5,
    }),
  ];
};

const buildInspection = (gates, metrics) => {
  const totalWeight = gates.reduce((sum, item) => sum + item.weight, 0) || 1;
  const earnedWeight = gates.reduce((sum, item) => {
    if (item.status === "pass") return sum + item.weight;
    if (item.status === "warn") return sum + item.weight * 0.55;
    return sum;
  }, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);
  const blockers = gates.filter((item) => item.status === "fail");
  const warnings = gates.filter((item) => item.status === "warn");
  const level = blockers.length
    ? "blocked"
    : score >= 90
      ? "ready"
      : score >= 75
        ? "review"
        : "needs-work";
  const nextActions = blockers.length
    ? ["Fix failing quality gates before render or Studio promotion."]
    : warnings.length
      ? ["Review warning gates, then run a still-frame visual review when rendering is allowed."]
      : ["Select a variant and run still-frame visual review when rendering is allowed."];
  return {
    score,
    level,
    gates,
    blockers: blockers.map((item) => ({id: item.id, label: item.label, detail: item.detail})),
    warnings: [
      ...metrics.warnings.map((message) => ({id: "metrics", label: "Metrics warning", detail: message})),
      ...warnings.map((item) => ({id: item.id, label: item.label, detail: item.detail})),
    ],
    automatedChecks: [
      {
        id: "metrics-strict",
        label: "Product metrics strict",
        command: "npm run product:metrics -- <video-product.json> --strict",
        status: metrics.ok ? "pass" : "fail",
      },
      {
        id: "report-strict",
        label: "Product report strict",
        command: "npm run product:report -- <video-product.json> --strict",
        status: blockers.length ? "fail" : "pass",
      },
    ],
    manualReview: [
      {id: "hook-hierarchy", label: "Hook hierarchy", reason: "First frame must make the primary claim unmistakable."},
      {id: "motion-fit", label: "Motion fit", reason: "Motion should explain focus changes instead of decorating every layer."},
      {id: "variant-distance", label: "Variant distance", reason: "Variants should change tone, density, pacing, or scene order enough to be useful."},
    ],
    nextActions,
  };
};

const variantMatrix = (variants) => variants.map((variant) => ({
  id: variant.id,
  label: variant.label,
  template: variant.template,
  tone: variant.visual?.tone ?? null,
  density: variant.visual?.density ?? null,
  pacing: variant.visual?.pacing ?? null,
  motionIntensity: variant.visual?.motionIntensity ?? null,
  colorStrategy: variant.visual?.colorStrategy ?? null,
  firstSceneIds: variant.firstSceneIds,
  defaultOutName: variant.defaultOutName,
}));

const buildStudioModel = ({metrics, inspection, sceneCards: cards, variants, sections}) => ({
  summaryCards: [
    {id: "quality", label: "Quality", value: String(inspection.score), detail: inspection.level},
    {id: "scenes", label: "Scenes", value: String(cards.length), detail: `${metrics.scenes.blocks.uniqueCount} block types`},
    {id: "motion", label: "Motion", value: String(metrics.motion.families.uniqueCount), detail: "motion families"},
    {id: "variants", label: "Variants", value: String(variants.length), detail: `${metrics.variants.templates.uniqueCount} templates`},
  ],
  timelineSections: sections,
  variantMatrix: variantMatrix(variants),
  qualityGates: inspection.gates,
  blockers: inspection.blockers,
  warnings: inspection.warnings,
  qaChecklist: {
    automated: inspection.automatedChecks,
    manual: inspection.manualReview,
  },
  nextActions: inspection.nextActions,
});

export const buildVideoProductReport = (spec, {variantId = spec?.render?.variantId} = {}) => {
  const metrics = measureVideoProductSpec(spec);
  const requestedVariantId = variantId ?? null;
  const activeVariant = requestedVariantId
    ? (Array.isArray(spec?.variants) ? spec.variants.find((item) => item.id === requestedVariantId) : null)
    : null;
  const activeVariantId = activeVariant?.id ?? null;
  const timeline = timelineForVideoProductSpec(spec, activeVariantId);
  const durationFrames = timeline.at(-1)?.endFrame ?? 0;
  const variants = variantSummaries(spec);
  const cards = sceneCards(timeline);
  const sections = timelineSections(timeline);
  const gates = buildQualityGates({spec, metrics, timeline, activeVariant, requestedVariantId});
  const inspection = buildInspection(gates, metrics);
  const gateErrors = inspection.blockers.map((item) => item.detail);
  const errors = [
    ...metrics.errors,
    ...(requestedVariantId && !activeVariant ? [`unknown variant id: ${requestedVariantId}`] : []),
    ...gateErrors,
  ].filter((message, index, all) => all.indexOf(message) === index);
  const ok = errors.length === 0;
  return {
    ok,
    errors,
    warnings: metrics.warnings,
    product: {
      projectId: spec?.metadata?.projectId ?? null,
      title: spec?.metadata?.title ?? null,
      schemaVersion: spec?.schemaVersion ?? null,
      requestedVariantId,
      activeVariantId,
      defaultOutName: outNameForVariant(spec, activeVariantId),
      durationFrames,
      durationSec: Math.round(durationFrames / FPS * 100) / 100,
    },
    narrative: spec?.narrative ?? null,
    activeTimeline: timeline,
    timelineSections: sections,
    sceneCards: cards,
    variants,
    metrics,
    inspection,
    studioModel: buildStudioModel({metrics, inspection, sceneCards: cards, variants, sections}),
    studioReadiness: {
      canInspectStoryboard: ok && timeline.length > 0,
      canSelectVariants: (spec?.variants?.length ?? 0) >= 3,
      canRunNonRenderQa: true,
      hasBlockingIssues: inspection.blockers.length > 0,
      qualityScore: inspection.score,
      renderRequiresVisualReview: true,
    },
  };
};
