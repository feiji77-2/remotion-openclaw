import React from 'react';
import {CodeTraceSweep, GeometryAccent, TextMaskWipe} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateCodePanelProps} from '../types';

export const UltimateCodePanel: React.FC<UltimateCodePanelProps> = ({
  heading,
  filename,
  lines,
  highlightLine,
  footer,
  accent = 'cyan',
}) => {
  const color = resolveUltimateAccent(accent);
  return (
    <div style={{display: 'grid', gridTemplateColumns: '0.44fr 1.56fr', gap: 28, height: '100%', alignItems: 'center'}}>
      <div style={{display: 'grid', gap: 16, alignSelf: 'stretch', justifyContent: 'center'}}>
        <div style={{fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', color}}>trace flow</div>
        <div style={{position: 'relative', minHeight: 120}}>
          <TextMaskWipe
            text={heading}
            direction="left"
            accent={color}
            fontSize={78}
            color="#f7fbff"
            fontWeight={900}
            textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.95, letterSpacing: -2}}
          />
        </div>
        {filename ? <div style={{fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc`, fontFamily: 'JetBrains Mono, Menlo, monospace'}}>{filename}</div> : null}
        <div style={{display: 'grid', gap: 10}}>
          {lines.slice(0, 4).map((line, index) => (
            <div key={`${line.text}-${index}`} style={{display: 'flex', gap: 12, alignItems: 'center'}}>
              <div style={{width: 30, height: 1, background: `linear-gradient(90deg, ${color}, transparent)`}} />
              <div style={{fontSize: 18, lineHeight: 1.28, color: line.tone === 'accent' ? color : 'rgba(229,236,255,0.7)'}}>{line.text}</div>
            </div>
          ))}
        </div>
        {footer ? <div style={{fontSize: 20, lineHeight: 1.42, color: 'rgba(229,236,255,0.68)'}}>{footer}</div> : null}
      </div>
      <div style={{position: 'relative', minHeight: 560}}>
        <GeometryAccent variant="slanted-panel" color={color} opacity={0.12} style={{left: 16, top: 24, width: 260, height: 140, transform: 'rotate(-8deg)'}} />
        <GeometryAccent variant="arc" color={color} opacity={0.24} style={{right: 20, bottom: 24, width: 280, height: 140}} />
        <div style={{transform: 'rotate(-1.4deg)'}}>
          <CodeTraceSweep
            lines={lines.map((line) => line.text)}
            highlightLine={highlightLine}
            color={color}
            filename={filename}
            mode="code"
            focusToken={lines[highlightLine ? highlightLine - 1 : 0]?.text?.trim().split(/\s+/)[0]}
          />
        </div>
      </div>
    </div>
  );
};
