import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';

interface PhilosophySplitProps {
  leftTitle: string;
  leftSubtitle: string;
  leftLogo?: string;
  rightTitle: string;
  rightSubtitle: string;
  rightLogo?: string;
  centerIcon?: string;
  ctaText?: string;
  bgColor?: string;
}

export const PhilosophySplit: React.FC<PhilosophySplitProps> = ({
  leftTitle,
  leftSubtitle,
  rightTitle,
  rightSubtitle,
  centerIcon = '✦',
  ctaText = '',
  bgColor = '#0a0a1a',
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: bgColor }}>
      {/* Aurora background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)`,
      }} />

      {/* Split line glow */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 2,
        background: 'linear-gradient(to bottom, transparent, #00d4ff44, transparent)',
        transform: 'translateX(-50%)',
      }} />

      {/* Left side */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '50%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, transparent 100%)',
        opacity: interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{
          fontSize: 80,
          fontWeight: 900,
          color: '#666666',
          letterSpacing: 4,
          textAlign: 'center',
          textShadow: '0 0 30px #33333344',
          lineHeight: 1.2,
          whiteSpace: 'pre',
        }}>
          {leftTitle}
        </div>
        <div style={{
          fontSize: 24,
          color: '#66666688',
          marginTop: 20,
          letterSpacing: 2,
          textAlign: 'center',
        }}>
          {leftSubtitle}
        </div>
      </div>

      {/* Right side */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: '50%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(225deg, #0a2a4a 0%, transparent 100%)',
        opacity: interpolate(frame, [20, 60], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{
          fontSize: 80,
          fontWeight: 900,
          color: '#00d4ff',
          letterSpacing: 4,
          textAlign: 'center',
          textShadow: '0 0 30px #00d4ff88',
          lineHeight: 1.2,
          whiteSpace: 'pre',
        }}>
          {rightTitle}
        </div>
        <div style={{
          fontSize: 24,
          color: '#00d4ff88',
          marginTop: 20,
          letterSpacing: 2,
          textAlign: 'center',
        }}>
          {rightSubtitle}
        </div>
      </div>

      {/* Center icon */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: 48,
        zIndex: 10,
        opacity: interpolate(frame, [30, 70], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#0a0a1a',
          border: '2px solid #00d4ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 30px #00d4ff44',
          animation: 'pulse 2s infinite',
        }}>
          <span style={{ color: '#00d4ff', fontSize: 28 }}>{centerIcon}</span>
        </div>
      </div>

      {/* CTA */}
      {ctaText && (
        <div style={{
          position: 'absolute',
          bottom: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 22,
          color: '#ffffff',
          letterSpacing: 2,
          opacity: interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          {ctaText}
        </div>
      )}
    </AbsoluteFill>
  );
};
