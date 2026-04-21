import React from 'react';
import {Sequence} from 'remotion';
import {
  UltimateArchitectureMap,
  UltimateCodePanel,
  UltimateCompareBoard,
  UltimateCtaPanel,
  UltimateEvidenceWall,
  UltimateFeatureCardRail,
  UltimateFocusDiagram,
  UltimateHeroPanel,
  UltimateMetricBars,
  UltimateNumberStrip,
  UltimatePlatformOverlay,
  UltimateStage,
  UltimateStepFlow,
  UltimateSubtitleBar,
  UltimateTagMatrix,
  UltimateTerminalPanel,
  UltimateTimeline,
} from '../components/ultimate-kit';

export const ULTIMATE_ELEMENTS_LIBRARY_DURATION = 1146;

export const UltimateElementsLibrary: React.FC = () => {
  return (
    <>
      <Sequence from={0} durationInFrames={90}>
        <UltimateStage warm>
          <UltimatePlatformOverlay
            brand="SceneLab"
            account="@ultimate-kit"
            searchLabel="Browse reusable elements"
            watermark="Library"
          />
          <UltimateHeroPanel
            kicker="1920x1080 ultimate kit"
            title="One Library. Infinite Scenes."
            subtitle="A combined language for short explainers, long walkthroughs, cards, diagrams, code windows, matrices, bars, and CTA screens."
            badge="code-driven motion system"
            accent="orange"
            avatarLabel="UX"
          />
          <UltimateSubtitleBar text="Hero cover / opener" />
        </UltimateStage>
      </Sequence>

      <Sequence from={90} durationInFrames={90}>
        <UltimateStage>
          <UltimatePlatformOverlay brand="SceneLab" account="@ultimate-kit" searchLabel="Feature rail" watermark="Library" />
          <UltimateFeatureCardRail
            kicker="core primitives"
            heading="Card Rails + Connectors"
            items={[
              {title: 'Subject', eyebrow: 'slot a', caption: 'entity, person, object, or actor placeholder', icon: 'S', accent: 'green'},
              {title: 'Framing', eyebrow: 'slot b', caption: 'camera distance, crop, or amount of detail shown', icon: 'F', accent: 'cyan'},
              {title: 'Action', eyebrow: 'slot c', caption: 'movement, state change, or intent placeholder', icon: 'A', accent: 'yellow'},
              {title: 'Context', eyebrow: 'slot d', caption: 'environment, domain, scene, or supporting clue', icon: 'C', accent: 'red'},
            ]}
          />
          <UltimateSubtitleBar text="Feature rail / card sequence" />
        </UltimateStage>
      </Sequence>

      <Sequence from={180} durationInFrames={90}>
        <UltimateStage>
          <UltimatePlatformOverlay brand="SceneLab" account="@ultimate-kit" searchLabel="Focus board" watermark="Library" />
          <UltimateFocusDiagram
            eyebrow="focus board"
            keyword="Framing"
            question="How much should the frame hold?"
            description="Swap the keyword, helper line, and diagram mode to create tutorial beats, definition screens, or concept explainers."
            accent="cyan"
            diagram="framing"
          />
          <UltimateSubtitleBar text="Focus board / definition screen" />
        </UltimateStage>
      </Sequence>

      <Sequence from={270} durationInFrames={72}>
        <UltimateStage>
          <UltimateNumberStrip
            count="31"
            heading="Reusable Blocks"
            items={[
              {label: 'hero'},
              {label: 'focus'},
              {label: 'cards'},
              {label: 'steps'},
              {label: 'tags'},
              {label: 'code'},
              {label: 'metrics'},
              {label: 'cta'},
            ]}
            accent="green"
          />
          <UltimateSubtitleBar text="Number strip / option row" />
        </UltimateStage>
      </Sequence>

      <Sequence from={342} durationInFrames={84}>
        <UltimateStage>
          <UltimateStepFlow
            heading="Narrative Flow with Step Nodes"
            steps={[
              {label: 'Input', detail: 'copy, prompt, or outline enters the system', icon: '1', accent: 'cyan'},
              {label: 'Voice', detail: 'timing, TTS, or captions can attach here', icon: '2', accent: 'green'},
              {label: 'Visual', detail: 'scene family selects the right visual module', icon: '3', accent: 'yellow'},
              {label: 'Render', detail: 'animation frames and assets resolve automatically', icon: '4', accent: 'orange'},
              {label: 'Publish', detail: 'final packages branch into platform outputs', icon: '5', accent: 'purple'},
            ]}
          />
          <UltimateSubtitleBar text="Step flow / process screen" />
        </UltimateStage>
      </Sequence>

      <Sequence from={426} durationInFrames={84}>
        <UltimateStage>
          <UltimatePlatformOverlay brand="SceneLab" account="@ultimate-kit" searchLabel="Terminal panel" watermark="Library" />
          <UltimateTerminalPanel
            heading="Terminal Window Module"
            windowTitle="render-runtime"
            command="pnpm render:scene-kit --profile ultimate-1080p"
            outputs={[
              '> loading scene families',
              '> compiling motion graph',
              '> binding subtitles and overlays',
              '> render complete in 00:08',
            ]}
            note="Use this block for commands, logs, worker output, or pseudo-terminal storytelling."
            accent="green"
          />
          <UltimateSubtitleBar text="Terminal window / log playback" />
        </UltimateStage>
      </Sequence>

      <Sequence from={510} durationInFrames={84}>
        <UltimateStage>
          <UltimateTagMatrix
            heading="Tag Matrix + Filter Tabs"
            tabs={['narration', 'visual', 'motion', 'cta']}
            activeTab="visual"
            items={[
              {label: 'hero', accent: 'orange'},
              {label: 'cards', accent: 'cyan'},
              {label: 'focus', accent: 'green'},
              {label: 'diagram', accent: 'yellow'},
              {label: 'steps', accent: 'purple'},
              {label: 'terminal', accent: 'cyan'},
              {label: 'code', accent: 'green'},
              {label: 'metrics', accent: 'yellow'},
              {label: 'compare', accent: 'orange'},
              {label: 'closing', accent: 'purple'},
            ]}
          />
          <UltimateSubtitleBar text="Tag matrix / module picker" />
        </UltimateStage>
      </Sequence>

      <Sequence from={594} durationInFrames={72}>
        <UltimateStage>
          <UltimateCodePanel
            heading="Code Window Module"
            filename="ultimate-scene.tsx"
            lines={[
              {text: '{', tone: 'base'},
              {text: '  "family": "feature-rail",', tone: 'accent'},
              {text: '  "headline": "input.headline",', tone: 'base'},
              {text: '  "items": ["subject", "framing"],', tone: 'base'},
              {text: '  "subtitle": "input.subtitle"', tone: 'muted'},
              {text: '}', tone: 'base'},
            ]}
            highlightLine={2}
            footer="Use for code snippets, JSON schemas, or declarative scene setup."
            accent="purple"
          />
          <UltimateSubtitleBar text="Code window / schema block" />
        </UltimateStage>
      </Sequence>

      <Sequence from={666} durationInFrames={72}>
        <UltimateStage>
          <UltimateMetricBars
            heading="Metric Bars + Result View"
            layout="bars"
            items={[
              {label: 'preview', value: '1.4s', ratio: 0.92, accent: 'cyan'},
              {label: 'quality', value: '1080p', ratio: 0.84, accent: 'green'},
              {label: 'export', value: '3 cuts', ratio: 0.66, accent: 'yellow'},
            ]}
          />
          <UltimateSubtitleBar text="Metric bars / results screen" />
        </UltimateStage>
      </Sequence>

      <Sequence from={738} durationInFrames={84}>
        <UltimateStage>
          <UltimateTimeline
            heading="Timeline Beats for Releases"
            summary="Use this family for launch chronology, roadmap checkpoints, release cadence, and daily global AI update timelines."
            items={[
              {label: 'Apr 16', title: 'Model teaser lands', detail: 'Open-source signal starts spreading across communities.', accent: 'cyan'},
              {label: 'Apr 18', title: 'Benchmarks circulate', detail: 'SWE-Bench Pro and HLE mentions start framing the narrative.', accent: 'green'},
              {label: 'Apr 20', title: 'Workflow demos appear', detail: 'Developers begin sharing long-run coding and multi-agent tests.', accent: 'yellow'},
              {label: 'Apr 22', title: 'Mainstream breakout', detail: 'The story becomes: open source is now pressuring closed leaders.', accent: 'orange'},
            ]}
            accent="cyan"
          />
          <UltimateSubtitleBar text="Timeline / release chronology / roadmap screen" />
        </UltimateStage>
      </Sequence>

      <Sequence from={822} durationInFrames={84}>
        <UltimateStage>
          <UltimateCompareBoard
            heading="Compare Board for A/B Claims"
            summary="Unlike number-strip, this one is for structured side-by-side comparison when you need two clear columns."
            leftTitle="Old Workflow"
            rightTitle="K2.6 Workflow"
            leftEyebrow="before"
            rightEyebrow="after"
            rows={[
              {label: 'delivery', left: '2 days / module', right: '1 day / module', accent: 'yellow'},
              {label: 'parallelism', left: 'single-threaded', right: 'tests + deploy + coding', accent: 'orange'},
              {label: 'quality', left: 'context breaks often', right: 'long-run stability', accent: 'green'},
            ]}
            leftAccent="red"
            rightAccent="green"
          />
          <UltimateSubtitleBar text="Compare board / structured A-B scene" />
        </UltimateStage>
      </Sequence>

      <Sequence from={906} durationInFrames={84}>
        <UltimateStage>
          <UltimateEvidenceWall
            heading="Evidence Wall for Source-Driven Segments"
            summary="Best for proof-heavy tech explainers: sources, benchmark references, official notes, and quote cards."
            cards={[
              {source: 'SWE-Bench Pro', quote: 'Benchmark signal moves into GPT-class territory.', detail: 'Use quote-style cards instead of generic lists.', chips: ['benchmark', 'coding'], accent: 'cyan'},
              {source: 'HLE', quote: 'Humanity’s Last Exam gets pulled into the comparison story.', detail: 'Good for “why this matters now” beats.', chips: ['HLE', 'public'], accent: 'green'},
              {source: 'GitHub', quote: 'Open-source availability changes adoption speed.', detail: 'Great for release notes, repos, and docs citations.', chips: ['repo', 'release'], accent: 'yellow'},
              {source: 'Field Tests', quote: 'Long-run coding and agent orchestration clips back the claim.', detail: 'Use as proof layer, not as CTA.', chips: ['agent', 'workflow'], accent: 'orange'},
            ]}
            accent="yellow"
          />
          <UltimateSubtitleBar text="Evidence wall / proof cards / source board" />
        </UltimateStage>
      </Sequence>

      <Sequence from={990} durationInFrames={84}>
        <UltimateStage>
          <UltimateArchitectureMap
            heading="Architecture Map for Agentic Systems"
            centerTitle="AI Production Core"
            centerDetail="Use this family when the narration is about modules, orchestration, memory, retrieval, or multi-agent topology."
            nodes={[
              {label: 'Search Intake', detail: 'global sources + daily signals', accent: 'cyan'},
              {label: 'Fact Parser', detail: 'claims, dates, benchmarks, citations', accent: 'green'},
              {label: 'Storyboard Planner', detail: 'segment intent -> scene family', accent: 'yellow'},
              {label: 'Voice Layer', detail: 'narration timing + subtitles', accent: 'orange'},
              {label: 'Render Worker', detail: 'Remotion export + packaging', accent: 'purple'},
            ]}
            accent="cyan"
            layout="radial"
          />
          <UltimateSubtitleBar text="Architecture map / system topology / module graph" />
        </UltimateStage>
      </Sequence>

      <Sequence from={1074} durationInFrames={72}>
        <UltimateStage>
          <UltimatePlatformOverlay brand="SceneLab" account="@ultimate-kit" searchLabel="Find your next scene" watermark="Library" />
          <UltimateCtaPanel
            heading="Build the Final 1080p Scene"
            subtitle="This closing panel is also reusable: swap the headline, helper copy, search text, and badge for your own CTA."
            searchLabel="Type your next scene family"
            badge="CTA / search / follow-up block"
          />
          <UltimateSubtitleBar text="Closing CTA / search panel" />
        </UltimateStage>
      </Sequence>
    </>
  );
};

export default UltimateElementsLibrary;
