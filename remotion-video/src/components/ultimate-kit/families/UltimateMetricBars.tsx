import React from 'react';
import {useCurrentFrame} from 'remotion';
import {GeometryAccent, RadialGauge, TextMaskWipe} from '../../visual-atoms';
import {iconMaskStyle, SemanticIconGlyph} from '../SemanticIcon';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent} from '../tokens';
import { useStaggerSlide, useScaleEmphasis } from '../motionGrammar';
import type {UltimateMetricBarsProps, UltimateSceneGrammar, FamilyDirectorMeta} from '../types';
import {glassPanelStyle} from '../containerStyles';


const MetricIcon: React.FC<{
  iconValue?: string;
  semanticText: string;
  color: string;
  size: number;
  fallbackIndex?: number;
}> = (props) => {
  return (
    <SemanticIconGlyph
      iconValue={props.iconValue}
      semanticText={props.semanticText}
      color={props.color}
      size={props.size}
      fallbackIndex={props.fallbackIndex}
      family="metrics"
      silentFail
    />
  );
};

export const UltimateMetricBars: React.FC<UltimateMetricBarsProps & {grammar?: UltimateSceneGrammar; directorMeta?: FamilyDirectorMeta}> = ({
  heading,
  summary,
  items,
  grammar,
  directorMeta,
}) => {
  const frame = useCurrentFrame();
  const adaptive = directorMeta?.adaptive;
  const contrastSize = adaptive?.contrast.sizeRatio ?? 1;
  const densitySpacing = adaptive?.density.spacing ?? 1;
  const densityPadding = adaptive?.density.padding ?? 1;
  const primary = items[0];
  const leadColor = resolveUltimateAccent(primary?.accent ?? 'cyan');
  const visibleItems = items.slice(0, 6);
  const gaugeItems = visibleItems.slice(0, 3);
  const stripItems = visibleItems.slice(0, 5);
  const revealDirection = resolveTextRevealDirection(grammar, 'left');

  return (
    <div style={{position: 'relative', height: '100%', overflow: 'hidden'}}>
      <GeometryAccent
        variant="slanted-panel"
        color={leadColor}
        opacity={0.14}
        style={{left: 48, top: 44, width: 320, height: 108, transform: 'rotate(-8deg)'}}
      />
      <GeometryAccent
        variant="ring"
        color={leadColor}
        opacity={0.12}
        style={{right: 120, top: 56, width: 220, height: 220}}
      />
      <GeometryAccent
        variant="arc"
        color={resolveUltimateAccent('purple')}
        opacity={0.18}
        style={{right: 52, bottom: 28, width: 340, height: 150, transform: 'rotate(6deg)'}}
      />

      <div style={{display: 'grid', gridTemplateRows: 'auto 1fr', gap: Math.round(30 * densitySpacing), height: '100%'}}>
        <div style={{display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: Math.round(30 * densitySpacing), alignItems: 'end'}}>
          <div style={{display: 'grid', gap: Math.round(14 * densitySpacing)}}>
          <div style={glassPanelStyle(leadColor, {density: adaptive?.density}, {radius: 'lg'})}>
            <div style={{fontSize: Math.round(18 * contrastSize), letterSpacing: 4, textTransform: 'uppercase', color: leadColor}}>signal console</div>
            <div style={{position: 'relative', minHeight: 120}}>
              <TextMaskWipe
                text={heading}
                direction={revealDirection}
                accent={leadColor}
                fontSize={Math.round(76 * contrastSize)}
                color="#f7fbff"
                fontWeight={900}
                textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.95, letterSpacing: -2}}
              />
            </div>
            {summary ? (
              <div style={{maxWidth: 720, fontSize: Math.round(22 * contrastSize), lineHeight: 1.42, color: 'rgba(229,236,255,0.74)'}}>
                {summary}
              </div>
            ) : null}
            </div>
          </div>

          <div
            style={{
              justifySelf: 'end',
              width: 360,
              padding: `${Math.round(22 * densityPadding)}px ${Math.round(24 * densityPadding)}px ${Math.round(24 * densityPadding)}px`,
              borderRadius: 30,
              border: `1px solid ${leadColor}1f`,
              background: 'linear-gradient(180deg, rgba(8,12,20,0.88) 0%, rgba(6,9,16,0.98) 100%)',
              boxShadow: `0 0 34px ${leadColor}12`,
            }}
          >
            <div style={{fontSize: Math.round(14 * contrastSize), letterSpacing: 2.2, textTransform: 'uppercase', color: `${leadColor}cc`}}>primary reading</div>
            <div style={{marginTop: Math.round(18 * densitySpacing), display: 'grid', gridTemplateColumns: '1fr auto', gap: Math.round(16 * densitySpacing), alignItems: 'end'}}>
              <div>
                <div style={{fontSize: Math.round(32 * contrastSize), lineHeight: 1.06, fontWeight: 820, color: '#f7fbff'}}>
                  {primary?.label ?? heading}
                </div>
                <div style={{marginTop: Math.round(10 * densitySpacing), fontSize: Math.round(14 * contrastSize), lineHeight: 1.3, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(229,236,255,0.5)'}}>
                  live signal
                </div>
              </div>
              <div style={{fontSize: Math.round(52 * contrastSize), lineHeight: 0.9, fontWeight: 860, color: leadColor}}>
                {primary?.value ?? '--'}
              </div>
            </div>
            <div style={{marginTop: Math.round(18 * densitySpacing), height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden'}}>
              <div
                style={{
                  width: `${Math.max(8, Math.min(100, (primary?.ratio ?? 0.5) * 100))}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${leadColor}, rgba(255,255,255,0.92))`,
                }}
              />
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1.06fr 0.94fr', gap: Math.round(30 * densitySpacing), minHeight: 0}}>
          <div
            style={{
              display: 'grid',
              gridTemplateRows: 'auto 1fr',
              gap: Math.round(24 * densitySpacing),
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: Math.round(18 * densitySpacing),
              }}
            >
              {gaugeItems.map((item, index) => {
                const color = resolveUltimateAccent(item.accent ?? (index === 0 ? 'cyan' : index === 1 ? 'orange' : 'purple'));
                return (
                  <div
                    key={`${item.label}-gauge`}
                    style={{
                      padding: `${Math.round(18 * densityPadding)}px ${Math.round(16 * densityPadding)}px ${Math.round(16 * densityPadding)}px`,
                      borderRadius: 28,
                      border: `1px solid ${color}1f`,
                      background: `linear-gradient(180deg, ${color}10 0%, rgba(8,10,18,0.94) 100%)`,
                      display: 'grid',
                      gap: Math.round(16 * densitySpacing),
                      justifyItems: 'center',
                    }}
                  >
                    <div style={{fontSize: Math.round(13 * contrastSize), letterSpacing: 1.8, textTransform: 'uppercase', color: `${color}cc`}}>
                      node 0{index + 1}
                    </div>
                    <RadialGauge
                      progress={Math.max(0.08, Math.min(1, item.ratio))}
                      color={color}
                      size={162}
                      strokeWidth={12}
                      valueLabel={item.value}
                      subtitle={item.label}
                    />
                  </div>
                );
              })}
            </div>

            <div
              style={{
                borderRadius: 34,
                border: `1px solid ${leadColor}18`,
                background: 'linear-gradient(180deg, rgba(8,12,20,0.88) 0%, rgba(6,9,16,0.98) 100%)',
                padding: `${Math.round(22 * densityPadding)}px ${Math.round(22 * densityPadding)}px ${Math.round(20 * densityPadding)}px`,
                display: 'grid',
                gap: Math.round(16 * densitySpacing),
                alignContent: 'start',
              }}
            >
              <div style={{display: 'flex', justifyContent: 'space-between', gap: Math.round(16 * densitySpacing), alignItems: 'center'}}>
                <div style={{fontSize: Math.round(14 * contrastSize), letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(229,236,255,0.46)'}}>
                  channel load
                </div>
                <div style={{fontSize: Math.round(14 * contrastSize), letterSpacing: 2, textTransform: 'uppercase', color: `${leadColor}cc`}}>
                  bars / thresholds
                </div>
              </div>

              {stripItems.map((item, index) => {
                const color = resolveUltimateAccent(item.accent ?? (index % 2 === 0 ? 'cyan' : 'orange'));
                const staggerSlide = useStaggerSlide(frame, index, 4, 'left', 20);
                const scaleEmphasis = useScaleEmphasis(frame, index * 4 + 8);
                return (
                  <div
                    key={item.label}
                    style={{
                      display: 'grid',
                      gap: Math.round(10 * densitySpacing),
                      padding: `${Math.round(14 * densityPadding)}px 0 ${Math.round(16 * densityPadding)}px`,
                      borderBottom: index === stripItems.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      opacity: staggerSlide.opacity,
                      transform: staggerSlide.transform,
                    }}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', gap: Math.round(16 * densitySpacing), fontSize: Math.round(20 * contrastSize), alignItems: 'baseline'}}>
                      <span style={{color: '#f7fbff'}}>{item.label}</span>
                      <span style={{color, opacity: scaleEmphasis.opacity, transform: scaleEmphasis.transform, display: 'inline-block'}}>{item.value}</span>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: Math.round(14 * densitySpacing), alignItems: 'center'}}>
                      <div style={{height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden'}}>
                        <div
                          style={{
                            width: `${Math.max(6, Math.min(100, item.ratio * 100))}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.94))`,
                          }}
                        />
                      </div>
                      <div style={{fontSize: Math.round(12 * contrastSize), letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc`, opacity: scaleEmphasis.opacity, transform: scaleEmphasis.transform, display: 'inline-block'}}>
                        {Math.round(item.ratio * 100)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              borderRadius: 36,
              border: `1px solid ${leadColor}18`,
              background: 'linear-gradient(180deg, rgba(8,12,20,0.9) 0%, rgba(6,9,16,0.98) 100%)',
              padding: `${Math.round(24 * densityPadding)}px ${Math.round(24 * densityPadding)}px ${Math.round(22 * densityPadding)}px`,
              display: 'grid',
              gridTemplateRows: 'auto auto 1fr',
              gap: Math.round(18 * densitySpacing),
              minHeight: 0,
            }}
          >
            <div style={{fontSize: Math.round(14 * contrastSize), letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(229,236,255,0.46)'}}>
              diagnostics wall
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: Math.round(14 * densitySpacing),
              }}
            >
              {stripItems.slice(0, 4).map((item, index) => {
                const color = resolveUltimateAccent(item.accent ?? (index === 0 ? 'cyan' : index === 1 ? 'orange' : 'purple'));
                return (
                  <div
                    key={`${item.label}-chip`}
                    style={{
                      borderRadius: 22,
                      border: `1px solid ${color}1e`,
                      background: `linear-gradient(180deg, ${color}10 0%, rgba(8,10,18,0.84) 100%)`,
                      padding: `${Math.round(16 * densityPadding)}px ${Math.round(14 * densityPadding)}px ${Math.round(14 * densityPadding)}px`,
                      display: 'grid',
                      gap: Math.round(10 * densitySpacing),
                    }}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', gap: Math.round(10 * densitySpacing), alignItems: 'center'}}>
                      <div style={{fontSize: Math.round(12 * contrastSize), letterSpacing: 1.8, textTransform: 'uppercase', color: `${color}cc`}}>
                        probe 0{index + 1}
                      </div>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 10,
                          border: `1px solid ${color}22`,
                          background: `${color}12`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MetricIcon
                          iconValue={item.icon}
                          semanticText={`${item.label} ${item.value}`}
                          color={color}
                          size={14}
                          fallbackIndex={index}
                        />
                      </div>
                    </div>
                    <div style={{fontSize: Math.round(22 * contrastSize), lineHeight: 1.06, fontWeight: 760, color: '#f7fbff'}}>
                      {item.label}
                    </div>
                    <div style={{fontSize: Math.round(18 * contrastSize), lineHeight: 1.1, color}}>
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                borderRadius: 26,
                border: `1px solid ${leadColor}16`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                padding: `${Math.round(18 * densityPadding)}px ${Math.round(18 * densityPadding)}px ${Math.round(16 * densityPadding)}px`,
                display: 'grid',
                gap: Math.round(12 * densitySpacing),
                alignContent: 'start',
              }}
            >
              <div style={{fontSize: Math.round(14 * contrastSize), letterSpacing: 2, textTransform: 'uppercase', color: `${leadColor}cc`}}>
                operator feed
              </div>
              {stripItems.map((item, index) => (
                <div
                  key={`${item.label}-feed`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '26px 28px minmax(0, 1fr)',
                    gap: Math.round(10 * densitySpacing),
                    alignItems: 'start',
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: `1px solid ${leadColor}2a`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: Math.round(11 * contrastSize),
                      lineHeight: 1,
                      color: `${leadColor}cc`,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      border: `1px solid ${leadColor}22`,
                      background: `${leadColor}10`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MetricIcon
                      iconValue={item.icon}
                      semanticText={`${item.label} ${item.value}`}
                      color={resolveUltimateAccent(item.accent ?? 'cyan')}
                      size={14}
                      fallbackIndex={index}
                    />
                  </div>
                  <div style={{fontSize: Math.round(16 * contrastSize), lineHeight: 1.34, color: 'rgba(229,236,255,0.68)'}}>
                    <span style={{color: '#f7fbff'}}>{item.label}</span>
                    {'  '}
                    <span style={{color: resolveUltimateAccent(item.accent ?? 'cyan')}}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
