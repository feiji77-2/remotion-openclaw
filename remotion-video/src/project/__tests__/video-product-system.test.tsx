import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import productSystemFixture from "../../../examples/video-product-system.json";
import {
  VIDEO_PRODUCT_MOTION_PRESET_IDS,
  resolveVideoProductMotionPreset,
  videoProductMotionPresetDefinitions,
} from "../../video-system/motion/presets";
import {VideoProductSpecSchema} from "../../video-system/productSchema";
import {
  VideoProductFrame,
  buildVideoProductTimeline,
  durationInFramesForVideoProductSpec,
  metadataForVideoProductSpec,
  resolveVideoProductVariant,
} from "../../video-system/templates/ProductNarrative";

const spec = () => VideoProductSpecSchema.parse(structuredClone(productSystemFixture));

describe("video product system v2", () => {
  it("parses a product-level schema with narrative, visual, motion, assets, and variants", () => {
    const parsed = spec();
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.narrative).toMatchObject({
      arc: "proof-led",
      hook: expect.any(String),
      payoff: expect.any(String),
    });
    expect(parsed.scenes.map((scene) => scene.intent)).toEqual(
      expect.arrayContaining(["hook", "context", "proof", "process", "contrast", "payoff"]),
    );
    expect(parsed.variants).toHaveLength(3);
    expect(new Set(parsed.variants.map((variant) => variant.template))).toEqual(
      new Set(["editorial-explainer", "product-proof", "data-insight"]),
    );
    expect(parsed.render).toEqual({});
  });

  it("keeps motion presets richer than primitive fade and slide effects", () => {
    const families = new Set(videoProductMotionPresetDefinitions.map((preset) => preset.family));
    expect(families).toEqual(new Set(["reveal", "spatial", "emphasis", "transition", "text", "media"]));
    expect(VIDEO_PRODUCT_MOTION_PRESET_IDS).not.toContain("fadeIn");
    expect(VIDEO_PRODUCT_MOTION_PRESET_IDS).not.toContain("slideUp");
    expect(VIDEO_PRODUCT_MOTION_PRESET_IDS).not.toContain("zoomIn");
    for (const preset of videoProductMotionPresetDefinitions) {
      expect(preset.use.length).toBeGreaterThan(24);
      expect(Object.keys(preset.params).length).toBeGreaterThan(0);
      expect(preset.durationFrames).toBeGreaterThanOrEqual(16);
      expect(preset.composeWith.length).toBeGreaterThan(0);
      expect(preset.avoidWhen.length).toBeGreaterThan(24);
    }
  });

  it("requires every scene motion id to resolve to a product motion preset", () => {
    const parsed = spec();
    const scenePresetIds = parsed.scenes.flatMap((scene) => scene.motion.presetIds);
    expect(scenePresetIds.length).toBeGreaterThan(parsed.scenes.length);
    for (const presetId of scenePresetIds) {
      expect(resolveVideoProductMotionPreset(presetId)).not.toBeNull();
    }
  });

  it("builds a deterministic timeline and metadata from the schema", () => {
    const parsed = spec();
    const timeline = buildVideoProductTimeline(parsed);
    expect(timeline).toHaveLength(parsed.scenes.length);
    expect(timeline[0]).toMatchObject({startFrame: 0, durationFrames: 120});
    timeline.forEach((item, index) => {
      expect(item.durationFrames).toBeGreaterThan(0);
      if (index > 0) {
        expect(item.startFrame).toBe(timeline[index - 1].startFrame + timeline[index - 1].durationFrames);
      }
    });
    expect(durationInFramesForVideoProductSpec(parsed)).toBe(540);
    expect(metadataForVideoProductSpec(parsed)).toMatchObject({
      width: 1080,
      height: 1920,
      fps: 30,
      durationInFrames: 540,
      defaultOutName: "video-product-system-demo.mp4",
    });
  });

  it("renders a scene block from data without depending on the legacy skill-showcase family", () => {
    const parsed = spec();
    const html = renderToStaticMarkup(<VideoProductFrame spec={parsed} frame={0} />);
    expect(html).toContain("漂亮样片不是产品系统");
    expect(html).toContain("叙事");
    expect(html).toContain("data-motion-presets");
    expect(html).not.toContain("WorkBuddy");
    expect(html).not.toContain("PPT Master");
    expect(html).not.toContain("HyperFrames");
  });

  it("applies selected variants to visual tone, output name, and scene order", () => {
    const parsed = spec();
    parsed.variants[0].sceneOrder = ["payoff", "hook"];
    parsed.render.variantId = "editorial";
    const resolved = resolveVideoProductVariant(parsed);
    expect(resolved.visual).toMatchObject({
      tone: "editorial",
      accent: "#f6d365",
    });
    expect(resolved.scenes.map((scene) => scene.id).slice(0, 2)).toEqual(["payoff", "hook"]);
    expect(metadataForVideoProductSpec(parsed)).toMatchObject({
      defaultOutName: "video-product-system-demo-editorial.mp4",
    });
    const html = renderToStaticMarkup(<VideoProductFrame spec={parsed} frame={0} />);
    expect(html).toContain("目标是持续生产能力");
    expect(html).toContain("#f6d365");
  });

  it("renders concrete motion overlays for high-value presets", () => {
    const parsed = spec();
    const timeline = buildVideoProductTimeline(parsed);
    const proof = timeline.find((item) => item.scene.id === "proof");
    expect(proof).toBeTruthy();
    const html = renderToStaticMarkup(<VideoProductFrame spec={parsed} frame={(proof?.startFrame ?? 0) + 24} />);
    expect(html).toContain('data-motion-presets="numberCount focusLock depthShift"');
    expect(html).toContain('data-motion-overlay="focusLock"');
  });

  it("rejects unknown assets and invalid variant scene order", () => {
    const invalidAsset = spec();
    invalidAsset.scenes[0].assetRefs = [{assetId: "missing", role: "hero"}];
    expect(VideoProductSpecSchema.safeParse(invalidAsset).success).toBe(false);

    const invalidVariant = spec();
    invalidVariant.variants[0].sceneOrder = ["missing-scene"];
    const parsed = VideoProductSpecSchema.safeParse(invalidVariant);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toContain("unknown scene id");

    const invalidRenderVariant = spec();
    invalidRenderVariant.render.variantId = "missing-variant";
    const renderParsed = VideoProductSpecSchema.safeParse(invalidRenderVariant);
    expect(renderParsed.success).toBe(false);
    expect(renderParsed.error?.issues[0].message).toContain("unknown variant id");
  });
});
