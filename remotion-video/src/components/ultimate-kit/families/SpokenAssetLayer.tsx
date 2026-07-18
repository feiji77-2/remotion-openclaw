import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

type SpokenAssetLayerProps = {
  family: string;
  index: number;
  subtitle?: string;
};

const MODEL_LABELS = ['GPT‑5.5', 'OpenAI', 'Agent App', 'Claude', 'Gemini', 'Cursor'];
const CODE_LINES = [
  'const cues = split(audioSegments);',
  'const beats = group(cues, 4.0);',
  'render(<SpokenScene beat={beat} />);',
  'timeline.totalFrames = audio.end;',
  'if (voice.ok) publish(video);',
];

const extractTokens = (text = '') => {
  const modelTokens = text.match(/GPT[-‑]?\d(?:\.\d)?|OpenAI|Claude|Gemini|Cursor|Grok|Token|Agent|AI|API/gi) ?? [];
  const numberTokens = text.match(/[+-]?\d+(?:\.\d+)?%?|百万|万|亿/g) ?? [];
  return [...new Set([...modelTokens, ...numberTokens])].slice(0, 5);
};

const panelBase: React.CSSProperties = {
  position: 'absolute',
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(10,15,28,0.72), rgba(4,7,14,0.48))',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: '0 20px 54px rgba(0,0,0,0.28)',
};

const ModelTagStrip: React.FC<{tokens: string[]; side: 'top' | 'mid'}> = ({tokens, side}) => {
  const frame = useCurrentFrame();
  const labels = tokens.length > 0 ? tokens : MODEL_LABELS.slice(0, 5);
  const y = interpolate(frame, [0, 24], [-16, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const opacity = interpolate(frame, [0, 20], [0, 0.92], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{
      position: 'absolute',
      top: side === 'top' ? 94 : 154,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: 14,
      opacity,
      transform: `translateY(${y}px)`,
    }}>
      {labels.map((label, labelIndex) => (
        <div key={`${label}-${labelIndex}`} style={{
          padding: '9px 15px',
          borderRadius: 999,
          background: labelIndex % 2 === 0 ? 'rgba(0,245,255,0.12)' : 'rgba(255,212,59,0.10)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: labelIndex % 2 === 0 ? 'rgba(0,245,255,0.88)' : 'rgba(255,212,59,0.82)',
          fontSize: 15,
          fontWeight: 900,
          letterSpacing: 0.2,
        }}>
          {label}
        </div>
      ))}
    </div>
  );
};

const CodeSidePanel: React.FC<{align: 'left' | 'right'; text?: string}> = ({align, text}) => {
  const frame = useCurrentFrame();
  const sideOffset = interpolate(frame, [0, 24], [align === 'left' ? -26 : 26, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(frame, [0, 24], [0, 0.62], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const source = (text ? [`// ${text.slice(0, 28)}`, ...CODE_LINES] : CODE_LINES).slice(0, 5);
  return (
    <div style={{
      ...panelBase,
      top: 208,
      [align]: 76,
      width: 352,
      padding: '20px 22px',
      opacity,
      transform: `translateX(${sideOffset}px)`,
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
    }}>
      {source.map((line, lineIndex) => {
        const chars = Math.floor(interpolate(frame, [8 + lineIndex * 5, 34 + lineIndex * 5], [0, line.length], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }));
        return (
          <div key={`${line}-${lineIndex}`} style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: lineIndex === 0 ? 'rgba(0,245,255,0.62)' : 'rgba(226,232,240,0.36)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}>
            <span style={{color: 'rgba(148,163,184,0.38)', marginRight: 10}}>
              {String(lineIndex + 1).padStart(2, '0')}
            </span>
            {line.slice(0, chars)}
          </div>
        );
      })}
    </div>
  );
};

const FloatingMetricPair: React.FC<{text?: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [4, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tokens = extractTokens(text);
  const left = tokens.find((token) => /%|\d/.test(token)) ?? '+70%';
  const right = tokens.find((token) => token !== left) ?? '-80%';
  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 250,
      display: 'flex',
      justifyContent: 'center',
      gap: 90,
      opacity: reveal * 0.92,
      transform: `translateY(${(1 - reveal) * 22}px)`,
      pointerEvents: 'none',
    }}>
      {[
        {value: left, label: '效率提升', color: '#10ff8a'},
        {value: right, label: '开销节省', color: '#ffd43b'},
      ].map((item) => (
        <div key={item.label} style={{textAlign: 'center'}}>
          <div style={{
            fontSize: 82,
            lineHeight: 0.9,
            fontWeight: 950,
            letterSpacing: -4,
            color: item.color,
            textShadow: `0 0 24px ${item.color}77`,
          }}>
            {item.value}
          </div>
          <div style={{
            marginTop: 12,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: 6,
            color: 'rgba(226,232,240,0.48)',
          }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

const ModelLogoGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = interpolate(frame, [fps * 0.1, fps * 0.7], [0, 0.86], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      top: 260,
      width: 720,
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 16,
      opacity,
      transform: 'translateX(-50%)',
    }}>
      {MODEL_LABELS.map((label, index) => (
        <div key={label} style={{
          padding: '13px 22px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: index % 2 === 0 ? 'rgba(0,245,255,0.88)' : 'rgba(255,255,255,0.72)',
          fontSize: 20,
          fontWeight: 900,
          boxShadow: index === 0 ? '0 0 24px rgba(0,245,255,0.18)' : 'none',
        }}>
          {label}
        </div>
      ))}
    </div>
  );
};

export const SpokenAssetLayer: React.FC<SpokenAssetLayerProps> = ({family, index, subtitle}) => {
  const tokens = extractTokens(subtitle);
  const showMetricPair = family === 'spoken-metric' || family === 'spoken-ranking';
  const showLogoGrid = family === 'spoken-tags' || /模型|平台|OpenAI|Claude|Gemini|Cursor|Grok/i.test(subtitle ?? '');
  const showCodePanel = family === 'spoken-code' || family === 'spoken-process' || index % 3 === 1;

  return (
    <>
      <ModelTagStrip tokens={tokens} side={showMetricPair ? 'top' : 'mid'} />
      {showCodePanel ? <CodeSidePanel align={index % 2 === 0 ? 'left' : 'right'} text={subtitle} /> : null}
      {showMetricPair ? <FloatingMetricPair text={subtitle} /> : null}
      {showLogoGrid ? <ModelLogoGrid /> : null}
    </>
  );
};
