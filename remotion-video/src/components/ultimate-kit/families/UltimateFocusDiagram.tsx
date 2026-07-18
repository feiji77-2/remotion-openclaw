import React from 'react';
import { useCurrentFrame } from 'remotion';
import {GeometryAccent, ReticleLockOn, TextMaskWipe} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateFocusDiagramProps, UltimateSceneGrammar, FamilyDirectorMeta} from '../types';
import { useTextSlideIn, useScaleEmphasis } from '../motionGrammar';
import {glassPanelStyle} from '../containerStyles';

export const UltimateFocusDiagram: React.FC<UltimateFocusDiagramProps & {grammar?: UltimateSceneGrammar; directorMeta?: FamilyDirectorMeta}> = ({
  eyebrow,
  keyword,
  question,
  description,
  accent = 'cyan',
  grammar,
  directorMeta,
}) => {
  const color = resolveUltimateAccent(accent);
  const revealDirection = resolveTextRevealDirection(grammar, 'left');
  const frame = useCurrentFrame();
  const keywordSlideIn = useTextSlideIn(frame, 'left', 6);
  const scaleEmphasis = useScaleEmphasis(frame, 12);
  const adaptive = directorMeta?.adaptive;
  const sizeScale = adaptive?.contrast.sizeRatio ?? 1;
  const spacingScale = adaptive?.density.spacing ?? 1;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '0.38fr 1.62fr',
        height: '100%',
        alignItems: 'center',
        gap: Math.round(8 * spacingScale),
      }}
    >
      <div style={{...glassPanelStyle(color, {density: adaptive?.density, contrast: adaptive?.contrast}, {radius: 'lg'}), display: 'grid', gap: Math.round(16 * spacingScale), maxWidth: 420, alignSelf: 'center'}}>
        {eyebrow ? <div style={{fontSize: Math.round(16 * sizeScale), letterSpacing: 4, textTransform: 'uppercase', color}}>{eyebrow}</div> : null}
        {question ? (
          <div style={{position: 'relative', minHeight: 172}}>
            <TextMaskWipe
              text={question}
              direction={revealDirection}
              accent={color}
              fontSize={Math.round(58 * sizeScale)}
              color="#f7fbff"
              fontWeight={860}
              textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.98, letterSpacing: -1.6}}
            />
          </div>
        ) : null}
        {description ? <div style={{fontSize: Math.round(22 * sizeScale), lineHeight: 1.5, color: 'rgba(229,236,255,0.68)', ...scaleEmphasis}}>{description}</div> : null}
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{width: 56, height: 1, background: `linear-gradient(90deg, ${color} 0%, ${color}00 100%)`}} />
          <div style={{fontSize: Math.round(13 * sizeScale), letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc`}}>Primary subject locked</div>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          height: '100%',
          minHeight: 760,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GeometryAccent variant="ring" color={color} opacity={0.18} style={{left: '50%', top: '50%', width: 620, height: 620, transform: 'translate(-50%, -50%)'}} />
        <GeometryAccent variant="arc" color={color} opacity={0.24} style={{left: 170, top: 104, width: 340, height: 140}} />
        <div
          style={{
            position: 'absolute',
            top: 96,
            left: 62,
            padding: '10px 16px',
            borderRadius: 18,
            border: `1px solid ${color}44`,
            background: 'rgba(7,10,18,0.62)',
            color: '#f7fbff',
            fontSize: Math.round(13 * sizeScale),
            letterSpacing: 2,
            textTransform: 'uppercase',
            boxShadow: `0 0 24px ${color}18`,
          }}
        >
          Focus target
        </div>
        <div style={keywordSlideIn}>
          <ReticleLockOn target={keyword} caption="primary subject" color={color} size={760} showBeam />
        </div>
      </div>
    </div>
  );
};
