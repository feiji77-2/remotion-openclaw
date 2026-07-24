import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { z } from "zod";
import { SkillShowcase } from "../components/ultimate-kit/families/skill-showcase/SkillShowcase";
import { SKILL_ICON_KEYS } from "../components/ultimate-kit/families/skill-showcase/iconRegistry";
import { PRODUCT_ICON_KEYS } from "../components/ultimate-kit/families/skill-showcase/productIcons";
import type { CompiledAsset } from "./assetResolver";
import type { CompiledProject, CompiledProjectScene } from "./compileProject";
import { ProjectValidationError, formatProjectPath } from "./projectSchema";
import { HeroLensSchema, HeroShotSchema } from "./visualPlan";

const SkillIconSchema = z.enum(SKILL_ICON_KEYS);
const ProductIconSchema = z.enum(PRODUCT_ICON_KEYS);
const SkillBeatMotionPresetSchema = z.enum([
  "slow-rise",
  "scan-lock",
  "number-roll",
  "split-reveal",
  "card-regroup",
  "icon-relay",
  "focus-pulse",
  "flash-cut",
]);
const SkillBeatPlacementSchema = z.enum(["bottom", "body", "highlight"]);
const SkillBeatShotPresetSchema = z.enum([
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
const SceneEditorSchema = z
  .object({
    componentId: z.string().min(1).max(64),
    source: z.enum(["project", "hyperframes"]).optional(),
    sourceComponentId: z.string().min(1).max(64).optional(),
    rendererComponentId: z.string().min(1).max(64).optional(),
    componentLabel: z.string().min(1).max(80).optional(),
    componentCategory: z.string().min(1).max(32).optional(),
    orientation: z.enum(["portrait", "landscape"]).optional(),
    componentDurationInFrames: z.number().int().positive().max(36000).optional(),
    backgroundPreset: z.string().min(1).max(64).optional(),
    blocks: z.array(z.enum(["background", "component", "caption"])).max(3).optional(),
    updatedAt: z.string().min(1).max(64).optional(),
  })
  .strict();

const SkillShowcasePayloadSchema = z
  .object({
    variant: z.enum([
      "intro",
      "overview",
      "coding",
      "remotion",
      "ppt",
      "illustration",
      "hyperframes",
      "ui",
      "outro",
      "impeccable",
      "frontend-design",
      "ux-pro",
      "cloud-design",
      "generic",
    ]),
    visualMode: z
      .enum(["hero", "grid", "compare", "process", "metrics", "quote"])
      .optional(),
    heroStyle: z.enum(["cinematic", "hero-track-v2"]).optional(),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    index: z.string().min(1).max(4).optional(),
    accent: z.string().min(1).optional(),
    secondaryAccent: z.string().min(1).optional(),
    bullets: z.array(z.string().min(1)).max(6).optional(),
    labels: z.array(z.string().min(1)).max(8).optional(),
    labelIcons: z.array(SkillIconSchema).max(8).optional(),
    productIcon: ProductIconSchema.optional(),
    productIcons: z.array(ProductIconSchema).max(8).optional(),
    brandName: z.string().min(1).max(32).optional(),
    brandIcon: ProductIconSchema.optional(),
    eyebrow: z.string().min(1).max(80).optional(),
    headline: z.string().min(1).max(80).optional(),
    body: z.string().min(1).max(120).optional(),
    footer: z.string().min(1).max(120).optional(),
    progressIndex: z.number().int().nonnegative().max(24).optional(),
    progressTotal: z.number().int().positive().max(24).optional(),
    captionStartIndex: z.number().int().nonnegative().optional(),
    captionEndIndex: z.number().int().nonnegative().optional(),
    narrativeSignal: z
      .object({
        key: z.string().min(1).max(48),
        family: z.string().min(1).max(80),
      })
      .optional(),
    layoutSignature: z.string().min(1).max(64).optional(),
    sourceText: z.string().min(1).max(800).optional(),
    sceneEditor: SceneEditorSchema.optional(),
    heroTrack: z
      .object({
        kind: z.enum([
          "overview-matrix",
          "rule-compare",
          "code-render",
          "slide-editor",
          "article-map",
          "video-agent",
          "design-compare",
          "system-summary",
          "generic-explainer",
        ]),
        captionStartIndex: z.number().int().nonnegative(),
        captionEndIndex: z.number().int().nonnegative(),
        states: z
          .array(
            z
              .object({
                startFrame: z.number().int().nonnegative(),
                endFrame: z.number().int().positive(),
                captionStartIndex: z.number().int().nonnegative(),
                captionEndIndex: z.number().int().nonnegative(),
                label: z.string().min(1).max(32),
                detail: z.string().min(1).max(120),
                evidence: z.array(z.string().min(1).max(48)).max(5).optional(),
                entityTarget: z.string().min(1).max(48).optional(),
                cinematicPreset: SkillBeatShotPresetSchema.optional(),
                lens: HeroLensSchema.optional(),
                shot: HeroShotSchema.optional(),
                componentId: z.string().min(1).max(64).optional(),
                componentProps: z.record(z.string(), z.unknown()).optional(),
                intent: z.record(z.string(), z.unknown()).optional(),
                visualPlanEntryId: z.string().min(1).max(96).optional(),
                resolution: z.enum(["matched", "fallback", "error"]).optional(),
                diagnostics: z.array(z.record(z.string(), z.unknown())).optional(),
              })
              .strict(),
          )
          .min(1)
          .max(24),
      })
      .strict()
      .optional(),
    beats: z
      .array(
        z
          .object({
            startFrame: z.number().int().nonnegative(),
            endFrame: z.number().int().positive(),
            captionStartIndex: z.number().int().nonnegative().optional(),
            captionEndIndex: z.number().int().nonnegative().optional(),
            keyword: z.string().min(1).max(24),
            icon: SkillIconSchema,
            action: z.enum([
              "spotlight",
              "stamp",
              "trace",
              "compare",
              "counter",
              "stack",
              "focus",
              "burst",
            ]),
            visualState: z.string().min(1).max(48).optional(),
            motionPreset: SkillBeatMotionPresetSchema.optional(),
            placement: SkillBeatPlacementSchema.optional(),
            shotPreset: SkillBeatShotPresetSchema.optional(),
            detail: z.string().min(1).max(60).optional(),
            evidence: z.array(z.string().min(1).max(28)).max(4).optional(),
            value: z.string().min(1).max(18).optional(),
          })
          .strict(),
      )
      .max(12)
      .optional(),
  })
  .strict()
  .superRefine((payload, ctx) => {
    payload.beats?.forEach((beat, index) => {
      if (beat.endFrame <= beat.startFrame) {
        ctx.addIssue({
          code: "custom",
          message: "endFrame must be greater than startFrame",
          path: ["beats", index, "endFrame"],
        });
      }
      const previous = payload.beats?.[index - 1];
      if (previous && beat.startFrame < previous.startFrame) {
        ctx.addIssue({
          code: "custom",
          message: "beats must be ordered by startFrame",
          path: ["beats", index, "startFrame"],
        });
      }
    });
  });

export type ProjectSceneFamily = "skill-showcase";
export const PROJECT_SCENE_FAMILIES = ["skill-showcase"] as const;

export const parseProjectScenePayload = (
  family: string,
  payload: Record<string, unknown>,
  path: string,
): { family: ProjectSceneFamily; payload: Record<string, unknown> } => {
  if (family !== "skill-showcase") {
    throw new ProjectValidationError(
      "FAMILY_UNREGISTERED",
      `${path}.family`,
      `unsupported family: "${family}". Valid: skill-showcase`,
    );
  }
  const parsed = SkillShowcasePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const issuePath = formatProjectPath(issue.path);
    throw new ProjectValidationError(
      "SCENE_PAYLOAD_INVALID",
      issuePath ? `${path}.payload.${issuePath}` : `${path}.payload`,
      issue.message,
    );
  }
  return { family, payload: parsed.data as Record<string, unknown> };
};

const resolveImageSrc = (asset: CompiledAsset) =>
  asset.source === "remote" ? asset.src : staticFile(asset.src);

const SceneAsset: React.FC<{ assets: CompiledAsset[]; accent: string }> = ({
  assets,
  accent,
}) => {
  const image = assets.find((asset) => asset.kind === "image");
  if (!image) return null;
  if (!image.available) {
    return (
      <div
        data-asset-fallback={image.id}
        style={{
          position: "absolute",
          right: 86,
          top: 126,
          width: 300,
          height: 300,
          border: `1px solid ${accent}55`,
          background: `linear-gradient(135deg, ${accent}22, rgba(255,255,255,0.025))`,
          display: "grid",
          placeItems: "center",
          color: `${accent}aa`,
          fontSize: 72,
          fontWeight: 900,
        }}
      >
        +
      </div>
    );
  }
  return (
    <Img
      src={resolveImageSrc(image)}
      style={{
        position: "absolute",
        right: 76,
        top: 112,
        width: 340,
        height: 340,
        objectFit: "contain",
        opacity: 0.7,
      }}
    />
  );
};

export const ProjectSceneRegistry: React.FC<{
  scene: CompiledProjectScene;
  sceneIndex: number;
  qualityMode: CompiledProject["qualityMode"];
}> = ({ scene }) => {
  const accent =
    typeof scene.payload.accent === "string" ? scene.payload.accent : "#48e7f3";
  return (
    <AbsoluteFill
      data-scene-id={scene.id}
      data-family={scene.family}
      style={{ overflow: "hidden", background: "#05070d", color: "#f8fafc" }}
    >
      <SceneAsset assets={scene.assets} accent={accent} />
      <SkillShowcase
        {...(scene.payload as unknown as React.ComponentProps<
          typeof SkillShowcase
        >)}
      />
    </AbsoluteFill>
  );
};
