import React from 'react';
import {GeometryAccent, ShockwaveWord, TextMaskWipe} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateQuoteHighlightProps} from '../types';

const extractWord = (quote: string, fallback?: string) => {
  const firstClause = quote.split(/[。！？!?，,：:]/).map((item) => item.trim()).find((item) => item.length > 0);
  return fallback ?? firstClause ?? quote;
};

export const UltimateQuoteHighlight: React.FC<UltimateQuoteHighlightProps> = ({
  heading,
  quote,
  attribution,
  tags = [],
  accent = 'orange',
}) => {
  const color = resolveUltimateAccent(accent);
  const lead = extractWord(quote, tags[0]?.label);
  return (
    <div style={{display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100%', gap: 24}}>
      <div>
        {heading ? (
          <div style={{position: 'relative', minHeight: 40}}>
            <TextMaskWipe
              text={heading}
              direction="right"
              accent={color}
              fontSize={24}
              color={color}
              fontWeight={700}
              textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', letterSpacing: 4, textTransform: 'uppercase'}}
            />
          </div>
        ) : null}
      </div>
      <div style={{position: 'relative', minHeight: 560}}>
        <GeometryAccent variant="arc" color={color} opacity={0.28} style={{left: 300, top: 42, width: 420, height: 180}} />
        <GeometryAccent variant="ring" color={color} opacity={0.14} style={{left: '50%', top: '54%', width: 600, height: 600, transform: 'translate(-50%, -50%)'}} />
        <ShockwaveWord word={lead} caption={quote} color={color} maxWidth={960} />
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24}}>
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
          {tags.slice(0, 4).map((tag) => (
            <div key={tag.label} style={{paddingBottom: 6, borderBottom: `1px solid ${color}66`, color: '#f7fbff', fontSize: 17}}>
              {tag.label}
            </div>
          ))}
        </div>
        {attribution ? <div style={{fontSize: 20, color: 'rgba(229,236,255,0.58)'}}>{attribution}</div> : null}
      </div>
    </div>
  );
};
