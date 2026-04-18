import React from 'react';
import { OpeningShot } from '../components/OpeningShot';
import { ConceptBlock } from '../components/ConceptBlock';
import { SplitComparison } from '../components/SplitComparison';
import { BulletList } from '../components/BulletList';
import { LoopFlowDiagram } from '../components/LoopFlowDiagram';
import { SkillTree } from '../components/SkillTree';
import { CTAEnd } from '../components/CTAEnd';
import type {
  ThemeColorToken,
  Video1v4ShotContent,
} from '../data/contentManifest_v4h';
import { TechAnalysisFamily } from './families/TechAnalysisFamily';
import { SocialProofPostFamily } from './families/SocialProofPostFamily';
import { PhilosophyClashFamily } from './families/PhilosophyClashFamily';
import type {
  NormalizedPhilosophyClashContent,
  NormalizedSocialProofPostContent,
  NormalizedTechAnalysisContent,
} from './familySchemas';
import {
  normalizePhilosophyClashContent,
  normalizeSocialProofPostContent,
  normalizeTechAnalysisContent,
} from './familySchemas';
import type { ShotTheme } from './types';

type ShotKind = Video1v4ShotContent['kind'];
type ShotContentFor<K extends ShotKind> = Extract<Video1v4ShotContent, { kind: K }>;
type PreparedContentFor<K extends ShotKind> =
  K extends 'tech-analysis' ? NormalizedTechAnalysisContent :
  K extends 'social-proof-post' ? NormalizedSocialProofPostContent :
  K extends 'philosophy-clash' ? NormalizedPhilosophyClashContent :
  ShotContentFor<K>;

interface BaseRegistryArgs {
  theme: ShotTheme;
  startFrame: number;
  durationFrames: number;
}

type RegistryArgs<K extends ShotKind> = BaseRegistryArgs & {
  content: ShotContentFor<K>;
};

type PreparedRegistryArgs<K extends ShotKind> = BaseRegistryArgs & {
  content: PreparedContentFor<K>;
};

type ShotRenderer<K extends ShotKind> = (args: PreparedRegistryArgs<K>) => React.ReactElement | null;

type ShotRenderEntry<K extends ShotKind> = {
  prepare?: (content: ShotContentFor<K>) => PreparedContentFor<K>;
  render: ShotRenderer<K>;
};

type ShotRenderRegistry = {
  [K in ShotKind]: ShotRenderEntry<K>;
};

const resolveToneColor = (theme: ShotTheme, tone: ThemeColorToken = 'accent') => {
  switch (tone) {
    case 'secondary':
      return theme.secondaryColor;
    case 'tertiary':
      return theme.tertiaryColor;
    case 'danger':
      return theme.dangerColor;
    case 'accent':
    default:
      return theme.accentColor;
  }
};

export const shotRenderRegistry = {
  opening: {
    render: ({ content, theme }) => (
      <OpeningShot
        mainNumber={content.mainNumber}
        mainNumberLabel={content.mainNumberLabel}
        subtitle={content.subtitle}
        suspenseLine={content.suspenseLine}
        accentColor={resolveToneColor(theme, content.accentTone)}
        bgColor={theme.bgColor}
      />
    ),
  },
  concept: {
    render: ({ content, theme }) => (
      <ConceptBlock
        title={content.title}
        body={content.body}
        highlight={content.highlight}
        accentColor={resolveToneColor(theme, content.accentTone)}
        bgColor={theme.bgColor}
      />
    ),
  },
  'split-comparison': {
    render: ({ content, theme }) => (
      <SplitComparison
        leftTitle={content.leftTitle}
        leftItems={content.leftItems}
        rightTitle={content.rightTitle}
        rightItems={content.rightItems}
        leftColor={resolveToneColor(theme, content.leftTone)}
        rightColor={resolveToneColor(theme, content.rightTone)}
        bgColor={theme.bgColor}
      />
    ),
  },
  'bullet-list': {
    render: ({ content, theme }) => (
      <BulletList
        title={content.title}
        points={content.points}
        iconType={content.iconType}
        accentColor={resolveToneColor(theme, content.accentTone)}
        bgColor={theme.bgColor}
      />
    ),
  },
  'loop-flow': {
    render: ({ content, theme }) => (
      <LoopFlowDiagram
        openLoopSteps={content.openLoopSteps}
        closedLoopSteps={content.closedLoopSteps}
        title={content.title}
        bgColor={theme.bgColor}
      />
    ),
  },
  'skill-tree': {
    render: ({ content, theme }) => (
      <SkillTree
        title={content.title}
        mainNumber={content.mainNumber}
        mainLabel={content.mainLabel}
        subInfo={content.subInfo}
        accentColor={resolveToneColor(theme, content.accentTone)}
        bgColor={theme.bgColor}
        nodes={content.nodes}
      />
    ),
  },
  cta: {
    render: ({ content, theme }) => (
      <CTAEnd
        mainText={content.mainText}
        subText={content.subText}
        ctaText={content.ctaText}
        accentColor={resolveToneColor(theme, content.accentTone)}
        bgColor={theme.bgColor}
      />
    ),
  },
  'tech-analysis': {
    prepare: normalizeTechAnalysisContent,
    render: ({ content, theme, startFrame, durationFrames }) => (
      <TechAnalysisFamily
        startFrame={startFrame}
        durationFrames={durationFrames}
        bgColor={theme.bgColor}
        content={content}
      />
    ),
  },
  'social-proof-post': {
    prepare: normalizeSocialProofPostContent,
    render: ({ content, theme, startFrame, durationFrames }) => (
      <SocialProofPostFamily
        startFrame={startFrame}
        durationFrames={durationFrames}
        bgColor={theme.bgColor}
        content={content}
      />
    ),
  },
  'philosophy-clash': {
    prepare: normalizePhilosophyClashContent,
    render: ({ content, theme, startFrame, durationFrames }) => (
      <PhilosophyClashFamily
        startFrame={startFrame}
        durationFrames={durationFrames}
        bgColor={theme.bgColor}
        content={content}
      />
    ),
  },
} satisfies ShotRenderRegistry;

export const renderShotContent = <K extends ShotKind>(
  args: RegistryArgs<K>,
): React.ReactElement | null => {
  const entry = shotRenderRegistry[args.content.kind] as ShotRenderEntry<K>;
  const preparedContent = entry.prepare
    ? entry.prepare(args.content)
    : (args.content as PreparedContentFor<K>);

  return entry.render({
    ...args,
    content: preparedContent,
  });
};
