export type SkillShowcaseVariant =
  | 'intro'
  | 'overview'
  | 'coding'
  | 'remotion'
  | 'ppt'
  | 'illustration'
  | 'hyperframes'
  | 'ui'
  | 'outro';

import type {SkillIconKey} from './iconRegistry';

export type {SkillIconKey} from './iconRegistry';

export type SkillBeatAction =
  | 'spotlight'
  | 'stamp'
  | 'trace'
  | 'compare'
  | 'counter'
  | 'stack'
  | 'focus'
  | 'burst';

export type SkillShowcaseBeat = {
  startFrame: number;
  endFrame: number;
  keyword: string;
  icon: SkillIconKey;
  action: SkillBeatAction;
  detail?: string;
  evidence?: string[];
  value?: string;
};

export interface SkillShowcaseProps {
  variant: SkillShowcaseVariant;
  title: string;
  subtitle?: string;
  index?: string;
  accent?: string;
  secondaryAccent?: string;
  bullets?: string[];
  labels?: string[];
  beats?: SkillShowcaseBeat[];
}
