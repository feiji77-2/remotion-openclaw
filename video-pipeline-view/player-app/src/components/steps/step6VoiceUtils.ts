export type VoiceEngine = 'qwen-tts';

export interface VoiceStyleOption {
  id: string;
  label: string;
  desc: string;
  speed?: number;
  preset?: string;
}

export interface SpeedOption {
  id: string;
  label: string;
  value: number;
}

export const ENGINE_OPTIONS: Array<{value: VoiceEngine; label: string; desc: string}> = [
  {value: 'qwen-tts', label: 'Qwen TTS', desc: '阿里百炼千问语音'},
];

export const VOICE_STYLE_OPTIONS: VoiceStyleOption[] = [
  {id: 'natural', label: '自然', desc: '自然流畅', speed: 1.0},
  {id: 'slow', label: '慢速', desc: '语速较慢', speed: 0.9},
  {id: 'fast', label: '快速', desc: '语速较快', speed: 1.15},
  {id: 'news', label: '新闻', desc: '新闻播报', speed: 1.0, preset: 'broadcast'},
  {id: 'read', label: '朗读', desc: '朗读风格', speed: 0.95, preset: 'read'},
  {id: 'story', label: '故事', desc: '讲解叙事', speed: 0.92},
];

export const SPEED_OPTIONS: SpeedOption[] = [
  {id: 'slow', label: '慢速 0.9x', value: 0.9},
  {id: 'normal', label: '正常 1.0x', value: 1.0},
  {id: 'fast', label: '快速 1.15x', value: 1.15},
];

export function normalizeEngine(engine: VoiceEngine | string | undefined): VoiceEngine {
  return engine === 'qwen-tts' ? 'qwen-tts' : 'qwen-tts';
}

export function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function almostEqual(a: number, b: number, precision = 0.02): boolean {
  return Math.abs(a - b) <= precision;
}

export function resolveVoiceStyleId(
  data: {stylePresetId?: string; preset?: string; style?: string; speed?: number | string} | null | undefined,
): string {
  if (data?.stylePresetId && VOICE_STYLE_OPTIONS.some((item) => item.id === data.stylePresetId)) {
    return data.stylePresetId;
  }
  const matchedByPreset = VOICE_STYLE_OPTIONS.find((item) => item.preset === data?.preset);
  if (matchedByPreset) return matchedByPreset.id;
  const matchedByParams = VOICE_STYLE_OPTIONS.find((item) =>
    item.speed !== undefined && almostEqual(Number(data?.speed ?? item.speed), item.speed),
  );
  return matchedByParams?.id || 'natural';
}

export function resolveSpeedPresetId(
  data: {speedPresetId?: string; speed?: number | string} | null | undefined,
  fallbackValue = 1,
): string {
  if (data?.speedPresetId && SPEED_OPTIONS.some((item) => item.id === data.speedPresetId)) {
    return data.speedPresetId;
  }
  const target = toNumber(data?.speed, fallbackValue);
  const matched = SPEED_OPTIONS.find((item) => almostEqual(target, item.value));
  return matched?.id || 'normal';
}

export function getStyleOption(stylePresetId: string): VoiceStyleOption {
  return VOICE_STYLE_OPTIONS.find((item) => item.id === stylePresetId) || VOICE_STYLE_OPTIONS[0];
}
