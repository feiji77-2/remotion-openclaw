import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {
  buildVideoProductSpecFromProductionPack,
  buildVideoProductSpecFromScript,
} from "../narrative-planner.mjs";
import {measureVideoProductSpec} from "../video-product-metrics.mjs";
import {buildVideoProductReport} from "../video-product-report.mjs";

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REMOTION_ROOT = path.resolve(TEST_ROOT, "../../..");
const FIXTURE_ROOT = path.join(TEST_ROOT, "fixtures");
const VISUAL_DIVERSITY_FIXTURES = [
  "visual-diversity-tech",
  "visual-diversity-product",
  "visual-diversity-knowledge",
];
const VIDEO_PRODUCT_SPEC_FIXTURES = [
  "video-product-tech",
  "video-product-product",
  "video-product-knowledge",
];

const readPack = (fixtureName) => {
  const root = path.join(FIXTURE_ROOT, fixtureName);
  return {
    root,
    brief: JSON.parse(fs.readFileSync(path.join(root, "brief.json"), "utf8")),
    scriptPack: JSON.parse(fs.readFileSync(path.join(root, "script-pack.json"), "utf8")),
    assetPack: JSON.parse(fs.readFileSync(path.join(root, "asset-pack.json"), "utf8")),
  };
};

describe("video product narrative planner", () => {
  it("builds a v2 spec with diverse scene blocks, variants, and motion families", () => {
    const spec = buildVideoProductSpecFromScript({
      projectId: "planner-direct-script",
      title: "直接脚本规划",
      scriptText: [
        "这条视频先说明为什么一次性模板不够。",
        "第一步，把脚本拆成 hook、context、proof 和 payoff。",
        "第二步，不是字幕直接命中组件，而是先决定场景职责。",
        "第三步，37 个检查项进入质量报告。",
        "最后，输出一套能持续生成的视频产品系统。",
      ].join(""),
      maxScenes: 6,
    });
    expect(spec.schemaVersion).toBe(2);
    expect(spec.metadata.projectId).toBe("planner-direct-script");
    expect(spec.variants).toHaveLength(3);
    expect(spec.scenes[0]).toMatchObject({intent: "hook", block: "HookScene"});
    expect(spec.scenes.at(-1).intent).toBe("payoff");
    const metrics = measureVideoProductSpec(spec);
    expect(metrics.ok, metrics.errors.join("; ")).toBe(true);
    expect(metrics.motion.families.uniqueCount).toBeGreaterThanOrEqual(4);
  });

  it.each(VISUAL_DIVERSITY_FIXTURES)("builds strict v2 specs from %s production packs", (fixtureName) => {
    const pack = readPack(fixtureName);
    const spec = buildVideoProductSpecFromProductionPack({
      brief: pack.brief,
      scriptPack: pack.scriptPack,
      assetPack: pack.assetPack,
      maxScenes: 8,
    });
    const metrics = measureVideoProductSpec(spec);
    expect(metrics.ok, metrics.errors.join("; ")).toBe(true);
    expect(spec.metadata.projectId).toBe(pack.brief.productionId);
    expect(spec.scenes.length).toBeGreaterThanOrEqual(3);
    expect(metrics.scenes.intents.uniqueCount).toBeGreaterThanOrEqual(4);
    expect(metrics.scenes.blocks.uniqueCount).toBeGreaterThanOrEqual(4);
    expect(metrics.motion.families.uniqueCount).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(spec)).not.toMatch(/WorkBuddy|PPT Master|HyperFrames|UI Skill|好帮手/u);
    if (fixtureName === "visual-diversity-product") {
      const processScenes = spec.scenes.filter((scene) => scene.intent === "process");
      const sceneTitles = spec.scenes.map((scene) => scene.message.primary).join(" ");
      expect(spec.metadata.theme.startsWith("product:")).toBe(true);
      expect(processScenes.length).toBeLessThanOrEqual(Math.ceil(spec.scenes.length / 2));
      expect(sceneTitles).toContain("补货阈值");
      expect(sceneTitles).toContain("节假日一起对比");
      expect(sceneTitles).toContain("6%");
      expect(sceneTitles).not.toContain("补货阈 ");
      expect(sceneTitles).not.toContain("节假日一 ");
      expect(sceneTitles).not.toContain("下降到 6 ");
    }
  });

  it("writes a product spec through the CLI and validates it through metrics CLI", () => {
    const pack = readPack("visual-diversity-product");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "video-product-cli-"));
    for (const file of ["brief.json", "script-pack.json", "asset-pack.json"]) {
      fs.copyFileSync(path.join(pack.root, file), path.join(root, file));
    }
    const build = spawnSync(
      process.execPath,
      [
        path.join(REMOTION_ROOT, "scripts/build-video-product-from-script.mjs"),
        root,
        "--out",
        "video-product.json",
        "--strict",
      ],
      {cwd: REMOTION_ROOT, encoding: "utf8"},
    );
    expect(build.status, build.stderr || build.stdout).toBe(0);
    const output = path.join(root, "video-product.json");
    expect(fs.existsSync(output)).toBe(true);

    const metrics = spawnSync(
      process.execPath,
      [
        path.join(REMOTION_ROOT, "scripts/video-product-metrics.mjs"),
        path.relative(REMOTION_ROOT, output),
        "--strict",
      ],
      {cwd: REMOTION_ROOT, encoding: "utf8"},
    );
    expect(metrics.status, metrics.stderr || metrics.stdout).toBe(0);
    expect(JSON.parse(metrics.stdout)).toMatchObject({ok: true});
  });

  it.each(VIDEO_PRODUCT_SPEC_FIXTURES)("keeps committed v2 fixture %s above product quality thresholds", (fixtureName) => {
    const specPath = path.join(FIXTURE_ROOT, fixtureName, "video-product.json");
    const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
    const metrics = measureVideoProductSpec(spec);
    expect(metrics.ok, metrics.errors.join("; ")).toBe(true);
    expect(metrics.scenes.blocks.uniqueCount).toBeGreaterThanOrEqual(4);
    expect(metrics.motion.families.uniqueCount).toBeGreaterThanOrEqual(4);
    expect(metrics.variants.templates.uniqueCount).toBe(3);
  });

  it("builds a non-render product report for future Studio inspection", () => {
    const specPath = path.join(FIXTURE_ROOT, "video-product-product", "video-product.json");
    const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
    const report = buildVideoProductReport(spec, {variantId: "editorial"});
    expect(report.ok, report.errors.join("; ")).toBe(true);
    expect(report.product).toMatchObject({
      projectId: "visual-diversity-product",
      activeVariantId: "editorial",
      defaultOutName: "visual-diversity-product-editorial.mp4",
    });
    expect(report.sceneCards.length).toBe(spec.scenes.length);
    expect(report.variants).toHaveLength(3);
    expect(report.variants.map((variant) => variant.template)).toEqual(
      expect.arrayContaining(["editorial-explainer", "product-proof", "data-insight"]),
    );
    expect(report.inspection).toMatchObject({
      level: "ready",
      blockers: [],
    });
    expect(report.inspection.score).toBeGreaterThanOrEqual(90);
    expect(report.studioModel.summaryCards.map((card) => card.id)).toEqual(["quality", "scenes", "motion", "variants"]);
    expect(report.studioModel.variantMatrix).toHaveLength(3);
    expect(report.studioModel.qualityGates.map((gate) => gate.id)).toEqual(
      expect.arrayContaining(["story-arc", "motion-language", "variant-system", "timeline"]),
    );
    expect(report.studioModel.qaChecklist.automated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({id: "metrics-strict", status: "pass"}),
        expect.objectContaining({id: "report-strict", status: "pass"}),
      ]),
    );
    expect(report.timelineSections.map((section) => section.stage)).toContain("opening");
    expect(report.studioReadiness).toMatchObject({
      canInspectStoryboard: true,
      canSelectVariants: true,
      canRunNonRenderQa: true,
      hasBlockingIssues: false,
      renderRequiresVisualReview: true,
    });
  });

  it("writes a product report through the CLI", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "video-product-report-"));
    const output = path.join(root, "report.json");
    const result = spawnSync(
      process.execPath,
      [
        path.join(REMOTION_ROOT, "scripts/video-product-report.mjs"),
        "scripts/lib/__tests__/fixtures/video-product-tech/video-product.json",
        "--variant",
        "product-proof",
        "--out",
        path.relative(REMOTION_ROOT, output),
        "--strict",
      ],
      {cwd: REMOTION_ROOT, encoding: "utf8"},
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const summary = JSON.parse(result.stdout);
    expect(summary).toMatchObject({ok: true, projectId: "visual-diversity-tech", blockers: 0});
    expect(summary.qualityScore).toBeGreaterThanOrEqual(90);
    const report = JSON.parse(fs.readFileSync(output, "utf8"));
    expect(report.product.activeVariantId).toBe("product-proof");
    expect(report.sceneCards.length).toBeGreaterThan(0);
  });

  it("fails strict product report output for an unknown variant", () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(REMOTION_ROOT, "scripts/video-product-report.mjs"),
        "scripts/lib/__tests__/fixtures/video-product-tech/video-product.json",
        "--variant",
        "missing-variant",
        "--strict",
      ],
      {cwd: REMOTION_ROOT, encoding: "utf8"},
    );
    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.ok).toBe(false);
    expect(report.errors).toContain("unknown variant id: missing-variant");
    expect(report.studioReadiness.hasBlockingIssues).toBe(true);
    expect(report.inspection.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({id: "active-variant"})]),
    );
  });

  it("rejects golden sample copy before creating a reusable product spec", () => {
    expect(() => buildVideoProductSpecFromScript({
      projectId: "bad-sample",
      title: "样片复制",
      scriptText: "装上这 6 个 Skill，WorkBuddy 才算真正的好帮手。",
    })).toThrow("SAMPLE_COPY_REJECTED");
  });
});
