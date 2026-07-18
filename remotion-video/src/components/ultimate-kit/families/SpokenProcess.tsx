/**
 * SpokenProcess — 口播步骤（横向步骤条）
 *
 * 步骤编号 + 标签 + 连线，无卡片无背景
 * 适配 spoken-process family
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SpokenCenterStage, SpokenGlassPanel, getAccentColor} from './SpokenVisualKit';

interface SpokenProcessStep {
  label: string;
  detail?: string;
  accent?: string;
}

interface SpokenProcessProps {
  /** 步骤列表（取自 beat.payload.steps） */
  steps: SpokenProcessStep[];
  accent?: string;
  grammar?: unknown;
}

export const SpokenProcess: React.FC<SpokenProcessProps> = ({
  steps,
  accent = 'purple',
}) => {
  const frame = useCurrentFrame();
  const color = getAccentColor(accent);
  const safeSteps = (steps?.length ? steps : [{label: '换一个工具'}]).slice(0, 5);

  return (
    <SpokenCenterStage compact>
      <SpokenGlassPanel width={980} padding="34px 40px">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {safeSteps.map((step, i) => {
          const delay = 8 + i * 14;
          const reveal = spring({
            fps: 30,
            frame: Math.max(0, frame - delay),
            config: {damping: 200, stiffness: 120},
          });
          const opacity = interpolate(reveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const y = interpolate(reveal, [0, 1], [30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div style={{
                  width: 42,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${color}88, transparent)`,
                  flexShrink: 0,
                  marginBottom: 38,
                }} />
              )}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity,
                transform: `translateY(${y}px)`,
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: `${color}18`,
                  border: `1px solid ${color}aa`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 950,
                  color,
                  boxShadow: `0 0 24px ${color}44`,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: '#ffffff',
                  marginTop: 14,
                  textAlign: 'center',
                  maxWidth: 132,
                  lineHeight: 1.1,
                }}>
                  {step.label}
                </div>
                {step.detail && (
                  <div style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 6,
                    textAlign: 'center',
                    maxWidth: 120,
                  }}>
                    {step.detail}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      </SpokenGlassPanel>
    </SpokenCenterStage>
  );
};
