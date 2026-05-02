import React from 'react';
import {GeometryAccent, TextMaskWipe} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateGlossaryTermProps, UltimateSceneGrammar} from '../types';

export const UltimateGlossaryTerm: React.FC<UltimateGlossaryTermProps & {grammar?: UltimateSceneGrammar}> = ({
  heading,
  term,
  pronunciation,
  definition,
  related = [],
  accent = 'cyan',
  grammar,
}) => {
  const color = resolveUltimateAccent(accent);
  const relatedItems = related.slice(0, 5);
  const revealDirection = resolveTextRevealDirection(grammar, 'center');

  return (
    <div style={{position: 'relative', height: '100%', overflow: 'hidden'}}>
      <GeometryAccent
        variant="slanted-panel"
        color={color}
        opacity={0.14}
        style={{left: 52, top: 42, width: 320, height: 106, transform: 'rotate(-8deg)'}}
      />
      <GeometryAccent
        variant="arc"
        color={color}
        opacity={0.18}
        style={{right: 80, top: 86, width: 320, height: 140}}
      />
      <GeometryAccent
        variant="ring"
        color={color}
        opacity={0.1}
        style={{right: 120, bottom: 40, width: 220, height: 220}}
      />

      <div style={{display: 'grid', gridTemplateColumns: '1.02fr 0.98fr', gap: 34, height: '100%', alignItems: 'stretch'}}>
        <div style={{display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 22}}>
          <div style={{display: 'grid', gap: 14}}>
            <div style={{fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color}}>{heading}</div>
            <div style={{position: 'relative', minHeight: 116}}>
              <TextMaskWipe
                text={term}
                direction={revealDirection}
                accent={color}
                fontSize={94}
                color="#f7fbff"
                fontWeight={900}
                textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.92, letterSpacing: -3}}
              />
            </div>
            {pronunciation ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  width: 'fit-content',
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: `1px solid ${color}2a`,
                  background: `${color}10`,
                  fontSize: 17,
                  letterSpacing: 1.8,
                  color: `${color}dd`,
                  fontFamily: 'JetBrains Mono, Menlo, monospace',
                }}
              >
                IPA
                <span style={{color: '#f7fbff'}}>{pronunciation}</span>
              </div>
            ) : null}
          </div>

          <div
            style={{
              borderRadius: 34,
              border: `1px solid ${color}1f`,
              background: 'linear-gradient(180deg, rgba(8,12,20,0.9) 0%, rgba(6,9,16,0.98) 100%)',
              padding: '24px 24px 22px',
              boxShadow: `0 0 32px ${color}10`,
            }}
          >
            <div style={{fontSize: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: `${color}cc`}}>definition</div>
            <div style={{marginTop: 16, fontSize: 30, lineHeight: 1.42, color: 'rgba(229,236,255,0.78)'}}>
              {definition}
            </div>
          </div>

          <div
            style={{
              borderRadius: 32,
              border: `1px solid ${color}18`,
              background: 'linear-gradient(180deg, rgba(8,12,20,0.82) 0%, rgba(6,9,16,0.98) 100%)',
              padding: '22px 22px 20px',
              display: 'grid',
              gap: 14,
              alignContent: 'start',
            }}
          >
            <div style={{fontSize: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(229,236,255,0.46)'}}>
              related signals
            </div>
            {relatedItems.length > 0 ? (
              relatedItems.map((item, index) => {
                const itemColor = resolveUltimateAccent(item.accent ?? accent);
                return (
                  <div
                    key={item.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '26px minmax(0, 1fr)',
                      gap: 12,
                      alignItems: 'start',
                      paddingTop: index === 0 ? 0 : 4,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        border: `1px solid ${itemColor}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        lineHeight: 1,
                        color: `${itemColor}cc`,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div
                      style={{
                        paddingBottom: 12,
                        borderBottom: index === relatedItems.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div style={{fontSize: 20, lineHeight: 1.18, color: '#f7fbff'}}>{item.label}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{fontSize: 18, lineHeight: 1.4, color: 'rgba(229,236,255,0.58)'}}>No related terms</div>
            )}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            minHeight: 0,
            borderRadius: 40,
            border: `1px solid ${color}18`,
            background: 'linear-gradient(180deg, rgba(8,12,20,0.92) 0%, rgba(6,9,16,0.99) 100%)',
            padding: '26px 26px 24px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: -52,
              top: 84,
              width: 190,
              height: 310,
              borderRadius: 999,
              background: `radial-gradient(circle at 20% 20%, ${color}16, transparent 68%)`,
              filter: 'blur(8px)',
            }}
          />
          <div style={{fontSize: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(229,236,255,0.46)'}}>
            term specimen
          </div>

          <div
            style={{
              marginTop: 24,
              position: 'relative',
              minHeight: 520,
              borderRadius: 34,
              border: `1px solid ${color}18`,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 42,
                top: 42,
                right: 42,
                bottom: 42,
                borderRadius: 28,
                border: `1px dashed ${color}22`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 270,
                height: 270,
                transform: 'translate(-50%, -50%)',
                borderRadius: 36,
                border: `1px solid ${color}2a`,
                background: `radial-gradient(circle at 34% 30%, rgba(255,255,255,0.16), ${color}20 28%, rgba(8,10,18,0.96) 76%)`,
                boxShadow: `0 0 34px ${color}16`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '26px 24px',
              }}
            >
              <div>
                <div style={{fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc`}}>label</div>
                <div style={{marginTop: 14, fontSize: 46, lineHeight: 0.94, fontWeight: 860, color: '#f7fbff'}}>
                  {term}
                </div>
                {pronunciation ? (
                  <div style={{marginTop: 14, fontSize: 15, letterSpacing: 1.6, color: 'rgba(229,236,255,0.62)', fontFamily: 'JetBrains Mono, Menlo, monospace'}}>
                    {pronunciation}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 64,
                top: 86,
                display: 'grid',
                gap: 10,
                maxWidth: 190,
              }}
            >
              <div style={{fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: `${color}cc`}}>context</div>
              <div style={{fontSize: 18, lineHeight: 1.34, color: 'rgba(229,236,255,0.68)'}}>
                Core naming layer in the current video grammar.
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 58,
                top: 120,
                width: 160,
                borderTop: `1px solid ${color}38`,
                transform: 'rotate(-16deg)',
                transformOrigin: 'right center',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 58,
                top: 110,
                fontSize: 12,
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                color: `${color}cc`,
              }}
            >
              phonetics
            </div>

            <div
              style={{
                position: 'absolute',
                left: 80,
                bottom: 114,
                width: 160,
                borderTop: `1px solid ${color}38`,
                transform: 'rotate(18deg)',
                transformOrigin: 'left center',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 64,
                bottom: 86,
                maxWidth: 180,
                fontSize: 12,
                lineHeight: 1.4,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: 'rgba(229,236,255,0.56)',
              }}
            >
              related terms render as archive notes instead of orbital labels.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
