import React from 'react';
import { useCurrentFrame } from 'remotion';
import {GeometryAccent, ReticleLockOn, ParticleBackground} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateCtaPanelProps, UltimateSceneGrammar} from '../types';
import { useTextSlideIn, usePulseAttention } from '../motionGrammar';

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

export const UltimateCtaPanel: React.FC<UltimateCtaPanelProps & {grammar?: UltimateSceneGrammar}> = ({
  heading,
  subtitle,
  searchLabel,
  badge,
  highlights = [],
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

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <ParticleBackground color={`${color}18`} particleCount={28} speed={0.6} seed={2} />
      <GeometryAccent variant="ring" color={color} opacity={0.16} style={{left: '50%', top: '48%', width: 680, height: 680, transform: 'translate(-50%, -50%)'}} />
      <GeometryAccent variant="slanted-panel" color={color} opacity={0.12} style={{left: 298, top: 108, width: 412, height: 168, transform: 'rotate(-12deg)'}} />

      <div style={{position: 'absolute', top: 92, left: 106, right: 106, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: 16, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(229,236,255,0.5)'}}>
          {badge ? trimText(normalizeText(badge), 18) : 'final call'}
        </div>
        <div style={{fontSize: 18, color: color, letterSpacing: 1.8}}>
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
        <div style={{fontSize: 78, lineHeight: 0.92, fontWeight: 900, color: '#f7fbff', textAlign: 'center', letterSpacing: -3, ...headingSlideIn}}>
          {title}
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 18,
              background: `${color}22`,
              color: '#f7fbff',
              fontSize: 24,
              fontWeight: 800,
              ...pulseAttention,
            }}
          >
            {trimText(kicker, 10)}
          </div>
          <div style={{fontSize: 28, lineHeight: 1.3, color: 'rgba(229,236,255,0.8)'}}>
            {trimText(footer, 22)}
          </div>
        </div>
      </div>
    </div>
  );
};
