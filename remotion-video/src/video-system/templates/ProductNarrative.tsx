import React from "react";
import type {CalculateMetadataFunction} from "remotion";
import {AbsoluteFill, Sequence, useCurrentFrame} from "remotion";
import {SceneBlock} from "../scene-blocks";
import {
  dimensionsForVideoProductAspectRatio,
  targetDurationInFramesForVideoProduct,
  VIDEO_PRODUCT_FPS,
  VideoProductSpecSchema,
  type VideoProductSceneSpec,
  type VideoProductSpec,
  type VideoProductVariant,
} from "../productSchema";

export type VideoProductTimelineItem = {
  scene: VideoProductSceneSpec;
  startFrame: number;
  durationFrames: number;
};

const pacingWeightForScene = (scene: VideoProductSceneSpec) => {
  if (scene.intent === "hook") return 0.82;
  if (scene.intent === "proof" || scene.intent === "process" || scene.intent === "product-reveal") return 1.18;
  if (scene.intent === "payoff" || scene.intent === "cta") return 0.9;
  return 1;
};

const orderedScenesForVariant = (
  scenes: VideoProductSceneSpec[],
  variant?: VideoProductVariant,
) => {
  if (!variant?.sceneOrder?.length) return scenes;
  const byId = new Map(scenes.map((scene) => [scene.id, scene]));
  const ordered = variant.sceneOrder
    .map((sceneId) => byId.get(sceneId))
    .filter((scene): scene is VideoProductSceneSpec => Boolean(scene));
  const orderedIds = new Set(ordered.map((scene) => scene.id));
  return [...ordered, ...scenes.filter((scene) => !orderedIds.has(scene.id))];
};

export const resolveVideoProductVariant = (
  spec: VideoProductSpec,
  variantId = spec.render?.variantId,
): VideoProductSpec => {
  const variant = variantId
    ? spec.variants.find((item) => item.id === variantId)
    : undefined;
  if (!variant) return spec;
  return {
    ...spec,
    visual: {...spec.visual, ...variant.visual},
    scenes: orderedScenesForVariant(spec.scenes, variant),
  };
};

export const buildVideoProductTimeline = (spec: VideoProductSpec): VideoProductTimelineItem[] => {
  const resolvedSpec = resolveVideoProductVariant(spec);
  const explicitDuration = resolvedSpec.scenes.reduce((total, scene) => total + (scene.durationFrames ?? 0), 0);
  const missingScenes = resolvedSpec.scenes.filter((scene) => !scene.durationFrames);
  const target = Math.max(targetDurationInFramesForVideoProduct(resolvedSpec), explicitDuration + missingScenes.length * 45);
  const remaining = Math.max(0, target - explicitDuration);
  const weightTotal = missingScenes.reduce((total, scene) => total + pacingWeightForScene(scene), 0) || 1;
  let cursor = 0;
  return resolvedSpec.scenes.map((scene, index) => {
    const isLast = index === resolvedSpec.scenes.length - 1;
    const durationFrames = scene.durationFrames ?? (
      isLast
        ? Math.max(45, target - cursor)
        : Math.max(45, Math.round(remaining * pacingWeightForScene(scene) / weightTotal))
    );
    const item = {scene, startFrame: cursor, durationFrames};
    cursor += durationFrames;
    return item;
  });
};

export const durationInFramesForVideoProductSpec = (spec: VideoProductSpec) => {
  const timeline = buildVideoProductTimeline(spec);
  const last = timeline[timeline.length - 1];
  return last ? last.startFrame + last.durationFrames : targetDurationInFramesForVideoProduct(spec);
};

export const metadataForVideoProductSpec = (spec: VideoProductSpec) => ({
  ...dimensionsForVideoProductAspectRatio(resolveVideoProductVariant(spec).metadata.aspectRatio),
  fps: VIDEO_PRODUCT_FPS,
  durationInFrames: durationInFramesForVideoProductSpec(spec),
  defaultOutName: spec.render.variantId
    ? `${spec.metadata.projectId}-${spec.render.variantId}.mp4`
    : `${spec.metadata.projectId}.mp4`,
});

export const calculateVideoProductMetadata: CalculateMetadataFunction<VideoProductSpec> = async ({props}) => {
  const parsed = VideoProductSpecSchema.parse(props);
  return {
    ...metadataForVideoProductSpec(parsed),
    props: parsed,
  };
};

export const VideoProductFrame: React.FC<{
  spec: VideoProductSpec;
  frame: number;
}> = ({spec, frame}) => {
  const resolvedSpec = resolveVideoProductVariant(spec);
  const timeline = buildVideoProductTimeline(resolvedSpec);
  const current = timeline.find((item) => frame >= item.startFrame && frame < item.startFrame + item.durationFrames) ?? timeline[timeline.length - 1];
  if (!current) return null;
  return (
    <SceneBlock
      scene={current.scene}
      spec={resolvedSpec}
      frame={Math.max(0, frame - current.startFrame)}
      durationFrames={current.durationFrames}
    />
  );
};

export const VideoProductComposition: React.FC<VideoProductSpec> = (spec) => {
  const frame = useCurrentFrame();
  const resolvedSpec = resolveVideoProductVariant(spec);
  const timeline = buildVideoProductTimeline(resolvedSpec);
  return (
    <AbsoluteFill>
      {timeline.map((item) => (
        <Sequence key={item.scene.id} from={item.startFrame} durationInFrames={item.durationFrames}>
          <SceneBlock scene={item.scene} spec={resolvedSpec} frame={Math.max(0, frame - item.startFrame)} durationFrames={item.durationFrames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
