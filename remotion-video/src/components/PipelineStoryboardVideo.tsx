import React, {useMemo} from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {ACCENT_GOLD, ACCENT_PURPLE, BG_COLOR} from '../data/storyboard';
import type {RenderShotProps, VideoProps} from '../Root';

const normalizeStaticAssetPath = (src: string) => src.replace(/^\/+/, '').replace(/^public\//, '');

const resolveImageSource = (src?: string | null) => {
  if (!src || !src.trim()) {
    return null;
  }
  return /^https?:\/\//.test(src) ? src : staticFile(normalizeStaticAssetPath(src));
};

const buildShotBadges = (shot: RenderShotProps) => {
  return [
    shot.visualFocusZh,
    shot.mood,
    ...(Array.isArray(shot.keywords) ? shot.keywords : []).slice(0, 2),
    ...(Array.isArray(shot.dataPoints) ? shot.dataPoints : []).slice(0, 1),
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 4);
};

const FallbackVisual: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(frame, [0, 45], [0.88, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background:
          `radial-gradient(circle at 20% 20%, ${accent}33 0%, transparent 30%),
           radial-gradient(circle at 80% 75%, #f59e0b22 0%, transparent 32%),
           linear-gradient(180deg, #100918 0%, #09070d 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '12% 14%',
          borderRadius: 40,
          border: `1.5px solid ${accent}66`,
          transform: `scale(${pulse})`,
          boxShadow: `0 0 80px ${accent}22 inset`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '12%',
          top: '20%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: `${accent}22`,
          filter: 'blur(10px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '10%',
          bottom: '18%',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: '#f59e0b1d',
          filter: 'blur(12px)',
        }}
      />
    </AbsoluteFill>
  );
};

const ShotFrame: React.FC<{
  shot: RenderShotProps;
  index: number;
  total: number;
  template: VideoProps['template'];
}> = ({shot, index, total, template}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const mediaSrc = resolveImageSource(shot.imageUrl);
  const badges = buildShotBadges(shot);
  const accent = shot.style?.includes('warm') ? '#f59e0b' : shot.style?.includes('cool') ? '#06b6d4' : ACCENT_PURPLE;
  const title = String(shot.title || `镜头 ${index + 1}`).trim();
  const summary = String(shot.visualSummaryZh || shot.promptZh || shot.narration || '').trim();
  const focus = String(shot.visualFocusZh || shot.comparisonSummaryZh || '').trim();

  const heroProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 18,
      stiffness: 110,
      mass: 0.9,
    },
  });
  const imageScale = interpolate(frame, [0, 90], [1.02, 1.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (template === 'split') {
    return (
      <AbsoluteFill style={{backgroundColor: BG_COLOR, flexDirection: 'row'}}>
        <div
          style={{
            width: width * 0.44,
            padding: '108px 64px 92px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background:
              'linear-gradient(180deg, rgba(9,7,13,0.98) 0%, rgba(13,9,21,0.92) 100%)',
            borderRight: `1px solid ${accent}33`,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 999,
                padding: '10px 16px',
                background: `${accent}22`,
                color: '#fff',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              镜头 {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 68,
                lineHeight: 1.12,
                fontWeight: 800,
                color: '#fff',
                transform: `translateY(${(1 - heroProgress) * 28}px)`,
                opacity: heroProgress,
              }}
            >
              {title}
            </div>
            {summary ? (
              <div
                style={{
                  marginTop: 24,
                  fontSize: 28,
                  lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.8)',
                  opacity: 0.94,
                }}
              >
                {summary}
              </div>
            ) : null}
          </div>

          <div style={{display: 'grid', gap: 16}}>
            {focus ? (
              <div
                style={{
                  borderRadius: 24,
                  padding: '20px 22px',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${accent}33`,
                  color: ACCENT_GOLD,
                  fontSize: 24,
                  lineHeight: 1.55,
                  fontWeight: 700,
                }}
              >
                视觉重点：{focus}
              </div>
            ) : null}
            {badges.length > 0 ? (
              <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                {badges.map((badge) => (
                  <div
                    key={badge}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 999,
                      background: `${accent}22`,
                      color: '#fff',
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {badge}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{flex: 1, position: 'relative', overflow: 'hidden'}}>
          {mediaSrc ? (
            <Img
              src={mediaSrc}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${imageScale})`,
              }}
            />
          ) : (
            <FallbackVisual accent={accent} />
          )}
          <AbsoluteFill
            style={{
              background:
                'linear-gradient(90deg, rgba(9,7,13,0.18) 0%, rgba(9,7,13,0.08) 22%, rgba(9,7,13,0.38) 100%)',
            }}
          />
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{backgroundColor: BG_COLOR}}>
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
        {mediaSrc ? (
          <Img
            src={mediaSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${imageScale})`,
            }}
          />
        ) : (
          <FallbackVisual accent={accent} />
        )}
      </div>

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(9,7,13,0.12) 0%, rgba(9,7,13,0.28) 30%, rgba(9,7,13,0.78) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 72,
          left: 56,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          borderRadius: 999,
          padding: '12px 18px',
          background: 'rgba(9,7,13,0.45)',
          border: `1px solid ${accent}44`,
          color: '#fff',
          fontSize: 22,
          fontWeight: 700,
          backdropFilter: 'blur(14px)',
        }}
      >
        镜头 {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 56,
          right: 56,
          bottom: template === 'fullscreen' ? 160 : 260,
          display: 'grid',
          gap: 20,
          transform: `translateY(${(1 - heroProgress) * 34}px)`,
          opacity: heroProgress,
        }}
      >
        <div
          style={{
            fontSize: template === 'fullscreen' ? 72 : 62,
            lineHeight: 1.12,
            fontWeight: 900,
            color: '#fff',
            textShadow: '0 10px 30px rgba(0,0,0,0.3)',
            maxWidth: width * 0.84,
          }}
        >
          {title}
        </div>

        {summary ? (
          <div
            style={{
              maxWidth: width * 0.72,
              fontSize: 28,
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.84)',
              textShadow: '0 6px 18px rgba(0,0,0,0.25)',
            }}
          >
            {summary}
          </div>
        ) : null}

        {(focus || badges.length > 0) ? (
          <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
            {focus ? (
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: 'rgba(9,7,13,0.45)',
                  border: `1px solid ${ACCENT_GOLD}44`,
                  color: ACCENT_GOLD,
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {focus}
              </div>
            ) : null}
            {badges.map((badge) => (
              <div
                key={badge}
                style={{
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: `${accent}22`,
                  border: `1px solid ${accent}33`,
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {badge}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

export const PipelineStoryboardVideo: React.FC<{
  shots: RenderShotProps[];
  template?: VideoProps['template'];
}> = ({shots, template = 'caption'}) => {
  const {fps} = useVideoConfig();
  const offsets = useMemo(() => {
    let cursor = 0;
    return shots.map((shot) => {
      const current = cursor;
      cursor += Math.max(1, Math.round((Number(shot.durationSeconds) || 5) * fps));
      return current;
    });
  }, [fps, shots]);

  return (
    <AbsoluteFill>
      {shots.map((shot, index) => (
        <Sequence
          key={shot.id || `shot-${index + 1}`}
          from={offsets[index] || 0}
          durationInFrames={Math.max(1, Math.round((Number(shot.durationSeconds) || 5) * fps))}
        >
          <ShotFrame shot={shot} index={index} total={shots.length} template={template} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
