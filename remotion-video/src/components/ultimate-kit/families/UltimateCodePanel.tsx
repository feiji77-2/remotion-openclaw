import React from 'react';
import {CodeTraceSweep, GeometryAccent, TextMaskWipe} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateCodePanelProps, UltimateSceneGrammar} from '../types';

export const UltimateCodePanel: React.FC<UltimateCodePanelProps & {grammar?: UltimateSceneGrammar}> = ({
  heading,
  filename,
  lines,
  highlightLine,
  footer,
  accent = 'cyan',
  grammar,
}) => {
  const color = resolveUltimateAccent(accent);
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
        <div style={{fontSize: 16, letterSpacing: 4.4, textTransform: 'uppercase', color}}>
          trace flow
        </div>
        <div style={{position: 'relative', minHeight: 120, marginTop: 16}}>
          <TextMaskWipe
            text={heading}
            direction={revealDirection}
            accent={color}
            fontSize={82}
            color="#f7fbff"
            fontWeight={900}
            textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.94, letterSpacing: -3}}
          />
        </div>
        {filename ? (
          <div style={{marginTop: 10, fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc`, fontFamily: 'JetBrains Mono, Menlo, monospace'}}>
            {filename}
          </div>
        ) : null}
        {footer ? (
          <div style={{marginTop: 22, maxWidth: 540, fontSize: 24, lineHeight: 1.42, color: 'rgba(229,236,255,0.68)'}}>
            {footer}
          </div>
        ) : null}
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
          gap: 12,
        }}
      >
        {lines.slice(0, 4).map((line, index) => (
          <div key={`${line.text}-${index}`} style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <div style={{width: 36, height: 1, background: `linear-gradient(90deg, ${color}, transparent)`}} />
            <div style={{fontSize: 20, lineHeight: 1.28, color: line.tone === 'accent' ? color : 'rgba(229,236,255,0.7)'}}>
              {line.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
