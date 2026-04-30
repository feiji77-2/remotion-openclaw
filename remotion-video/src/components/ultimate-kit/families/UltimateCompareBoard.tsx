import React from 'react';
import {GeometryAccent, SplitAxisClash, TextMaskWipe} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateCompareBoardProps} from '../types';

export const UltimateCompareBoard: React.FC<UltimateCompareBoardProps> = ({
  heading,
  summary,
  leftTitle,
  rightTitle,
  leftEyebrow,
  rightEyebrow,
  rows,
  leftAccent = 'orange',
  rightAccent = 'cyan',
}) => {
  const leftColor = resolveUltimateAccent(leftAccent);
  const rightColor = resolveUltimateAccent(rightAccent);

  return (
    <div style={{display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100%', gap: 24}}>
      <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.46fr)', gap: 24, alignItems: 'end'}}>
        <div style={{display: 'grid', gap: 12}}>
          <div style={{fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(229,236,255,0.56)'}}>compress compare</div>
          <div style={{position: 'relative', minHeight: 124}}>
            <TextMaskWipe
              text={heading}
              direction="center"
              accent={rightColor}
              fontSize={84}
              color="#f7fbff"
              fontWeight={900}
              textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.94, letterSpacing: -2}}
            />
          </div>
        </div>
        {summary ? (
          <div style={{display: 'grid', gap: 10, paddingBottom: 8}}>
            <div style={{width: 92, height: 1, background: `linear-gradient(90deg, ${leftColor}, ${rightColor})`}} />
            <div style={{fontSize: 22, lineHeight: 1.46, color: 'rgba(229,236,255,0.72)'}}>{summary}</div>
          </div>
        ) : null}
      </div>
      <div style={{position: 'relative', minHeight: 540}}>
        <GeometryAccent variant="slanted-panel" color={leftColor} opacity={0.12} style={{left: 40, top: 72, width: 260, height: 140, transform: 'rotate(-6deg)'}} />
        <GeometryAccent variant="slanted-panel" color={rightColor} opacity={0.12} style={{right: 42, bottom: 56, width: 260, height: 150, transform: 'rotate(6deg)'}} />
        <GeometryAccent variant="arc" color={rightColor} opacity={0.2} style={{left: 760, top: 20, width: 300, height: 150}} />
        <SplitAxisClash
          leftTitle={leftTitle}
          rightTitle={rightTitle}
          leftColor={leftColor}
          rightColor={rightColor}
          collisionLabel={heading}
          thresholdLabel={summary}
          leftNodes={rows.map((row) => ({label: row.label, value: row.left}))}
          rightNodes={rows.map((row) => ({label: row.label, value: row.right}))}
        />
        {leftEyebrow ? <div style={{position: 'absolute', left: 90, top: 44, color: leftColor, fontSize: 18, letterSpacing: 2.8, textTransform: 'uppercase'}}>{leftEyebrow}</div> : null}
        {rightEyebrow ? <div style={{position: 'absolute', right: 90, top: 44, color: rightColor, fontSize: 18, letterSpacing: 2.8, textTransform: 'uppercase'}}>{rightEyebrow}</div> : null}
      </div>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, rows.length))}, minmax(0, 1fr))`, gap: 16}}>
        {rows.slice(0, 4).map((row, index) => (
          <div
            key={row.label}
            style={{
              padding: '18px 20px',
              clipPath: 'polygon(0% 16%, 93% 0%, 100% 84%, 7% 100%)',
              background: `linear-gradient(135deg, ${index % 2 === 0 ? `${leftColor}18` : `${rightColor}18`} 0%, rgba(8,12,20,0.26) 72%)`,
              border: '1px solid rgba(255,255,255,0.08)',
              transform: `rotate(${index % 2 === 0 ? -1.25 : 1.25}deg)`,
            }}
          >
            <div style={{fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(229,236,255,0.46)', marginBottom: 8}}>{row.label}</div>
            <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 20}}>
              <span style={{color: leftColor}}>{row.left}</span>
              <span style={{color: rightColor}}>{row.right}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
