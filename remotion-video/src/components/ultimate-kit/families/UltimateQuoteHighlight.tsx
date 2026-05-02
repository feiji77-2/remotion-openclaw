import React from 'react';
import {GeometryAccent, TextMaskWipe} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateQuoteHighlightProps, UltimateSceneGrammar} from '../types';

const normalizeText = (value?: string) => {
  return String(value || '').replace(/\s+/g, ' ').trim();
};

const splitLead = (value: string, maxChars = 9) => {
  const text = normalizeText(value);
  if (!text) {
    return [];
  }
  if (text.length <= maxChars) {
    return [text];
  }
  return [
    text.slice(0, maxChars),
    `${text.slice(maxChars, maxChars * 2).trim()}${text.length > maxChars * 2 ? '…' : ''}`,
  ];
};

const trimText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
};

export const UltimateQuoteHighlight: React.FC<UltimateQuoteHighlightProps & {grammar?: UltimateSceneGrammar}> = ({
  heading,
  quote,
  attribution,
  tags = [],
  accent = 'orange',
  grammar,
}) => {
  const color = resolveUltimateAccent(accent);
  const revealDirection = resolveTextRevealDirection(grammar, 'right');
  const leadLines = splitLead(quote, 8);
  const accentWord = trimText(normalizeText(tags[0]?.label || quote), 10);
  const supportLine = trimText(normalizeText(attribution || tags[1]?.label || heading), 22);
  const footerTags = tags.slice(0, 3).map((tag) => trimText(normalizeText(tag.label), 12)).filter(Boolean);

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      {heading ? (
        <div style={{position: 'absolute', left: 112, top: 90, right: 112, zIndex: 3}}>
          <div style={{position: 'relative', minHeight: 40}}>
            <TextMaskWipe
              text={heading}
              direction={revealDirection}
              accent={color}
              fontSize={24}
              color={color}
              fontWeight={700}
              textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', letterSpacing: 4, textTransform: 'uppercase'}}
            />
          </div>
        </div>
      ) : null}

      <GeometryAccent variant="arc" color={color} opacity={0.3} style={{left: 238, top: 142, width: 520, height: 210}} />
      <GeometryAccent variant="ring" color={color} opacity={0.14} style={{left: '50%', top: '50%', width: 620, height: 620, transform: 'translate(-50%, -50%)'}} />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1180,
          transform: 'translate(-50%, -52%)',
          textAlign: 'center',
        }}
      >
        <div style={{fontSize: 188, lineHeight: 0.78, fontWeight: 900, letterSpacing: -10, color: `${color}14`, textTransform: 'uppercase'}}>
          {accentWord}
        </div>
        <div style={{marginTop: -38, display: 'grid', gap: 6, justifyItems: 'center'}}>
          {leadLines.map((line, index) => (
            <div key={`${line}-${index}`} style={{fontSize: index === 0 ? 108 : 96, lineHeight: 0.88, fontWeight: 900, color: color, letterSpacing: -5, textShadow: `0 0 36px ${color}30`}}>
              {line}
            </div>
          ))}
        </div>
        <div style={{marginTop: 28, fontSize: 28, lineHeight: 1.46, color: 'rgba(229,236,255,0.78)'}}>
          {supportLine}
        </div>
      </div>

      <div style={{position: 'absolute', left: 112, right: 112, bottom: 102, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24}}>
        <div style={{display: 'flex', gap: 14, flexWrap: 'wrap'}}>
          {footerTags.map((tag) => (
            <div key={tag} style={{paddingBottom: 6, borderBottom: `1px solid ${color}66`, color: '#f7fbff', fontSize: 18}}>
              {tag}
            </div>
          ))}
        </div>
        {attribution ? <div style={{fontSize: 22, color: 'rgba(229,236,255,0.54)'}}>{trimText(normalizeText(attribution), 18)}</div> : null}
      </div>
    </div>
  );
};
