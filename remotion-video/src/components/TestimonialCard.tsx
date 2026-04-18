import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';

interface TestimonialCardProps {
  quote: string;
  source: string;
  tags?: { label: string; color?: string }[];
  bgColor?: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  source = 'Reddit',
  tags = [],
  bgColor = '#0a0a1a',
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: bgColor, justifyContent: 'center', alignItems: 'center' }}>
      {/* Star dust background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: 2,
              height: 2,
              borderRadius: '50%',
              background: '#ffffff',
              opacity: interpolate(frame, [i * 5, i * 5 + 60], [0.1, 0.4], { extrapolateRight: 'clamp' }),
            }}
          />
        ))}
      </div>

      {/* Main card */}
      <div style={{
        width: 800,
        background: 'rgba(0, 212, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: 20,
        padding: '50px 60px',
        boxShadow: '0 0 60px rgba(0, 212, 255, 0.1)',
        transform: `scale(${interpolate(frame, [0, 30], [0.8, 1], { extrapolateRight: "clamp" })})`,
        opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {/* Quote mark */}
        <div style={{
          fontSize: 120,
          color: '#00d4ff',
          lineHeight: 0.5,
          marginBottom: 20,
          fontFamily: 'Georgia, serif',
          opacity: 0.6,
        }}>
          "
        </div>

        {/* Quote text */}
        <div style={{
          fontSize: 34,
          color: '#ffffff',
          lineHeight: 1.6,
          fontWeight: 400,
          letterSpacing: 1,
          marginBottom: 30,
        }}>
          {quote}
        </div>

        {/* Source */}
        <div style={{
          fontSize: 20,
          color: '#00d4ff88',
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}>
          — {source}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap' }}>
            {tags.map((tag, i) => (
              <div
                key={i}
                style={{
                  background: `${tag.color || '#00d4ff'}22`,
                  border: `1px solid ${tag.color || '#00d4ff'}66`,
                  borderRadius: 100,
                  padding: '6px 18px',
                  opacity: interpolate(frame, [20 + i * 10, 40 + i * 10], [0, 1], { extrapolateRight: "clamp" }),
                }}
              >
                <span style={{
                  color: tag.color || '#00d4ff',
                  fontSize: 18,
                  fontWeight: 600,
                }}>
                  {tag.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Source badge */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        right: 40,
        fontSize: 16,
        color: '#ffffff44',
        letterSpacing: 1,
      }}>
        用户真实反馈
      </div>
    </AbsoluteFill>
  );
};
