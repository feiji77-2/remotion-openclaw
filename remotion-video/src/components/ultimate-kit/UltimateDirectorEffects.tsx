import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {ResolvedUltimateSceneConfig} from './project';
import {DotGridParallax, GodRays} from '../visual-atoms';
import {
  countUpWithPulse,
  burstSpread,
  settle,
  tracePosition,
  traceProgress,
} from '../../utils/motion-grammar';
import {
  getMotionFunctionName,
  type DataEventVerb,
} from '../../data/shotGrammar';
import {
  useBenchmarkRace,
  useDepthParallax,
  useDiagramMorph,
  useEditorialWipe,
  useKineticTypography,
} from './shotArchetypes';

const ACCENT_COLORS: Record<string, string> = {
  cyan: '#38bdf8',
  orange: '#fb923c',
  purple: '#a78bfa',
  green: '#34d399',
  yellow: '#facc15',
  red: '#f87171',
  lime: '#cdff3d',
};

const withAlpha = (color: string, alphaHex: string) => {
  if (!color.startsWith('#')) {
    return color;
  }

  const hex = color.slice(1);
  if (hex.length === 6) {
    return `#${hex}${alphaHex}`;
  }
  if (hex.length === 3) {
    const expanded = hex.split('').map((char) => char + char).join('');
    return `#${expanded}${alphaHex}`;
  }
  return color;
};

const resolveAccentColor = (scene: ResolvedUltimateSceneConfig) => {
  const data = scene.data as unknown as Record<string, unknown>;
  const tone = [
    scene.grammar?.memoryObject?.color,
    typeof data.accent === 'string' ? data.accent : '',
    typeof data.rightAccent === 'string' ? data.rightAccent : '',
    typeof data.leftAccent === 'string' ? data.leftAccent : '',
  ].find((value) => typeof value === 'string' && value.length > 0);

  return tone ? ACCENT_COLORS[tone] ?? tone : ACCENT_COLORS.cyan;
};

const resolveDisplayTitle = (scene: ResolvedUltimateSceneConfig) => {
  const data = scene.data as unknown as Record<string, unknown>;
  const candidates = [
    data.title,
    data.heading,
    data.keyword,
    data.term,
    data.quote,
  ];
  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return typeof value === 'string' ? value : scene.id;
};

const resolveRaceItems = (scene: ResolvedUltimateSceneConfig) => {
  const data = scene.data as unknown as Record<string, unknown>;
  const rawItems = Array.isArray(data.items) ? data.items : [];

  const parsed = rawItems
    .map((item, index) => {
      const entry = item as Record<string, unknown>;
      const label = typeof entry.label === 'string' ? entry.label : `metric-${index + 1}`;
      const source = [
        entry.targetValue,
        entry.value,
        entry.primaryValue,
        entry.secondaryValue,
        entry.detail,
      ].find((value) => typeof value === 'number' || typeof value === 'string');

      const targetValue = parseFloat(String(source ?? index + 1).replace(/[^\d.-]/g, ''));
      if (!Number.isFinite(targetValue)) {
        return null;
      }

      return {
        label,
        targetValue: Math.max(1, Math.abs(targetValue)),
      };
    })
    .filter((item): item is {label: string; targetValue: number} => item !== null);

  if (parsed.length > 0) {
    return parsed.slice(0, 4);
  }

  return [
    {label: 'A', targetValue: 24},
    {label: 'B', targetValue: 42},
    {label: 'C', targetValue: 68},
  ];
};

const buildTracePoints = (scene: ResolvedUltimateSceneConfig) => {
  switch (scene.family) {
    case 'timeline':
      return [
        {x: 160, y: 640},
        {x: 520, y: 420},
        {x: 940, y: 540},
        {x: 1340, y: 360},
        {x: 1760, y: 500},
      ];
    case 'pipeline-flow':
    case 'step-flow':
      return [
        {x: 180, y: 560},
        {x: 540, y: 560},
        {x: 900, y: 460},
        {x: 1260, y: 560},
        {x: 1720, y: 460},
      ];
    default:
      return [
        {x: 220, y: 700},
        {x: 560, y: 500},
        {x: 980, y: 590},
        {x: 1380, y: 360},
        {x: 1700, y: 460},
      ];
  }
};

export const UltimateDirectorEffects: React.FC<{scene: ResolvedUltimateSceneConfig}> = ({scene}) => {
  const frame = useCurrentFrame();
  const grammar = scene.grammar;

  if (!grammar) {
    return null;
  }

  const accent = resolveAccentColor(scene);
  const motionFunction = getMotionFunctionName(grammar.dataEvent as DataEventVerb);
  const ghostTitle = resolveDisplayTitle(scene);
  const enterDuration = Math.max(18, grammar.enterFrames ?? 18);
  const sceneDuration = Math.max(40, scene.durationInFrames);
  const progress = Math.min(1, frame / Math.max(1, sceneDuration - 1));
  const memoryObject = grammar.memoryObject ?? {
    type: 'word',
    role: '显式导演记忆物',
    enterFrame: 12,
    color: accent,
  };
  const emphasisFrames = grammar.emphasisFrames ?? 48;
  const burstFragments = burstSpread(
    frame,
    memoryObject.enterFrame ?? 12,
    Math.max(24, enterDuration + 10),
    960,
    540,
    240,
    10,
  );
  const tracePoints = buildTracePoints(scene);
  const traceDot = tracePosition(
    frame,
    memoryObject.enterFrame ?? 12,
    Math.max(36, enterDuration + emphasisFrames),
    tracePoints,
  );
  const traceReveal = traceProgress(
    frame,
    memoryObject.enterFrame ?? 12,
    Math.max(36, enterDuration + emphasisFrames),
  );
  const benchmark = useBenchmarkRace({
    items: resolveRaceItems(scene),
    raceProgress: progress,
    durationInFrames: sceneDuration,
  });
  const wipe = useEditorialWipe({
    direction: grammar.cameraIntent === 'compress' ? 'up' : 'left',
    wipeProgress: progress,
    durationInFrames: enterDuration,
  });
  const parallax = useDepthParallax({
    layers: [{depth: 0.12}, {depth: 0.48}, {depth: 0.84}],
    panDirection:
      grammar.cameraIntent === 'drift'
        ? 'up'
        : grammar.cameraIntent === 'compress'
          ? 'left'
          : 'right',
    panAmount: 36,
    durationInFrames: sceneDuration,
  });
  const morph = useDiagramMorph({
    fromValues: [0.18, 0.48, 0.32],
    toValues: [0.74, 0.28, 0.58],
    progress,
  });
  const kinetic = useKineticTypography({
    text: ghostTitle,
    family: scene.family,
    durationInFrames: sceneDuration,
    fontSize: scene.family === 'quote-highlight' ? 112 : 88,
    weight: 'bold',
    delayFrames: 0,
  });
  const pulse = countUpWithPulse(1, Math.min(1, frame / enterDuration), 2).pulseIntensity;
  const settleState = settle(1, progress, 2);
  const enterOpacity = interpolate(frame, [0, 9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitStart = Math.max(18, sceneDuration - 15);
  const exitOpacity = interpolate(frame, [exitStart, sceneDuration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const climaxFrame = Math.min(sceneDuration - 8, Math.max(18, Math.floor(sceneDuration * 0.58)));
  const climaxBoost = interpolate(
    frame,
    [Math.max(0, climaxFrame - 4), climaxFrame, Math.min(sceneDuration, climaxFrame + 10)],
    [1, 1.5, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const showTrace = motionFunction === 'trace' || grammar.archetype === 'trace flow' || grammar.archetype === 'follow focus';
  const showBurst = motionFunction === 'burst' || grammar.archetype === 'burst spread' || grammar.archetype === 'threshold breach';
  const showPin =
    scene.family !== 'hero'
    && (grammar.archetype === 'lock-on reveal' || grammar.archetype === 'evidence pin');
  const showRace = motionFunction === 'countUp' || motionFunction === 'settle' || grammar.archetype === 'bullet train' || grammar.archetype === 'overtake race';
  const showMorph = scene.family === 'architecture-map' || scene.family === 'memory-graph' || scene.family === 'pipeline-flow';
  const showGhostTitle = memoryObject.type === 'word' || scene.family === 'hero' || scene.family === 'focus' || scene.family === 'quote-highlight';
  const isDataScene =
    scene.family === 'benchmark-chart'
    || scene.family === 'metrics'
    || scene.family === 'data-stream'
    || scene.family === 'number-strip';
  const heroManagedScene = scene.family === 'hero';
  const climaxWindow = frame >= climaxFrame - 4 && frame <= climaxFrame + 8;
  const backgroundAtomMode =
    heroManagedScene
      ? 'none'
      : isDataScene
        ? (climaxWindow ? 'rays' : 'dot')
        : showBurst || grammar.archetype === 'aftershock hold'
          ? 'rays'
          : showTrace || grammar.archetype === 'drift reveal'
            ? 'dot'
            : 'none';

  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      {backgroundAtomMode === 'dot' ? (
        <div style={{position: 'absolute', inset: 0, opacity: 0.42 * enterOpacity * exitOpacity * climaxBoost}}>
          <DotGridParallax
            dotColor={accent}
            density={0.32}
            parallaxX={18}
            parallaxY={10}
            cycleFrames={150}
            dotRadius={2.1}
          />
        </div>
      ) : null}
      {backgroundAtomMode === 'rays' ? (
        <div style={{position: 'absolute', inset: 0, opacity: 0.48 * enterOpacity * exitOpacity * climaxBoost}}>
          <GodRays color={accent} intensity={0.34 + pulse} sourceX={0.52} sourceY={0.08} durationFrames={sceneDuration} />
        </div>
      ) : null}

      {parallax.animatedLayers.map((layer, index) => (
        <div
          key={`${scene.id}-parallax-${index}`}
          style={{
            position: 'absolute',
            inset: 0,
            transform: layer.transform,
            opacity: 0.06 + index * 0.03,
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 320 + index * 160,
              height: 320 + index * 160,
              left: 180 + index * 420,
              top: 120 + index * 90 + settleState.springY * 0.12,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${withAlpha(accent, index === 2 ? '2f' : '18')} 0%, transparent 72%)`,
              filter: 'blur(18px)',
            }}
          />
        </div>
      ))}

      {showGhostTitle ? (
        <div
          style={{
            position: 'absolute',
            left: 110,
            right: 110,
            top: scene.family === 'hero' ? 140 : 180,
            opacity: scene.family === 'quote-highlight' ? 0.09 : 0.07,
            transform: kinetic.style.transform,
            fontSize: kinetic.style.fontSize,
            fontWeight: kinetic.style.fontWeight as React.CSSProperties['fontWeight'],
            color: accent,
            letterSpacing: -2,
            lineHeight: 0.92,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {kinetic.text}
        </div>
      ) : null}

      {showPin ? (
        <div
          style={{
            position: 'absolute',
            left: 228,
            right: 228,
            top: 154,
            bottom: 154,
            border: `1px solid ${withAlpha(accent, '33')}`,
            borderRadius: 36,
            opacity: 0.34 + pulse,
            transform: wipe.maskTransform,
          }}
        >
          {[
            {top: -1, left: -1},
            {top: -1, right: -1},
            {bottom: -1, left: -1},
            {bottom: -1, right: -1},
          ].map((corner, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                width: 82,
                height: 82,
                borderTop: `3px solid ${accent}`,
                borderLeft: `3px solid ${accent}`,
                borderTopLeftRadius: 18,
                transform:
                  index === 1
                    ? 'scaleX(-1)'
                    : index === 2
                      ? 'scaleY(-1)'
                      : index === 3
                        ? 'scale(-1)'
                        : 'none',
                ...corner,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              height: 2,
              background: `linear-gradient(90deg, transparent 0%, ${accent} 48%, transparent 100%)`,
              opacity: 0.36,
              transform: `translateY(-1px) ${wipe.transform}`,
            }}
          />
        </div>
      ) : null}

      {showTrace ? (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: 0.64}}>
          <polyline
            points={tracePoints.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={withAlpha(accent, '22')}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={tracePoints.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={accent}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 1800,
              strokeDashoffset: 1800 * (1 - traceReveal),
              filter: `drop-shadow(0 0 14px ${accent})`,
            }}
          />
          <circle cx={traceDot.x} cy={traceDot.y} r={8} fill={accent} />
          <circle cx={traceDot.x} cy={traceDot.y} r={22 + pulse * 40} fill="none" stroke={withAlpha(accent, '66')} strokeWidth={2} />
        </svg>
      ) : null}

      {showMorph ? (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: 0.22}}>
          <polyline
            points={morph.morphedValues.map((value, index) => `${640 + index * 240},${640 - value * 220}`).join(' ')}
            fill="none"
            stroke={withAlpha(accent, '80')}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {morph.morphedValues.map((value, index) => (
            <circle
              key={`${scene.id}-morph-${index}`}
              cx={640 + index * 240}
              cy={640 - value * 220}
              r={12 + index * 2}
              fill={withAlpha(accent, index === 1 ? 'aa' : '66')}
            />
          ))}
        </svg>
      ) : null}

      {showBurst ? (
        <>
          {burstFragments.map((fragment, index) => (
            <div
              key={`${scene.id}-burst-${index}`}
              style={{
                position: 'absolute',
                left: fragment.x,
                top: fragment.y,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: accent,
                opacity: fragment.opacity * 0.42,
                transform: `translate(-50%, -50%) rotate(${fragment.rotation}deg) scale(${fragment.scale})`,
                boxShadow: `0 0 18px ${accent}`,
              }}
            />
          ))}
        </>
      ) : null}

      {showRace ? (
        <div style={{position: 'absolute', left: 128, right: 128, bottom: 82, display: 'grid', gap: 14}}>
          {benchmark.racedValues.slice(0, 4).map((value, index) => {
            const width = interpolate(value, [0, Math.max(...benchmark.racedValues, 1)], [180, 1180]);
            return (
              <div
                key={`${scene.id}-race-${index}`}
                style={{
                  height: 8 + index * 2,
                  width,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${withAlpha(accent, 'cc')} 0%, ${withAlpha(accent, '33')} 100%)`,
                  opacity: 0.18 + index * 0.07,
                  boxShadow: `0 0 16px ${withAlpha(accent, '33')}`,
                  transform: `translateX(${index * 18}px)`,
                }}
              />
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export default UltimateDirectorEffects;
