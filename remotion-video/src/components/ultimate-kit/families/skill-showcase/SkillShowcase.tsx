import React from "react";
import { PortraitCinematicSkillShowcase } from "./PortraitCinematicSkillShowcase";
import { resolveSkillBeats } from "./beatRegistry";
import { resolveSkillShowcaseRenderPlan } from "./skillShowcaseRouting";
import type { SkillShowcaseProps } from "./types";

export type {
  SkillBeatAction,
  SkillBeatShotPreset,
  SkillIconKey,
  SkillShowcaseBeat,
  SkillShowcaseHeroStyle,
  SkillShowcaseProps,
  SkillShowcaseVariant,
} from "./types";

/**
 * Production entry for the skill-showcase family.
 *
 * The renderer has exactly two visual implementations:
 * - HeroTrackV2, with nine legacy compositions plus state-level technical shots.
 * - CinematicShot, with eleven motion presets.
 *
 * Variant payloads without an explicit style are deterministically mapped to
 * Hero Track, so the original V3 project remains on this single render path.
 */
export const SkillShowcase: React.FC<SkillShowcaseProps> = (props) => {
  const resolvedBeats = resolveSkillBeats(props.variant, props.beats);
  const plan = resolveSkillShowcaseRenderPlan(props, resolvedBeats);

  return (
    <PortraitCinematicSkillShowcase
      {...props}
      heroStyle={plan.mode}
      beats={plan.beats}
      heroTrack={plan.heroTrack}
    />
  );
};
