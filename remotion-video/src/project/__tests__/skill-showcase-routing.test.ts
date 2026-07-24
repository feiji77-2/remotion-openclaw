import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import fixture from "../../../examples/skill-showcase.json";
import { resolveSkillBeats } from "../../components/ultimate-kit/families/skill-showcase/beatRegistry";
import { resolveSkillShowcaseRenderPlan } from "../../components/ultimate-kit/families/skill-showcase/skillShowcaseRouting";
import type {
  SkillBeatShotPreset,
  SkillShowcaseProps,
} from "../../components/ultimate-kit/families/skill-showcase/types";

const CINEMATIC_PRESETS: SkillBeatShotPreset[] = [
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
];

describe("skill-showcase production routing", () => {
  it("maps the nine variant inputs onto the eight retained Hero Track compositions", () => {
    const plans = fixture.scenes.map((scene) => {
      const props = scene.payload as unknown as SkillShowcaseProps;
      return resolveSkillShowcaseRenderPlan(
        props,
        resolveSkillBeats(props.variant, props.beats),
      );
    });

    expect(plans.every((plan) => plan.mode === "hero-track-v2")).toBe(true);
    expect(plans.map((plan) => plan.heroTrack?.kind)).toEqual([
      "overview-matrix",
      "overview-matrix",
      "rule-compare",
      "code-render",
      "slide-editor",
      "article-map",
      "video-agent",
      "design-compare",
      "system-summary",
    ]);
  });

  it("routes every cinematic preset through the retained CinematicShot renderer", () => {
    const props: SkillShowcaseProps = {
      variant: "generic",
      title: "20 component contract",
      heroStyle: "cinematic",
      beats: CINEMATIC_PRESETS.map((shotPreset, index) => ({
        startFrame: index * 20,
        endFrame: (index + 1) * 20,
        keyword: shotPreset,
        icon: "focus",
        action: "focus",
        shotPreset,
      })),
    };
    const plan = resolveSkillShowcaseRenderPlan(props, props.beats ?? []);

    expect(plan.mode).toBe("cinematic");
    expect(plan.heroTrack).toBeUndefined();
    expect(plan.beats.map((beat) => beat.shotPreset)).toEqual(
      CINEMATIC_PRESETS,
    );
  });

  it("does not retain any superseded renderer source", () => {
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../..",
    );
    const removed = [
      "components/ultimate-kit/families/skill-showcase/LandscapeSkillShowcase.tsx",
      "components/ultimate-kit/families/skill-showcase/TechExplainerHero.tsx",
      "components/ultimate-kit/families/skill-showcase/TechnicalEvidenceWorkbench.tsx",
      "compositions/SkillVisualLibrary.tsx",
    ];
    expect(
      removed.every(
        (relativePath) => !fs.existsSync(path.join(root, relativePath)),
      ),
    ).toBe(true);

    const portraitSource = fs.readFileSync(
      path.join(
        root,
        "components/ultimate-kit/families/skill-showcase/PortraitCinematicSkillShowcase.tsx",
      ),
      "utf8",
    );
    expect(portraitSource).not.toContain("HeroTrackMotionTransition");
  });
});
