import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CodeTraceSweep, GeometryAccent, TextMaskWipe} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent} from '../tokens';
import {useStaggerSlide} from '../motionGrammar';
import type {FamilyDirectorMeta, UltimateSceneGrammar, UltimateTerminalPanelProps} from '../types';

export const UltimateTerminalPanel: React.FC<UltimateTerminalPanelProps & {grammar?: UltimateSceneGrammar, directorMeta?: FamilyDirectorMeta}> = ({
  heading,
  windowTitle,
  command,
  outputs,
  note,
  accent = 'green',
  grammar,
  directorMeta,
}) => {
  const color = resolveUltimateAccent(accent);
  const frame = useCurrentFrame();
  const visibleOutputs = outputs.slice(0, 5);
  const revealDirection = resolveTextRevealDirection(grammar, 'up');
  const adaptive = directorMeta?.adaptive;
  const sizeScale = adaptive?.contrast.sizeRatio ?? 1;
  const spacingScale = adaptive?.density.spacing ?? 1;
  const statusRows = [
    {label: 'session', value: windowTitle || 'live-shell'},
    {label: 'command', value: command.split(/\s+/)[0] || 'run'},
    {label: 'lines', value: String(visibleOutputs.length).padStart(2, '0')},
  ];

  return (
    <div style={{position: 'relative', height: '100%', overflow: 'hidden'}}>
      <GeometryAccent
        variant="slanted-panel"
        color={color}
        opacity={0.14}
        style={{left: 34, top: 34, width: 340, height: 118, transform: 'rotate(-8deg)'}}
      />
      <GeometryAccent
        variant="ring"
        color={color}
        opacity={0.12}
        style={{right: 124, top: 56, width: 210, height: 210}}
      />
      <GeometryAccent
        variant="arc"
        color={color}
        opacity={0.18}
        style={{right: 54, bottom: 36, width: 340, height: 160, transform: 'rotate(8deg)'}}
      />

      <div style={{display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: Math.round(26 * spacingScale), height: '100%'}}>
        <div style={{display: 'grid', gridTemplateColumns: '1.18fr 0.82fr', gap: Math.round(28 * spacingScale), alignItems: 'end'}}>
          <div style={{display: 'grid', gap: Math.round(14 * spacingScale)}}>
            <div style={{fontSize: Math.round(18 * sizeScale), letterSpacing: 4, textTransform: 'uppercase', color}}>runtime session</div>
            <div style={{position: 'relative', minHeight: 122}}>
              <TextMaskWipe
                text={heading}
                direction={revealDirection}
                accent={color}
                fontSize={Math.round(76 * sizeScale)}
                color="#f7fbff"
                fontWeight={900}
                textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.94, letterSpacing: -2}}
              />
            </div>
          </div>

          <div
            style={{
              justifySelf: 'end',
              width: 360,
              borderRadius: 26,
              border: `1px solid ${color}20`,
              background: 'linear-gradient(180deg, rgba(5,12,18,0.9) 0%, rgba(4,8,14,0.96) 100%)',
              boxShadow: `0 0 36px ${color}14`,
              padding: '18px 18px 16px',
              display: 'grid',
              gap: Math.round(12 * spacingScale),
            }}
          >
            {statusRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '88px minmax(0, 1fr)',
                  gap: Math.round(14 * spacingScale),
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: Math.round(13 * sizeScale),
                    lineHeight: 1.2,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    color: `${color}cc`,
                    fontFamily: 'JetBrains Mono, Menlo, monospace',
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    minWidth: 0,
                    fontSize: Math.round(16 * sizeScale),
                    lineHeight: 1.32,
                    color: '#f7fbff',
                    fontFamily: 'JetBrains Mono, Menlo, monospace',
                    wordBreak: 'break-word',
                  }}
                >
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '148px minmax(0, 1fr)',
            gap: Math.round(18 * spacingScale),
            alignItems: 'start',
          }}
        >
          <div
            style={{
              fontSize: Math.round(14 * sizeScale),
              lineHeight: 1.2,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: `${color}cc`,
              fontFamily: 'JetBrains Mono, Menlo, monospace',
              paddingTop: 6,
            }}
          >
            command
          </div>
          <div
            style={{
              fontSize: Math.round(24 * sizeScale),
              lineHeight: 1.34,
              color: '#f7fbff',
              fontFamily: 'JetBrains Mono, Menlo, monospace',
              wordBreak: 'break-word',
            }}
          >
            <span style={{color}}>$</span> {command}
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1.42fr 0.58fr', gap: Math.round(28 * spacingScale), minHeight: 0}}>
          <div style={{position: 'relative', minHeight: 560}}>
            <div style={{transform: 'rotate(-0.4deg)', height: '100%'}}>
              <CodeTraceSweep
                lines={[`$ ${command}`, ...visibleOutputs]}
                highlightLine={2}
                color={color}
                filename={windowTitle}
                mode="terminal"
                focusToken={command.split(/\s+/)[0]}
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: Math.round(18 * spacingScale), minHeight: 0}}>
            <div
              style={{
                borderRadius: 24,
                border: `1px solid ${color}18`,
                background: 'linear-gradient(180deg, rgba(8,12,20,0.84) 0%, rgba(6,9,16,0.96) 100%)',
                padding: '18px 18px 16px',
                display: 'grid',
                gap: Math.round(12 * spacingScale),
              }}
            >
              <div style={{fontSize: Math.round(14 * sizeScale), letterSpacing: 2, textTransform: 'uppercase', color}}>stdout preview</div>
              {visibleOutputs.slice(0, 3).map((line, index) => {
                const lineMotion = useStaggerSlide(frame, index, 3, 'left', 30);
                return (
                  <div key={`${line}-${index}`} style={{display: 'flex', gap: 10, alignItems: 'flex-start', opacity: lineMotion.opacity, transform: lineMotion.transform}}>
                    <div style={{width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 8, flexShrink: 0}} />
                    <div style={{fontSize: Math.round(17 * sizeScale), lineHeight: 1.42, color: 'rgba(229,236,255,0.78)'}}>{line}</div>
                  </div>
                );
              })}
            </div>

            {note ? (
              <div
                style={{
                  borderRadius: 24,
                  border: `1px solid ${color}16`,
                  background: `linear-gradient(180deg, ${color}10 0%, rgba(7,10,16,0.94) 100%)`,
                  padding: '18px 18px 16px',
                }}
              >
                <div style={{fontSize: Math.round(14 * sizeScale), letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc`}}>operator note</div>
                <div style={{marginTop: 10, fontSize: Math.round(18 * sizeScale), lineHeight: 1.46, color: 'rgba(229,236,255,0.72)'}}>{note}</div>
              </div>
            ) : null}

            <div
              style={{
                borderRadius: 24,
                border: `1px solid ${color}14`,
                background: 'linear-gradient(180deg, rgba(6,10,14,0.88) 0%, rgba(5,8,12,0.98) 100%)',
                padding: '18px 18px 16px',
                display: 'grid',
                gap: Math.round(10 * spacingScale),
                alignContent: 'start',
              }}
            >
              <div style={{fontSize: Math.round(14 * sizeScale), letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc`}}>stream map</div>
              {visibleOutputs.slice(0, 5).map((line, index) => {
                const lineMotion = useStaggerSlide(frame, index, 3, 'left', 30);
                return (
                  <div
                    key={`${line}-stream-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '20px minmax(0, 1fr)',
                      gap: Math.round(10 * spacingScale),
                      alignItems: 'start',
                      opacity: lineMotion.opacity,
                      transform: lineMotion.transform,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `1px solid ${color}36`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: Math.round(10 * sizeScale),
                        color: `${color}cc`,
                        fontFamily: 'JetBrains Mono, Menlo, monospace',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{fontSize: Math.round(15 * sizeScale), lineHeight: 1.36, color: 'rgba(229,236,255,0.62)'}}>{line}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
