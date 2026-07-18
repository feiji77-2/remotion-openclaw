import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CodeTraceSweep, GeometryAccent, TextMaskWipe} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent} from '../tokens';
import {useStaggerSlide} from '../motionGrammar';
import type {UltimateCodePanelProps, UltimateSceneGrammar, FamilyDirectorMeta} from '../types';
import {UltimateHeading} from '../UltimateHeading';
import {glassPanelStyle} from '../containerStyles';

export const UltimateCodePanel: React.FC<UltimateCodePanelProps & {grammar?: UltimateSceneGrammar; directorMeta?: FamilyDirectorMeta}> = ({
  heading,
  filename,
  lines,
  highlightLine,
  footer,
  accent = 'cyan',
  grammar,
  directorMeta,
}) => {
  const color = resolveUltimateAccent(accent);
  const frame = useCurrentFrame();
  const adaptive = directorMeta?.adaptive;
  const sizeScale = adaptive?.contrast.sizeRatio ?? 1;
  const spacingScale = adaptive?.density.spacing ?? 1;
  const codeGap = adaptive ? Math.round(12 * spacingScale) : 12;
  const revealDirection = resolveTextRevealDirection(grammar, 'left');
  const focusToken = lines[highlightLine ? highlightLine - 1 : 0]?.text?.trim().split(/\s+/)[0] || heading;

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          right: 86,
          top: 92,
          fontSize: 176,
          lineHeight: 0.82,
          fontWeight: 900,
          letterSpacing: -10,
          color: `${color}12`,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        TRACE
      </div>

      <div style={{position: 'absolute', left: 112, top: 96, width: 620, zIndex: 3}}>
        <div style={glassPanelStyle(color, {density: adaptive?.density, contrast: adaptive?.contrast}, {radius: 'lg'})}>
          <UltimateHeading
            heading={heading}
            archetype={grammar?.archetype}
            accent={accent}
            grammar={grammar}
            subtitle={filename}
          />
          {footer ? (
            <div style={{marginTop: 22, maxWidth: 540, fontSize: Math.round(24 * sizeScale), lineHeight: 1.42, color: 'rgba(229,236,255,0.68)'}}>
              {footer}
            </div>
          ) : null}
        </div>
      </div>

      <GeometryAccent variant="slanted-panel" color={color} opacity={0.12} style={{left: 860, top: 238, width: 760, height: 360, transform: 'rotate(-8deg)'}} />
      <GeometryAccent variant="arc" color={color} opacity={0.24} style={{right: 30, bottom: 62, width: 340, height: 160}} />

      <div
        style={{
          position: 'absolute',
          left: 708,
          right: 112,
          top: 206,
          bottom: 120,
          transform: 'rotate(-2deg)',
        }}
      >
        <CodeTraceSweep
          lines={lines.map((line) => line.text)}
          highlightLine={highlightLine}
          color={color}
          filename={filename}
          mode="code"
          focusToken={focusToken}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 132,
          bottom: 132,
          right: 980,
          display: 'grid',
          gap: codeGap,
        }}
      >
        {lines.slice(0, 4).map((line, index) => {
          const lineMotion = useStaggerSlide(frame, index, 4, 'right', 20);
          return (
            <div key={`${line.text}-${index}`} style={{display: 'flex', gap: 12, alignItems: 'center', opacity: lineMotion.opacity, transform: lineMotion.transform}}>
              <div style={{width: 36, height: 1, background: `linear-gradient(90deg, ${color}, transparent)`}} />
              <div style={{fontSize: Math.round(20 * sizeScale), lineHeight: 1.28, color: line.tone === 'accent' ? color : 'rgba(229,236,255,0.7)'}}>
                {line.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
