import {z} from "zod";
import {VIDEO_PRODUCT_MOTION_PRESET_IDS} from "./motion/presets";

export const VIDEO_PRODUCT_SCHEMA_VERSION = 2 as const;
export const VIDEO_PRODUCT_FPS = 30 as const;

export const VideoProductAspectRatioSchema = z.enum(["9:16", "16:9", "1:1"]);
export const VideoProductPlatformSchema = z.enum(["douyin", "youtube", "bilibili", "internal"]);
export const VideoProductLanguageSchema = z.enum(["zh-CN", "en"]);
export const VideoProductToneSchema = z.enum([
  "restrained",
  "tech",
  "editorial",
  "commercial",
  "documentary",
]);
export const VideoProductDensitySchema = z.enum(["low", "medium", "high"]);
export const VideoProductPacingSchema = z.enum(["slow", "medium", "fast", "punchy"]);
export const VideoProductMotionIntensitySchema = z.enum(["quiet", "medium", "high", "punchy"]);
export const VideoProductColorStrategySchema = z.enum([
  "mono-accent",
  "dual-accent",
  "editorial-contrast",
  "neutral-product",
]);
export const VideoProductNarrativeArcSchema = z.enum([
  "problem-solution",
  "proof-led",
  "launch",
  "founder-story",
  "data-insight",
]);
export const VideoProductSceneIntentSchema = z.enum([
  "hook",
  "context",
  "statement",
  "turning-point",
  "proof",
  "contrast",
  "process",
  "product-reveal",
  "quote",
  "payoff",
  "cta",
]);
export const VideoProductMediumSchema = z.enum([
  "text",
  "screenshot",
  "image",
  "video",
  "data",
  "quote",
  "product",
]);
export const VideoProductTemplateSchema = z.enum([
  "editorial-explainer",
  "product-proof",
  "data-insight",
  "founder-story",
  "feature-launch",
]);

export const VideoProductMetadataSchema = z.object({
  projectId: z.string().regex(/^[A-Za-z0-9._-]{1,96}$/),
  title: z.string().min(1).max(200),
  language: VideoProductLanguageSchema,
  aspectRatio: VideoProductAspectRatioSchema,
  platform: VideoProductPlatformSchema,
  targetDurationSec: z.number().positive().max(900),
  theme: z.string().min(1).max(120),
}).strict();

export const VideoProductProofSchema = z.object({
  claim: z.string().min(1).max(240),
  evidenceIds: z.array(z.string().min(1)).default([]),
}).strict();

export const VideoProductNarrativeSchema = z.object({
  arc: VideoProductNarrativeArcSchema,
  hook: z.string().min(1).max(240),
  context: z.string().min(1).max(320).optional(),
  turningPoint: z.string().min(1).max(320).optional(),
  proof: z.array(VideoProductProofSchema).min(1),
  payoff: z.string().min(1).max(260),
  cta: z.string().min(1).max(220).optional(),
}).strict();

export const VideoProductVisualSchema = z.object({
  tone: VideoProductToneSchema,
  density: VideoProductDensitySchema,
  pacing: VideoProductPacingSchema,
  motionIntensity: VideoProductMotionIntensitySchema,
  colorStrategy: VideoProductColorStrategySchema,
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
}).strict();

export const VideoProductAssetSchema = z.object({
  kind: z.enum(["image", "audio", "video", "font", "json", "logo", "icon"]),
  src: z.string().min(1),
  alt: z.string().min(1).optional(),
  role: z.enum(["hero", "proof", "background", "logo", "audio", "icon"]).optional(),
  required: z.boolean().default(false),
}).strict();

export const VideoProductEmphasisSchema = z.object({
  text: z.string().min(1).max(120),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  reason: z.enum(["claim", "number", "contrast", "cta", "risk", "brand"]),
}).strict();

export const VideoProductAssetRefSchema = z.object({
  assetId: z.string().min(1),
  role: z.enum(["hero", "proof", "background", "logo", "audio", "icon"]),
}).strict();

export const VideoProductLayoutSchema = z.object({
  density: VideoProductDensitySchema,
  focus: z.enum(["center", "split", "edge", "full-bleed", "timeline"]),
  safeArea: z.enum(["standard", "caption-heavy", "full-bleed"]).default("standard"),
}).strict();

export const VideoProductSceneMessageSchema = z.object({
  primary: z.string().min(1).max(220),
  secondary: z.string().min(1).max(360).optional(),
  keywords: z.array(z.string().min(1).max(60)).default([]),
}).strict();

export const VideoProductSceneMotionSchema = z.object({
  presetIds: z.array(z.enum(VIDEO_PRODUCT_MOTION_PRESET_IDS)).min(1),
  intensity: VideoProductMotionIntensitySchema.optional(),
  transition: z.enum(["matchCut", "directionalWipe", "panelShift", "cameraMove"]).optional(),
}).strict();

export const VideoProductSceneSpecSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9._-]{1,96}$/),
  intent: VideoProductSceneIntentSchema,
  block: z.enum([
    "HookScene",
    "StatementScene",
    "EvidenceScene",
    "ContrastScene",
    "ProcessScene",
    "ProductRevealScene",
    "QuoteScene",
    "SummaryScene",
  ]),
  message: VideoProductSceneMessageSchema,
  medium: VideoProductMediumSchema,
  emphasis: z.array(VideoProductEmphasisSchema).default([]),
  layout: VideoProductLayoutSchema,
  motion: VideoProductSceneMotionSchema,
  assetRefs: z.array(VideoProductAssetRefSchema).default([]),
  durationFrames: z.number().int().positive().optional(),
}).strict();

export const VideoProductVariantSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/),
  label: z.string().min(1).max(120),
  template: VideoProductTemplateSchema,
  visual: VideoProductVisualSchema.partial().optional(),
  sceneOrder: z.array(z.string().min(1)).optional(),
}).strict();

export const VideoProductRenderSchema = z.object({
  variantId: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/).optional(),
}).strict();

export const VideoProductSpecSchema = z.object({
  schemaVersion: z.literal(VIDEO_PRODUCT_SCHEMA_VERSION),
  metadata: VideoProductMetadataSchema,
  narrative: VideoProductNarrativeSchema,
  visual: VideoProductVisualSchema,
  scenes: z.array(VideoProductSceneSpecSchema).min(1),
  assets: z.record(z.string().min(1), VideoProductAssetSchema).default({}),
  variants: z.array(VideoProductVariantSchema).min(3),
  render: VideoProductRenderSchema.default({}),
}).strict().superRefine((spec, ctx) => {
  const sceneIds = new Set<string>();
  spec.scenes.forEach((scene, index) => {
    if (sceneIds.has(scene.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["scenes", index, "id"],
        message: `duplicate scene id: ${scene.id}`,
      });
    }
    sceneIds.add(scene.id);
    scene.assetRefs.forEach((ref, refIndex) => {
      if (!spec.assets[ref.assetId]) {
        ctx.addIssue({
          code: "custom",
          path: ["scenes", index, "assetRefs", refIndex, "assetId"],
          message: `unknown asset id: ${ref.assetId}`,
        });
      }
    });
  });

  const variantIds = new Set<string>();
  spec.variants.forEach((variant, index) => {
    if (variantIds.has(variant.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["variants", index, "id"],
        message: `duplicate variant id: ${variant.id}`,
      });
    }
    variantIds.add(variant.id);
    variant.sceneOrder?.forEach((sceneId, sceneOrderIndex) => {
      if (!sceneIds.has(sceneId)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "sceneOrder", sceneOrderIndex],
          message: `unknown scene id: ${sceneId}`,
        });
      }
    });
  });

  if (spec.render.variantId && !variantIds.has(spec.render.variantId)) {
    ctx.addIssue({
      code: "custom",
      path: ["render", "variantId"],
      message: `unknown variant id: ${spec.render.variantId}`,
    });
  }

  if (!spec.scenes.some((scene) => scene.intent === "hook")) {
    ctx.addIssue({code: "custom", path: ["scenes"], message: "video product spec must include a hook scene"});
  }
  if (!spec.scenes.some((scene) => scene.intent === "payoff" || scene.intent === "cta")) {
    ctx.addIssue({code: "custom", path: ["scenes"], message: "video product spec must include a payoff or cta scene"});
  }
});

export type VideoProductAspectRatio = z.infer<typeof VideoProductAspectRatioSchema>;
export type VideoProductTone = z.infer<typeof VideoProductToneSchema>;
export type VideoProductSceneIntent = z.infer<typeof VideoProductSceneIntentSchema>;
export type VideoProductVisual = z.infer<typeof VideoProductVisualSchema>;
export type VideoProductAsset = z.infer<typeof VideoProductAssetSchema>;
export type VideoProductSceneSpec = z.infer<typeof VideoProductSceneSpecSchema>;
export type VideoProductVariant = z.infer<typeof VideoProductVariantSchema>;
export type VideoProductSpec = z.infer<typeof VideoProductSpecSchema>;

export const dimensionsForVideoProductAspectRatio = (aspectRatio: VideoProductAspectRatio) => {
  if (aspectRatio === "16:9") return {width: 1920, height: 1080};
  if (aspectRatio === "1:1") return {width: 1080, height: 1080};
  return {width: 1080, height: 1920};
};

export const targetDurationInFramesForVideoProduct = (spec: VideoProductSpec) =>
  Math.round(spec.metadata.targetDurationSec * VIDEO_PRODUCT_FPS);
