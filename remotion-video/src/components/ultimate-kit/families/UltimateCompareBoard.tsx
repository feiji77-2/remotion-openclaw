import React from 'react';
import {GeometryAccent, TextMaskWipe} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateCompareBoardProps, UltimateSceneGrammar} from '../types';

const normalizeText = (value?: string) => {
  return String(value || '').replace(/\s+/g, ' ').trim();
};

const trimText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
};

const isGenericSideLabel = (value: string) => {
  return /^(对照\s*[AB]|left case|right case)$/i.test(normalizeText(value));
};

const splitComparisonSummary = (value?: string) => {
  const text = normalizeText(value);
  if (!text) {
    return [];
  }
  return text
    .split(/[，,；;]/)
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 2);
};

const splitHeadline = (value: string, maxChars = 8) => {
  const text = normalizeText(value);
  if (!text) {
    return [];
  }

  if (text.length <= maxChars) {
    return [text];
  }

  return [
    text.slice(0, maxChars),
    trimText(text.slice(maxChars), maxChars + 2),
  ];
};

export const UltimateCompareBoard: React.FC<UltimateCompareBoardProps & {grammar?: UltimateSceneGrammar}> = ({
  heading,
  summary,
  leftTitle,
  rightTitle,
  leftEyebrow,
  rightEyebrow,
  rows,
  leftAccent = 'orange',
  rightAccent = 'cyan',
  grammar,
}) => {
  const leftColor = resolveUltimateAccent(leftAccent);
  const rightColor = resolveUltimateAccent(rightAccent);
  const revealDirection = resolveTextRevealDirection(grammar, 'center');
  const firstRow = rows[0];
  const summaryParts = splitComparisonSummary(summary);
  const preferSummarySplit = summaryParts.length === 2 && isGenericSideLabel(leftTitle) && isGenericSideLabel(rightTitle);
  const leftLead = normalizeText(preferSummarySplit ? summaryParts[0] : (firstRow?.left || leftTitle || heading));
  const rightLead = normalizeText(preferSummarySplit ? summaryParts[1] : (firstRow?.right || rightTitle || summary));
  const bottomLabel = trimText(normalizeText(firstRow?.label || summary || heading), 22);
  const leftHeadline = splitHeadline(leftLead, 5);
  const rightHeadline = splitHeadline(rightLead, 12);
  const leftMeta = trimText(normalizeText(leftEyebrow || leftTitle), 18);
  const rightMeta = trimText(normalizeText(rightEyebrow || rightTitle), 18);

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(98deg, ${leftColor}12 0 46%, rgba(7,10,18,0) 46% 54%, ${rightColor}12 54% 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 956,
          top: -32,
          width: 164,
          height: 1190,
          transform: 'rotate(11deg)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
          boxShadow: `0 0 48px ${rightColor}12`,
        }}
      />

      <GeometryAccent variant="slanted-panel" color={leftColor} opacity={0.18} style={{left: 86, top: 174, width: 412, height: 120, transform: 'rotate(-11deg)'}} />
      <GeometryAccent variant="slanted-panel" color={rightColor} opacity={0.18} style={{right: 104, bottom: 172, width: 430, height: 136, transform: 'rotate(9deg)'}} />
      <GeometryAccent variant="arc" color={rightColor} opacity={0.2} style={{left: 764, top: 156, width: 420, height: 160}} />

      <div style={{position: 'absolute', left: 110, top: 82, width: 740}}>
        <div style={{fontSize: 15, letterSpacing: 4.2, textTransform: 'uppercase', color: 'rgba(229,236,255,0.5)'}}>
          split decision
        </div>
        <div style={{position: 'relative', minHeight: 114, marginTop: 18}}>
          <TextMaskWipe
            text={heading}
            direction={revealDirection}
            accent={rightColor}
            fontSize={82}
            color="#f7fbff"
            fontWeight={900}
            textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.9, letterSpacing: -3}}
          />
        </div>
        {summary ? (
          <div style={{marginTop: 14, maxWidth: 640, fontSize: 24, lineHeight: 1.4, color: 'rgba(229,236,255,0.7)'}}>
            {summary}
          </div>
        ) : null}
      </div>

      <div style={{position: 'absolute', left: 110, top: 296, width: 610}}>
        <div style={{fontSize: 17, letterSpacing: 3, textTransform: 'uppercase', color: leftColor}}>
          {leftMeta || 'short context'}
        </div>
        <div style={{marginTop: 24, fontSize: 126, lineHeight: 0.82, fontWeight: 900, letterSpacing: -8, color: `${leftColor}18`}}>
          {leftTitle}
        </div>
        <div style={{marginTop: -6, display: 'grid', gap: 4}}>
          {leftHeadline.map((line, index) => (
            <div key={`${line}-${index}`} style={{fontSize: index === 0 ? 82 : 76, lineHeight: 0.92, fontWeight: 900, color: '#f7fbff', letterSpacing: -4}}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div style={{position: 'absolute', right: 108, bottom: 190, width: 650, textAlign: 'right'}}>
        <div style={{fontSize: 17, letterSpacing: 3, textTransform: 'uppercase', color: rightColor}}>
          {rightMeta || 'long context'}
        </div>
        <div style={{marginTop: 22, fontSize: 122, lineHeight: 0.82, fontWeight: 900, letterSpacing: -8, color: `${rightColor}18`}}>
          {rightTitle}
        </div>
        <div style={{marginTop: -2, marginLeft: 'auto', display: 'grid', gap: 6, maxWidth: 630}}>
          {rightHeadline.map((line, index) => (
            <div key={`${line}-${index}`} style={{fontSize: index === 0 ? 72 : 66, lineHeight: 0.94, fontWeight: 900, color: '#f7fbff', letterSpacing: -3}}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 648,
          right: 646,
          bottom: 92,
          padding: '24px 28px 28px',
          borderRadius: 28,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(5,8,15,0.72)',
          boxShadow: '0 20px 58px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div style={{fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(229,236,255,0.4)'}}>
          conflict
        </div>
        <div style={{marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18}}>
          <div style={{fontSize: 60, lineHeight: 0.94, fontWeight: 900, color: '#f7fbff', letterSpacing: -3}}>
            {bottomLabel}
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 18,
              background: `${rightColor}18`,
              color: '#f7fbff',
              fontSize: 22,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {trimText(rightLead, 10)}
          </div>
        </div>
      </div>
    </div>
  );
};
