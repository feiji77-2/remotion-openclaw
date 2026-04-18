/**
 * ShotRenderer.tsx — 分镜组件映射
 *
 * 根据 shotType 将 ShotPlan.componentProps 映射到具体的 Remotion 组件
 */

import React from 'react';
import { TitleCard } from '../components/TitleCard';
import { ConceptBlock } from '../components/ConceptBlock';
import { FlowChart } from '../components/FlowChart';
import { TerminalShow } from '../components/TerminalShow';
import { SceneGrid } from '../components/SceneGrid';
import { CountUp } from '../components/CountUp';
import { DialogBlock } from '../components/DialogBlock';
import { BulletList } from '../components/BulletList';
import { WordCloud } from '../components/WordCloud';
import { CTAEnd } from '../components/CTAEnd';
import { ShotPlan } from './contentSchema';

export function renderShot(shot: ShotPlan): React.ReactElement {
  const props = shot.componentProps as Record<string, unknown>;

  switch (shot.shotType) {
    case 'title':
      return (
        <TitleCard
          title={(props.title as string) ?? ''}
          subtitle={props.subtitle as string | undefined}
          accentWord={props.accentWord as string | undefined}
          bgColor={(props.bgColor as string) ?? '#0D0D1A'}
          duration={shot.durationFrames}
        />
      );

    case 'concept':
      return (
        <ConceptBlock
          title={(props.title as string) ?? ''}
          body={(props.body as string) ?? ''}
          highlight={props.highlight as string | undefined}
          accentColor={(props.accentColor as string) ?? '#FF6B35'}
          bgColor={(props.bgColor as string) ?? '#0D0D1A'}
        />
      );

    case 'flowchart':
      return (
        <FlowChart
          steps={(props.steps as { label: string; icon?: string; desc?: string }[]) ?? []}
          accentColor={(props.accentColor as string) ?? '#FF6B35'}
          bgColor={(props.bgColor as string) ?? '#0D0D1A'}
        />
      );

    case 'terminal':
      return (
        <TerminalShow
          title={(props.title as string) ?? 'video-gen'}
          code={(props.code as string) ?? ''}
          outputLines={(props.outputLines as string[]) ?? []}
          prompt={(props.prompt as string) ?? '>>>'}
          accentColor={(props.accentColor as string) ?? '#FF6B35'}
        />
      );

    case 'scenegrid':
      return (
        <SceneGrid
          items={(props.items as string[]) ?? []}
          cols={(props.cols as number) ?? 5}
          rows={(props.rows as number) ?? 5}
          accentColor={(props.accentColor as string) ?? '#FF6B35'}
          bgColor={(props.bgColor as string) ?? '#0D0D1A'}
        />
      );

    case 'countup':
      return (
        <CountUp
          value={(props.value as number) ?? 0}
          label={(props.label as string) ?? ''}
          suffix={(props.suffix as string) ?? ''}
          prefix={(props.prefix as string) ?? ''}
          accentColor={(props.accentColor as string) ?? '#FF6B35'}
          bgColor={(props.bgColor as string) ?? '#0D0D1A'}
        />
      );

    case 'dialog':
      return (
        <DialogBlock
          messages={(props.messages as { role: 'user' | 'assistant'; content: string }[]) ?? []}
          bgColor={(props.bgColor as string) ?? '#0D0D1A'}
          userColor={(props.userColor as string) ?? '#FF6B35'}
          assistantColor={(props.assistantColor as string) ?? '#00BCD4'}
        />
      );

    case 'bullets':
      return (
        <BulletList
          title={(props.title as string) ?? ''}
          points={(props.points as string[]) ?? []}
          iconType={(props.iconType as 'check' | 'arrow' | 'number' | 'dot') ?? 'check'}
          accentColor={(props.accentColor as string) ?? '#FF6B35'}
          bgColor={(props.bgColor as string) ?? '#0D0D1A'}
        />
      );

    case 'wordcloud':
      return (
        <WordCloud
          words={(props.words as { text: string; weight: number; color?: string }[]) ?? []}
          accentColor={(props.accentColor as string) ?? '#FF6B35'}
          bgColor={(props.bgColor as string) ?? '#0D0D1A'}
        />
      );

    case 'cta':
      return (
        <CTAEnd
          mainText={(props.mainText as string) ?? ''}
          subText={(props.subText as string) ?? ''}
          ctaText={(props.ctaText as string) ?? '开始使用 →'}
          accentColor={(props.accentColor as string) ?? '#FF6B35'}
          bgColor={(props.bgColor as string) ?? '#0D0D1A'}
        />
      );

    default:
      return (
        <div style={{ width: '100%', height: '100%', background: '#0D0D1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#FFFFFF', fontSize: 48 }}>{shot.shotType}</span>
        </div>
      );
  }
}
