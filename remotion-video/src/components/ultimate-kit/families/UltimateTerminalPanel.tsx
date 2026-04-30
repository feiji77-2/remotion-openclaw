import React from 'react';
import {CodeTraceSweep, GeometryAccent, TextMaskWipe} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateTerminalPanelProps} from '../types';

export const UltimateTerminalPanel: React.FC<UltimateTerminalPanelProps> = ({
  heading,
  windowTitle,
  command,
  outputs,
  note,
  accent = 'green',
}) => {
  const color = resolveUltimateAccent(accent);
  return (
    <div style={{display: 'grid', gridTemplateColumns: '0.48fr 1.52fr', gap: 28, height: '100%', alignItems: 'center'}}>
      <div style={{display: 'grid', gap: 16, alignSelf: 'stretch'}}>
        <div style={{fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', color}}>command beam</div>
        <div style={{position: 'relative', minHeight: 120}}>
          <TextMaskWipe
            text={heading}
            direction="down"
            accent={color}
            fontSize={78}
            color="#f7fbff"
            fontWeight={900}
            textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.95, letterSpacing: -2}}
          />
        </div>
        <div style={{fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc`, fontFamily: 'JetBrains Mono, Menlo, monospace'}}>$ {command}</div>
        {outputs.slice(0, 3).map((line, index) => (
          <div key={`${line}-${index}`} style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <div style={{width: 26, height: 1, background: `linear-gradient(90deg, ${color}, transparent)`}} />
            <div style={{fontSize: 18, lineHeight: 1.28, color: 'rgba(229,236,255,0.72)'}}>{line}</div>
          </div>
        ))}
        {note ? <div style={{fontSize: 20, lineHeight: 1.42, color: 'rgba(229,236,255,0.68)'}}>{note}</div> : null}
      </div>
      <div style={{position: 'relative', minHeight: 560}}>
        <GeometryAccent variant="slanted-panel" color={color} opacity={0.12} style={{left: 12, top: 36, width: 240, height: 120, transform: 'rotate(-7deg)'}} />
        <GeometryAccent variant="ring" color={color} opacity={0.14} style={{right: 40, bottom: 20, width: 240, height: 240}} />
        <div style={{transform: 'rotate(1deg)'}}>
          <CodeTraceSweep
            lines={[`$ ${command}`, ...outputs]}
            highlightLine={1}
            color={color}
            filename={windowTitle}
            mode="terminal"
            focusToken={command.split(/\s+/)[0]}
          />
        </div>
      </div>
    </div>
  );
};
