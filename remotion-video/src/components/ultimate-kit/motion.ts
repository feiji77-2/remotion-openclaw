import {interpolate} from 'remotion';

type UltimateMicroJitterConfig = {
  delay?: number;
  settleFrames?: number;
  rampFrames?: number;
  amplitudeX?: number;
  amplitudeY?: number;
  rotateDeg?: number;
  scaleDelta?: number;
  seed?: number;
  speed?: number;
};

export type UltimateMicroJitterProfileName = 'steady' | 'standard' | 'playful';

const ULTIMATE_MICRO_JITTER_PROFILES: Record<UltimateMicroJitterProfileName, Omit<
  UltimateMicroJitterConfig,
  'delay' | 'settleFrames' | 'rampFrames' | 'seed' | 'speed'
>> = {
  steady: {
    amplitudeX: 0.3,
    amplitudeY: 0.3,
    rotateDeg: 0.1,
    scaleDelta: 0.001,
  },
  standard: {
    amplitudeX: 0.8,
    amplitudeY: 0.7,
    rotateDeg: 0.32,
    scaleDelta: 0.003,
  },
  playful: {
    amplitudeX: 1.5,
    amplitudeY: 1.2,
    rotateDeg: 0.5,
    scaleDelta: 0.006,
  },
};

type UltimateMicroJitterResult = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
};

export const resolveUltimateMicroJitterConfig = (
  profile: UltimateMicroJitterProfileName = 'standard',
  overrides: UltimateMicroJitterConfig = {},
): UltimateMicroJitterConfig => {
  return {
    ...ULTIMATE_MICRO_JITTER_PROFILES[profile],
    ...overrides,
  };
};

export const createUltimateMicroJitter = (
  frame: number,
  {
    delay = 0,
    settleFrames = 18,
    rampFrames = 14,
    amplitudeX = 1.2,
    amplitudeY = 1,
    rotateDeg = 0.45,
    scaleDelta = 0.004,
    seed = 0,
    speed = 1,
  }: UltimateMicroJitterConfig = {},
): UltimateMicroJitterResult => {
  const elapsed = Math.max(0, frame - delay - settleFrames);
  const active = interpolate(elapsed, [0, rampFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const phase = elapsed * speed + seed * 19.7;
  const x =
    active *
    ((Math.sin(phase / 6.5) * amplitudeX * 0.34) + (Math.cos(phase / 11.2) * amplitudeX * 0.66));
  const y =
    active *
    ((Math.sin((phase + 9) / 7.8) * amplitudeY * 0.42) + (Math.cos((phase + 3) / 13.4) * amplitudeY * 0.58));
  const rotate =
    active *
    ((Math.sin((phase + 5) / 10.5) * rotateDeg * 0.44) + (Math.cos((phase + 7) / 16.8) * rotateDeg * 0.56));
  const scale = 1 + (Math.sin((phase + 11) / 14.5) * scaleDelta * active);

  return {x, y, rotate, scale};
};

export const appendUltimateMicroJitter = (baseTransform: string, jitter: UltimateMicroJitterResult) => {
  const base = baseTransform.trim();
  const suffix = `translate3d(${jitter.x}px, ${jitter.y}px, 0) rotate(${jitter.rotate}deg) scale(${jitter.scale})`;

  return base ? `${base} ${suffix}` : suffix;
};
