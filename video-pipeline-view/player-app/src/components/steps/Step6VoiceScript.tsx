import React, {useMemo} from 'react';
import type {JobStatus, VoiceJobResult} from '../../workflow/types';
import {usePersistentStepEditor} from './usePersistentStepEditor';
import type {VoiceEngine} from './step6VoiceUtils';
import {
  ENGINE_OPTIONS,
  VOICE_STYLE_OPTIONS,
  SPEED_OPTIONS,
  normalizeEngine,
  toNumber,
  resolveVoiceStyleId,
  resolveSpeedPresetId,
  getStyleOption,
} from './step6VoiceUtils';

// ── Local types (not shared) ─────────────────────────────────────────────────

interface ShotNarration {
  text?: string;
  duration?: number;
  durationSeconds?: number;
  emotion?: string;
  emphasis?: string;
}

interface VoiceScriptItem {
  shotId: string;
  text: string;
  duration?: number;
}

export interface VoiceData {
  preset?: string;
  engine?: VoiceEngine;
  language?: string;
  speed?: number | string;
  pitch?: number;
  emotion?: string;
  pauses?: string;
  referenceUrl?: string;
  reference_url?: string;
  voice?: string;
  model?: string;
  speakerSeed?: number;
  speaker_seed?: number;
  temperature?: number;
  topP?: number;
  top_p?: number;
  topK?: number;
  top_k?: number;
  byShotId?: Record<string, ShotNarration>;
  script?: VoiceScriptItem[];
  totalDuration?: number;
  totalChars?: number;
  stylePresetId?: string;
  speedPresetId?: string;
  voiceProfileId?: string;
}

interface Step6VoiceScriptProps {
  stepId: number;
  data: VoiceData | null;
  shots: Array<{id: string; title: string; narration?: string; durationSeconds?: number}>;
  onGenerate: () => void;
  onSubmitVoice: (voiceOverride?: VoiceData) => void;
  onUpdate: (updated: VoiceData) => void;
  voiceStatus: JobStatus;
  voiceJobId: string | null;
  voiceProgress: number;
  voiceResult: VoiceJobResult | null;
  voiceManifestUrl: string | null;
  voiceAssets: Array<{shotId: string; title: string; durationSeconds: number; voiceFile: string; url: string}>;
  onBackfillDurations: () => void;
  loading: boolean;
  confirmed: boolean;
  onConfirm: () => void;
}

// ── Draft builder ────────────────────────────────────────────────────────────

function buildDraft(
  data: VoiceData | null,
  shots: Step6VoiceScriptProps['shots'],
): VoiceData {
  const byShotId =
    data?.byShotId && typeof data.byShotId === 'object'
      ? (data.byShotId as Record<string, ShotNarration>)
      : {};
  const scriptFromData = Array.isArray(data?.script) ? data.script : [];

  const normalizedScript: VoiceScriptItem[] = shots.map((shot) => {
    const fromData = scriptFromData.find((item) => item.shotId === shot.id);
    const fromByShot = byShotId[shot.id];
    return {
      shotId: shot.id,
      text: fromData?.text || fromByShot?.text || shot.narration || '',
      duration: fromData?.duration || fromByShot?.durationSeconds || shot.durationSeconds,
    };
  });

  const nextByShotId = normalizedScript.reduce<Record<string, ShotNarration>>((acc, item) => {
    acc[item.shotId] = {text: item.text, durationSeconds: item.duration};
    return acc;
  }, {});

  const totalDuration = normalizedScript.reduce((sum, item) => sum + toNumber(item.duration, 0), 0);
  const totalChars = normalizedScript.reduce((sum, item) => sum + item.text.length, 0);
  const engine = normalizeEngine(data?.engine);

  return {
    ...(data || {}),
    engine,
    language: String(data?.language || 'zh-cn').trim(),
    byShotId: nextByShotId,
    script: normalizedScript,
    totalDuration,
    totalChars,
    stylePresetId: resolveVoiceStyleId(data),
    speedPresetId: resolveSpeedPresetId(data, getStyleOption(resolveVoiceStyleId(data)).speed),
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export const Step6VoiceScript: React.FC<Step6VoiceScriptProps> = ({
  data,
  shots,
  voiceStatus,
  voiceResult,
  voiceAssets,
  loading,
  confirmed,
  onSubmitVoice,
  onUpdate,
  onBackfillDurations,
  onConfirm,
}) => {
  const {clearEditor} = usePersistentStepEditor<VoiceData>('step6');

  const normalized = useMemo(() => buildDraft(data, shots), [data, shots]);
  const narrationList = normalized.script || [];

  const totalDuration =
    normalized.totalDuration ||
    narrationList.reduce((sum, item) => sum + toNumber(item.duration, 0), 0);
  const totalChars =
    normalized.totalChars ||
    narrationList.reduce((sum, item) => sum + item.text.length, 0);

  const current: VoiceData = normalized;
  const currentScript = current.script || [];
  const currentStyleOption = getStyleOption(resolveVoiceStyleId(current));

  const mins = Math.floor(totalDuration / 60);
  const secs = Math.round(totalDuration % 60);
  const durationLabel = `${mins}:${secs.toString().padStart(2, '0')}`;

  // Auto-submit when all narrations are filled and voice engine is configured
  const canAutoSubmit =
    currentScript.length === shots.length &&
    currentScript.every((item) => item.text.trim().length > 0) &&
    Boolean(current.engine);

  const hasVoiceResult = voiceStatus === 'done' && voiceResult;

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span>
          {narrationList.length}/{shots.length} 场景已填写
        </span>
        <span>约 {durationLabel}</span>
        <span>约 {totalChars} 字</span>
        {hasVoiceResult && (
          <span className="text-green-400">
            已生成 {voiceResult.queue?.length ?? 0} 条配音
          </span>
        )}
      </div>

      {/* Engine selector */}
      <div className="flex gap-2 flex-wrap">
        {ENGINE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onUpdate({...current, engine: opt.value})}
            className={`px-3 py-1.5 rounded text-sm border ${
              current.engine === opt.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          <span>系统音色 / 克隆音色 ID</span>
          <input
            value={current.voice || ''}
            onChange={(e) => onUpdate({...current, voice: e.target.value})}
            placeholder="留空则使用默认系统音色"
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          <span>参考音频路径或 URL</span>
          <input
            value={current.referenceUrl || current.reference_url || ''}
            onChange={(e) => onUpdate({...current, referenceUrl: e.target.value, reference_url: e.target.value})}
            placeholder="留空则不走克隆"
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          <span>千问模型</span>
          <input
            value={current.model || ''}
            onChange={(e) => onUpdate({...current, model: e.target.value})}
            placeholder="例如 qwen3-tts-flash"
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="text-xs text-gray-500">
        当前只保留阿里千问 TTS 链路。填写参考音频且不填音色 ID 时，后端会自动创建或复用克隆音色。
      </div>

      {/* Style + Speed */}
      <div className="flex gap-4">
        <div className="flex gap-2">
          {VOICE_STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onUpdate({...current, stylePresetId: opt.id, preset: opt.preset, speed: opt.speed})}
              className={`px-3 py-1.5 rounded text-sm border ${
                resolveVoiceStyleId(current) === opt.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onUpdate({...current, speedPresetId: opt.id, speed: opt.value})}
              className={`px-3 py-1.5 rounded text-sm border ${
                resolveSpeedPresetId(current, currentStyleOption.speed) === opt.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Narration list */}
      <div className="flex flex-col gap-3">
        {shots.map((shot) => {
          const item = currentScript.find((s) => s.shotId === shot.id);
          const asset = voiceAssets.find((a) => a.shotId === shot.id);
          return (
            <div key={shot.id} className="flex gap-3 items-start border border-gray-100 rounded p-3">
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 mb-1">{shot.title}</div>
                <textarea
                  value={item?.text || ''}
                  onChange={(e) => {
                    const next = currentScript.map((s) =>
                      s.shotId === shot.id ? {...s, text: e.target.value} : s,
                    );
                    onUpdate({...current, script: next});
                  }}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
                  placeholder="输入旁白文案..."
                />
                {asset && (
                  <div className="text-xs text-green-600 mt-1">
                    配音 {asset.durationSeconds.toFixed(1)}s 已生成
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit / regenerate */}
      <div className="flex gap-3">
        {!hasVoiceResult ? (
          <button
            onClick={() => onSubmitVoice(current)}
            disabled={loading || !canAutoSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-40"
          >
            {loading ? '提交中…' : '提交配音'}
          </button>
        ) : (
          <button
            onClick={() => onSubmitVoice(current)}
            disabled={loading}
            className="px-4 py-2 border border-blue-400 text-blue-600 rounded text-sm"
          >
            重新生成配音
          </button>
        )}
        {hasVoiceResult && (
          <button
            onClick={onBackfillDurations}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm"
          >
            用配音更新镜头时长
          </button>
        )}
        <button onClick={clearEditor} className="px-4 py-2 border border-gray-200 text-gray-500 rounded text-sm">
          重置
        </button>
        <button onClick={onConfirm} disabled={confirmed} className="px-4 py-2 border border-green-400 text-green-600 rounded text-sm disabled:opacity-40">
          {confirmed ? '已确认' : '确认'}
        </button>
      </div>
    </div>
  );
};

export default Step6VoiceScript;
