import React from 'react';
import { useCurrentFrame } from 'remotion';
import {GeometryAccent, ReticleLockOn, ParticleBackground, DotGridParallax} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateCtaPanelProps, UltimateSceneGrammar, FamilyDirectorMeta} from '../types';
import { useTextSlideIn, usePulseAttention } from '../motionGrammar';
import {UltimateHeading} from '../UltimateHeading';
import {glassPanelStyle, contentCardStyle} from '../containerStyles';

const normalizeText = (value?: string) => {
  return String(value || '').replace(/\s+/g, ' ').trim();
};

const trimText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
};

const distinctHighlights = (items: string[]) => {
  const seen = new Set();
  return items
    .map((item) => normalizeText(item))
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
};

export const UltimateCtaPanel: React.FC<UltimateCtaPanelProps & {grammar?: UltimateSceneGrammar; directorMeta?: FamilyDirectorMeta}> = ({
  heading,
  subtitle,
  searchLabel,
  badge,
  highlights = [],
  grammar,
  directorMeta,
}) => {
  const color = resolveUltimateAccent('lime');
  const title = normalizeText(heading);
  const subline = normalizeText(subtitle);
  const chips = distinctHighlights(highlights).filter((item) => item !== title && item !== subline).slice(0, 2);
  const kicker = chips[0] || trimText(subline || '告诉我你的真实场景', 16);
  const footer = chips[1] || trimText(searchLabel || subline || title, 18);
  const frame = useCurrentFrame();
  const headingSlideIn = useTextSlideIn(frame, 'up', 6);
  const pulseAttention = usePulseAttention(frame, 30);
  const adaptive = directorMeta?.adaptive;
  const sizeScale = adaptive?.contrast.sizeRatio ?? 1;
  const ctaLabelSize = adaptive ? Math.round(16 * sizeScale) : 16;
  const ctaKickerSize = adaptive ? Math.round(18 * sizeScale) : 18;

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <DotGridParallax dotColor={`${color}18`} density={0.45} dotRadius={2} depth={3} />
      <ParticleBackground color={`${color}14`} particleCount={18} speed={0.3} seed={3} />
      <GeometryAccent variant="ring" color={color} opacity={0.16} style={{left: '50%', top: '48%', width: 680, height: 680, transform: 'translate(-50%, -50%)'}} />
      <GeometryAccent variant="slanted-panel" color={color} opacity={0.12} style={{left: 298, top: 108, width: 412, height: 168, transform: 'rotate(-12deg)'}} />

      <div style={{...contentCardStyle(color, {density: adaptive?.density}), position: 'absolute', top: 92, left: 106, right: 106, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: ctaLabelSize, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(229,236,255,0.5)'}}>
          {badge ? trimText(normalizeText(badge), 18) : 'final call'}
        </div>
        <div style={{fontSize: ctaKickerSize, color: color, letterSpacing: 1.8}}>
          {trimText(kicker, 18)}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '46%',
          width: 720,
          height: 520,
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ReticleLockOn target={trimText(title, 16)} caption={trimText(subline || kicker, 20)} color={color} size={620} showBeam />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 210,
          right: 210,
          bottom: 116,
          display: 'grid',
          gap: 14,
          justifyItems: 'center',
        }}
      >
        <div style={glassPanelStyle(resolveUltimateAccent('orange'), {density: adaptive?.density, contrast: adaptive?.contrast}, {radius: 'xl'})}>
          <UltimateHeading
            heading={title || heading}
            archetype={grammar?.archetype}
            accent={'orange'}
            grammar={grammar}
            subtitle={subtitle}
            style={{textAlign: 'center'}}
          />
        </div>
      </div>
    </div>
  );
};
