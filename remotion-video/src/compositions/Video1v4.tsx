/**
 * Video1v4.tsx — Hermes vs OpenClaw TikTok风格版 v4
 *
 * 时间合同:
 * - SEGMENTS 从 src/data/segments_meta_v4h.ts 导入（单一真源）
 *
 * 导演合同:
 * - shotDirector_v4h.ts 管理每镜头的图标、特效、overlay 和强调词
 */

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { TechLineChart } from '../components/TechLineChart';
import { TestimonialCard } from '../components/TestimonialCard';
import { PhilosophySplit } from '../components/PhilosophySplit';
import { AnimatedBadge, SlideLowerThird, TagLowerThird } from '../components/LowerThirds';
import { ParticleBackground } from '../components/ParticleBackground';
import WordByWord from '../components/WordByWord';
import { SEGMENTS, TRANSITION_FRAMES } from '../data/segments_meta_v4h';
import { buildCaptionBeatTimeline } from '../render/captionBeats';
import { DEFAULT_DIRECTOR_PRESET_ID, resolveDirectorPreset } from '../render/directorPresets';
import { resolveShotTheme } from '../render/fxPresets';
import { getIconLabel, RenderIcon } from '../render/iconRegistry';
import { renderVideo1v4Shot } from '../render/renderVideo1v4Shot';
import { getShotDirector } from '../render/shotDirector_v4h';
import type {
  AtmosphereStylePreset,
  CaptionStylePreset,
  DirectorPreset,
  DirectorPresetId,
  RenderIconId,
  ShotDirector,
  ShotTheme,
  TitleIconStrategy,
} from '../render/types';

// ===== 交叉淡入淡出包装器 =====
const CrossFadeShot: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const fadeInEnd = TRANSITION_FRAMES;
  const fadeOutStart = frames - TRANSITION_FRAMES;

  const fadeIn = interpolate(frame, [0, fadeInEnd], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [fadeOutStart, frames], [1, 0], { extrapolateRight: 'clamp' });

  const opacity = frame <= fadeInEnd
    ? fadeIn
    : frame >= fadeOutStart
      ? fadeOut
      : 1;

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const SceneAtmosphere: React.FC<{ theme: ShotTheme; preset: AtmosphereStylePreset }> = ({ theme, preset }) => {
  const frame = useCurrentFrame();
  const pulse = 0.55 + ((Math.sin(frame * 0.026) + 1) / 2) * 0.45;
  const gridOffset = (frame * 0.9) % 160;
  const sweepX = ((frame * 2.4) % 1700) - 420;
  const primaryGridOpacity = theme.gridOpacity * 0.45 * preset.gridStrength;
  const secondaryGridOpacity = theme.gridOpacity * 0.18 * preset.gridStrength;
  const particleCount = Math.max(
    0,
    Math.floor(theme.particleCount * 0.45 * preset.particleDensityScale * theme.particleDensityMultiplier),
  );
  const topLightOpacity = 0.22 * preset.topLightStrength;
  const sweepOpacity = 0.24 * preset.sweepStrength;
  const upperCornerOpacity = pulse * 0.38 * preset.cornerGlowStrength;
  const lowerCornerOpacity = pulse * 0.28 * preset.cornerGlowStrength;
  const ambientHaloOpacity = 0.22 * preset.cornerGlowStrength;
  const bottomShadeMid = 0.13 * preset.bottomFadeStrength;
  const bottomShadeEnd = 0.64 * preset.bottomFadeStrength;
  const vignetteOpacity = 0.32 * preset.vignetteStrength;
  const topInsetOpacity = 0.1 * preset.vignetteStrength;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: theme.bgGradient,
          opacity: 0.92,
        }}
      />
      {preset.showGrid ? (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: [
                `linear-gradient(rgba(255,255,255,${primaryGridOpacity}) 1px, transparent 1px)`,
                `linear-gradient(90deg, rgba(255,255,255,${primaryGridOpacity}) 1px, transparent 1px)`,
              ].join(', '),
              backgroundSize: '104px 104px',
              transform: `translateY(${gridOffset * 0.08}px)`,
              opacity: 0.12,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: [
                `linear-gradient(rgba(255,255,255,${secondaryGridOpacity}) 1px, transparent 1px)`,
                `linear-gradient(90deg, rgba(255,255,255,${secondaryGridOpacity}) 1px, transparent 1px)`,
              ].join(', '),
              backgroundSize: '208px 208px',
              transform: `translate(${gridOffset * -0.04}px, ${gridOffset * 0.03}px)`,
              opacity: 0.07,
            }}
          />
        </>
      ) : null}
      {preset.showParticles && particleCount > 0 ? (
        <ParticleBackground
          particleCount={particleCount}
          colors={theme.particleColors}
          speed={0.45 * theme.particleSpeedMultiplier}
          opacityScale={theme.particleOpacityScale}
        />
      ) : null}
      {preset.showTopLight ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 180,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0))',
            opacity: topLightOpacity,
          }}
        />
      ) : null}
      {preset.showSweep ? (
        <div
          style={{
            position: 'absolute',
            inset: '-10% -18%',
            background: `linear-gradient(102deg, transparent 28%, ${theme.accentColor}0d 42%, ${theme.secondaryColor}08 52%, transparent 64%)`,
            transform: `translateX(${sweepX}px) rotate(-7deg)`,
            filter: 'blur(42px)',
            opacity: sweepOpacity,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}
      {preset.showCornerGlow ? (
        <>
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 34,
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.accentColor}16 0%, transparent 72%)`,
              opacity: upperCornerOpacity,
              filter: 'blur(18px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 36,
              bottom: 120,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.secondaryColor}14 0%, transparent 74%)`,
              opacity: lowerCornerOpacity,
              filter: 'blur(24px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.055) 0%, transparent 42%)`,
              opacity: ambientHaloOpacity,
              pointerEvents: 'none',
            }}
          />
        </>
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(4,7,14,0.01) 0%, rgba(4,7,14,0) 50%, rgba(4,7,14,${bottomShadeMid}) 80%, rgba(4,7,14,${bottomShadeEnd}) 100%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 96px rgba(0,0,0,${vignetteOpacity}), inset 0 72px 90px rgba(0,0,0,${topInsetOpacity})`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

const BackgroundMotionOverlay: React.FC<{ theme: ShotTheme; preset: AtmosphereStylePreset }> = ({ theme, preset }) => {
  const frame = useCurrentFrame();
  const driftA = Math.sin(frame * 0.012);
  const driftB = Math.cos(frame * 0.009 + 0.8);
  const driftC = Math.sin(frame * 0.016 + 1.4);
  const driftD = Math.cos(frame * 0.007 + 2.2);
  const glowStrength = Math.max(0.16, preset.cornerGlowStrength);
  const fieldOpacity = 0.26 * glowStrength;
  const ribbonOpacity = 0.16 * glowStrength;
  const haloOpacity = 0.13 * glowStrength;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          width: 620,
          height: 620,
          left: -150 + driftA * 72,
          top: 240 + driftB * 50,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.accentColor}1c 0%, ${theme.accentColor}0e 26%, transparent 70%)`,
          filter: 'blur(58px)',
          opacity: fieldOpacity * (0.86 + driftC * 0.14),
          mixBlendMode: 'screen',
          transform: `scale(${1 + driftB * 0.06})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          right: -180 + driftC * 80,
          bottom: 180 + driftA * 54,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.secondaryColor}1a 0%, ${theme.secondaryColor}0c 28%, transparent 72%)`,
          filter: 'blur(64px)',
          opacity: fieldOpacity * (0.84 + driftD * 0.16),
          mixBlendMode: 'screen',
          transform: `scale(${0.98 + driftA * 0.05})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 1120 + driftD * 44,
          width: 900,
          height: 360,
          borderRadius: '50%',
          background: `linear-gradient(102deg, transparent 16%, ${theme.secondaryColor}12 42%, ${theme.accentColor}10 52%, transparent 78%)`,
          filter: 'blur(72px)',
          opacity: ribbonOpacity,
          mixBlendMode: 'screen',
          transform: `translate(-50%, -50%) rotate(-8deg) scale(${1 + driftC * 0.04})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 760,
          height: 760,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.accentColor}10 0%, ${theme.secondaryColor}08 32%, transparent 68%)`,
          filter: 'blur(82px)',
          opacity: haloOpacity * (0.9 + driftA * 0.1),
          mixBlendMode: 'screen',
          transform: `translate(-50%, -50%) scale(${0.96 + driftB * 0.04})`,
        }}
      />
    </AbsoluteFill>
  );
};

const resolveForegroundMotion = (
  family: ShotDirector['family'],
  shotIndex: number,
) => {
  switch (family) {
    case 'data':
      return {
        fromScale: 0.996,
        toScale: 1.026,
        driftX: shotIndex % 2 === 0 ? -18 : 18,
        driftY: -14,
      };
    case 'comparison':
      return {
        fromScale: 0.998,
        toScale: 1.022,
        driftX: shotIndex % 2 === 0 ? 16 : -16,
        driftY: -10,
      };
    case 'system':
      return {
        fromScale: 0.994,
        toScale: 1.028,
        driftX: shotIndex % 2 === 0 ? -10 : 10,
        driftY: -18,
      };
    case 'quote':
      return {
        fromScale: 1,
        toScale: 1.024,
        driftX: 12,
        driftY: -8,
      };
    case 'cta':
      return {
        fromScale: 0.998,
        toScale: 1.032,
        driftX: 0,
        driftY: -12,
      };
    case 'proof':
    case 'product':
    default:
      return {
        fromScale: 0.997,
        toScale: 1.024,
        driftX: shotIndex % 2 === 0 ? -12 : 12,
        driftY: -12,
      };
  }
};

const ForegroundPlaneMotion: React.FC<{
  family: ShotDirector['family'];
  shotIndex: number;
  shotFrames: number;
  children: React.ReactNode;
}> = ({ family, shotIndex, shotFrames, children }) => {
  const frame = useCurrentFrame();
  const motion = resolveForegroundMotion(family, shotIndex);
  const progress = interpolate(frame, [0, shotFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const breathe = Math.sin(frame * 0.035 + shotIndex * 0.7);
  const translateX = interpolate(progress, [0, 1], [0, motion.driftX]) + breathe * 1.8;
  const translateY = interpolate(progress, [0, 1], [0, motion.driftY]) + breathe * 1.4;
  const scale = interpolate(progress, [0, 1], [motion.fromScale, motion.toScale]) + breathe * 0.0012;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
        transformOrigin: '50% 50%',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};

const IconRail: React.FC<{
  iconIds: ReturnType<typeof getShotDirector>['iconIds'];
  theme: ShotTheme;
  shotFrames: number;
}> = ({ iconIds, theme, shotFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [8, 26, shotFrames - 30, shotFrames - 10],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 34,
        left: 56,
        display: 'flex',
        gap: 0,
        opacity,
        padding: '7px 12px',
        borderRadius: 999,
        background: 'rgba(8,11,19,0.46)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(14px)',
      }}
    >
      {iconIds.slice(0, 3).map((iconId, index) => (
        <div
          key={iconId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            borderRight: index < Math.min(iconIds.length, 3) - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
          }}
        >
          <RenderIcon
            id={iconId}
            size={13}
            color={theme.accentColor}
            secondaryColor={theme.secondaryColor}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(247,250,255,0.74)',
              letterSpacing: 0.2,
            }}
          >
            {getIconLabel(iconId)}
          </span>
        </div>
      ))}
    </div>
  );
};

const ProgressChip: React.FC<{
  current: number;
  total: number;
  theme: ShotTheme;
  shotFrames: number;
}> = ({ current, total, theme, shotFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [18, 36, shotFrames - 30, shotFrames - 12],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        right: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 999,
        background: 'rgba(8,11,19,0.48)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
        opacity,
        backdropFilter: 'blur(14px)',
      }}
    >
      <div
        style={{
          width: 88,
          height: 4,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.12)',
        }}
      >
        <div
          style={{
            width: `${(current / total) * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${theme.accentColor}, ${theme.secondaryColor})`,
            boxShadow: `0 0 10px ${theme.accentColor}55`,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'rgba(247,250,255,0.8)',
          letterSpacing: 0.8,
        }}
      >
        {current}/{total}
      </span>
    </div>
  );
};

const BRAND_ICON_IDS: RenderIconId[] = [
  'github',
  'telegram',
  'discord',
  'slack',
  'whatsapp',
  'reddit',
  'ollama',
];

const pickTitleIconId = (
  iconIds: RenderIconId[],
  strategy: TitleIconStrategy
) => {
  if (iconIds.length === 0) {
    return undefined;
  }

  if (strategy === 'brand-first') {
    return iconIds.find((iconId) => BRAND_ICON_IDS.includes(iconId)) || iconIds[0];
  }

  return iconIds[0];
};

const ShotOverlay: React.FC<{
  title: string;
  kicker?: string;
  tags?: { label: string; color?: string }[];
  badge?: { label: string; variant?: 'new' | 'hot' | 'top' | 'live' | 'default' };
  iconIds: ReturnType<typeof getShotDirector>['iconIds'];
  theme: ShotTheme;
  shotFrames: number;
  shotIndex: number;
  overlayMode: ShotTheme['overlayMode'];
  preset: DirectorPreset;
}> = ({ title, kicker, tags, badge, iconIds, theme, shotFrames, shotIndex, overlayMode, preset }) => {
  const exitFrame = Math.max(shotFrames - 26, 62);
  const titleIconId = preset.titleOverlay.showIcon
    ? pickTitleIconId(iconIds, preset.titleOverlay.iconStrategy)
    : undefined;

  return (
    <>
      {preset.chrome.showIconRail ? <IconRail iconIds={iconIds} theme={theme} shotFrames={shotFrames} /> : null}
      {preset.chrome.showProgress && theme.showProgress ? (
        <ProgressChip current={shotIndex + 1} total={SEGMENTS.length} theme={theme} shotFrames={shotFrames} />
      ) : null}
      {preset.chrome.showBadge && badge ? (
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: 56,
          }}
        >
          <AnimatedBadge
            label={badge.label}
            startFrame={10}
            accentColor={theme.accentColor}
            variant={badge.variant || theme.badgeVariant}
          />
        </div>
      ) : null}
      {preset.chrome.showTitleOverlay && (overlayMode === 'slide' || overlayMode === 'hybrid') && (
        <SlideLowerThird
          startFrame={16}
          duration={Math.min(shotFrames - 8, 150)}
          exitFrame={exitFrame}
          title={title}
          subtitle={kicker}
          accentColor={theme.accentColor}
          direction={shotIndex % 2 === 0 ? 'left' : 'right'}
          iconId={titleIconId}
          preset={preset.titleOverlay}
        />
      )}
      {preset.chrome.showTags && (overlayMode === 'tags' || overlayMode === 'hybrid') && tags && tags.length > 0 && (
        <TagLowerThird
          startFrame={12}
          duration={Math.min(shotFrames - 10, 160)}
          exitFrame={exitFrame}
          tags={tags.map((tag, index) => ({
            label: tag.label,
            color: tag.color || [theme.accentColor, theme.secondaryColor, theme.tertiaryColor][index % 3],
          }))}
          label="SHOT SIGNALS"
        />
      )}
    </>
  );
};

const CaptionLayer: React.FC<{
  narr: string;
  shotFrames: number;
  director: ShotDirector;
  theme: ShotTheme;
  preset: CaptionStylePreset;
}> = ({ narr, shotFrames, director, theme, preset }) => {
  const frame = useCurrentFrame();
  const isBareCaption =
    director.family === 'proof' ||
    director.family === 'quote' ||
    director.family === 'cta' ||
    director.family === 'system';
  const captionStart = Math.min(TRANSITION_FRAMES, Math.floor(shotFrames * 0.08));
  const captionEnd = shotFrames - TRANSITION_FRAMES;
  const availableCaptionFrames = Math.max(1, captionEnd - captionStart + 1);
  const captionBeatTimeline = React.useMemo(
    () => buildCaptionBeatTimeline(narr, availableCaptionFrames),
    [narr, availableCaptionFrames]
  );
  const { paddingBottom, paddingLeft, paddingRight, maxWidth } = preset;
  const scrimOpacity = preset.scrimOpacity;
  const relativeCaptionFrame = Math.max(0, frame - captionStart);
  const activeBeat =
    captionBeatTimeline.find((beat) => relativeCaptionFrame >= beat.start && relativeCaptionFrame < beat.end) ||
    captionBeatTimeline[captionBeatTimeline.length - 1] || {
      text: narr,
      start: 0,
      end: availableCaptionFrames,
      framesPerWord: 15,
    };
  const beatFrame = Math.max(0, relativeCaptionFrame - activeBeat.start);
  const beatDuration = Math.max(1, activeBeat.end - activeBeat.start);
  const beatTextLength = activeBeat.text.replace(/\s+/g, '').length;
  const beatOpacity =
    interpolate(beatFrame, [0, 4, Math.max(beatDuration - 8, 4), beatDuration], [0.72, 1, 1, 0.88], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const beatTranslateY =
    interpolate(beatFrame, [0, 7], [18, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) -
    interpolate(beatFrame, [Math.max(beatDuration - 8, 0), beatDuration], [0, 10], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const beatScale = interpolate(beatFrame, [0, 6], [0.972, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const adaptiveMaxWidth = beatTextLength <= 12 ? preset.shortTextMaxWidth : maxWidth;
  const resolvedMaxWidth = isBareCaption ? Math.min(adaptiveMaxWidth, 780) : adaptiveMaxWidth;
  const scrimHeight = isBareCaption ? 360 : 520;

  if (frame < captionStart || frame > captionEnd) return null;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: scrimHeight,
          background: isBareCaption
            ? `linear-gradient(180deg, rgba(4,7,14,0) 0%, rgba(4,7,14,${scrimOpacity * 0.18}) 38%, rgba(4,7,14,${Math.min(0.22, scrimOpacity + 0.08)}) 100%)`
            : `linear-gradient(180deg, rgba(4,7,14,0) 0%, rgba(4,7,14,${scrimOpacity * 0.28}) 26%, rgba(4,7,14,${scrimOpacity}) 62%, rgba(4,7,14,${Math.min(0.92, scrimOpacity + 0.34)}) 100%)`,
          pointerEvents: 'none',
        }}
      />
      <WordByWord
        key={`${activeBeat.start}-${activeBeat.text}`}
        text={activeBeat.text}
        startFrame={captionStart + activeBeat.start}
        framesPerWord={activeBeat.framesPerWord}
        fontSize={theme.captionFontSize}
        highlightWords={director.highlightWords}
        accentColor={theme.accentColor}
        inactiveOpacity={preset.inactiveOpacity}
        baseTextShadow={isBareCaption ? '0 2px 20px rgba(0,0,0,0.72)' : '0 2px 18px rgba(0,0,0,0.58)'}
        wrapperStyle={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: isBareCaption ? paddingBottom - 10 : paddingBottom,
          paddingLeft,
          paddingRight,
        }}
        trackStyle={{
          width: '100%',
          maxWidth: resolvedMaxWidth,
          justifyContent: 'center',
          textAlign: 'center',
          gap: 10,
          padding: '0',
          borderRadius: preset.borderRadius,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          backdropFilter: 'none',
          opacity: beatOpacity,
          transform: `translateY(${beatTranslateY}px) scale(${beatScale})`,
        }}
      />
    </>
  );
};

export interface Video1v4Props {
  directorPresetId?: DirectorPresetId;
}

const Video1v4: React.FC<Video1v4Props> = ({
  directorPresetId = DEFAULT_DIRECTOR_PRESET_ID,
}) => {
  const directorPreset = resolveDirectorPreset(directorPresetId);

  return (
    <AbsoluteFill style={{ width: 1080, height: 1920, background: '#070b12' }}>
      {SEGMENTS.map((seg, index) => {
        const narr = seg.text;
        const director = getShotDirector(seg.id, index);
        const theme = resolveShotTheme(director);
        const seqDuration = seg.frames + TRANSITION_FRAMES;

        return (
          <Sequence
            key={seg.id}
            from={seg.start}
            durationInFrames={seqDuration}
          >
            <CrossFadeShot frames={seg.frames}>
              <SceneAtmosphere theme={theme} preset={directorPreset.atmosphere} />
              <ForegroundPlaneMotion family={director.family} shotIndex={index} shotFrames={seg.frames}>
                {renderVideo1v4Shot({
                  shotId: seg.id,
                  theme,
                  startFrame: seg.start,
                  durationFrames: seg.frames,
                })}
              </ForegroundPlaneMotion>
              <BackgroundMotionOverlay theme={theme} preset={directorPreset.atmosphere} />
              <ShotOverlay
                title={director.title}
                kicker={director.kicker}
                tags={director.tags}
                badge={director.badge}
                iconIds={director.iconIds}
                theme={theme}
                shotFrames={seg.frames}
                shotIndex={index}
                overlayMode={theme.overlayMode}
                preset={directorPreset}
              />
              <CaptionLayer
                narr={narr}
                shotFrames={seg.frames}
                director={director}
                theme={theme}
                preset={directorPreset.caption}
              />
            </CrossFadeShot>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default Video1v4;
