import React, {useMemo} from 'react';
import type {JobStatus, VoiceEngine, VoiceJobResult} from '../../workflow/types';
import {usePersistentStepEditor} from './usePersistentStepEditor';

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

interface VoiceData {
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

const ENGINE_OPTIONS: Array<{value: VoiceEngine; label: string; desc: string}> = [
  {value: 'chattts', label: 'ChatTTS（本地）', desc: '默认链路，对话感更自然'},
  {value: 'openvoice', label: 'OpenVoice V2（本地）', desc: '支持音色克隆，多语言'},
  {value: 'melo', label: 'MeloTTS（本地）', desc: '快速，免费中文'},
];

const OPENVOICE_VOICE_OPTIONS = [
  {value: 'zh', label: '中文', desc: '中文基础音色'},
  {value: 'en', label: '英文', desc: '英文基础音色'},
  {value: 'es', label: '西语', desc: '西班牙语基础音色'},
  {value: 'fr', label: '法语', desc: '法语基础音色'},
  {value: 'jp', label: '日语', desc: '日语基础音色'},
  {value: 'kr', label: '韩语', desc: '韩语基础音色'},
];

const VOICE_STYLE_OPTIONS = [
  {
    id: 'natural',
    label: '自然讲述',
    desc: '适合大多数中文口播，听感自然',
    preset: '自然讲述',
    emotion: '自然亲切',
    pauses: '自然停顿',
    speed: 1.0,
    temperature: 0.3,
    topP: 0.72,
    topK: 20,
  },
  {
    id: 'steady',
    label: '沉稳解说',
    desc: '偏知识讲解和信息型内容',
    preset: '沉稳解说',
    emotion: '克制沉着',
    pauses: '句间停顿',
    speed: 0.95,
    temperature: 0.22,
    topP: 0.6,
    topK: 16,
  },
  {
    id: 'friendly',
    label: '亲切聊天',
    desc: '更像真人面对面讲给你听',
    preset: '亲切聊天',
    emotion: '松弛亲近',
    pauses: '自然停顿',
    speed: 1.02,
    temperature: 0.38,
    topP: 0.78,
    topK: 24,
  },
  {
    id: 'high-energy',
    label: '高能推进',
    desc: '节奏更快，适合强钩子和冲突感内容',
    preset: '高能推进',
    emotion: '有冲劲',
    pauses: '短停快推',
    speed: 1.12,
    temperature: 0.5,
    topP: 0.86,
    topK: 28,
  },
  {
    id: 'news',
    label: '新闻播报',
    desc: '语气稳定，适合事实概述',
    preset: '新闻播报',
    emotion: '冷静明确',
    pauses: '段落停顿',
    speed: 0.98,
    temperature: 0.18,
    topP: 0.56,
    topK: 14,
  },
  {
    id: 'story',
    label: '故事感',
    desc: '更适合情绪递进和叙述型内容',
    preset: '故事感讲述',
    emotion: '有情绪层次',
    pauses: '重点停顿',
    speed: 0.97,
    temperature: 0.42,
    topP: 0.82,
    topK: 26,
  },
] as const;

const SPEED_OPTIONS = [
  {id: 'slow', label: '慢一点', desc: '更稳，适合解释型', value: 0.92},
  {id: 'normal', label: '正常', desc: '最通用', value: 1.0},
  {id: 'fast', label: '稍快', desc: '更适合短视频口播', value: 1.08},
  {id: 'rapid', label: '高能快讲', desc: '更有冲击感', value: 1.16},
] as const;

const CHATTTS_SPEAKER_OPTIONS = [
  {id: 'seed-42', label: '沉稳男声', desc: '默认，清晰稳重', seed: 42},
  {id: 'seed-108', label: '亲切男声', desc: '更贴近日常口播', seed: 108},
  {id: 'seed-256', label: '清亮女声', desc: '更明快，更轻盈', seed: 256},
  {id: 'seed-512', label: '温柔女声', desc: '更柔和，适合陪伴感', seed: 512},
  {id: 'seed-888', label: '年轻中性', desc: '中性自然，不压主题', seed: 888},
] as const;

const MELO_VOICE_OPTIONS = [
  {id: 'melo', label: '通用中文', desc: '最稳，通用型', voice: 'melo'},
  {id: 'meijia', label: '亲和女声', desc: '柔和自然', voice: 'meijia'},
  {id: 'eddy', label: '沉稳男声', desc: '更成熟稳重', voice: 'eddy'},
  {id: 'flo', label: '明亮女声', desc: '更轻快，偏年轻', voice: 'flo'},
] as const;

function normalizeEngine(engine: VoiceEngine | string | undefined): VoiceEngine {
  return ENGINE_OPTIONS.some((item) => item.value === engine) ? engine as VoiceEngine : 'chattts';
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function almostEqual(a: number, b: number, precision = 0.02) {
  return Math.abs(a - b) <= precision;
}

function resolveVoiceStyleId(data: VoiceData | null | undefined) {
  if (data?.stylePresetId && VOICE_STYLE_OPTIONS.some((item) => item.id === data.stylePresetId)) {
    return data.stylePresetId;
  }
  const matchedByPreset = VOICE_STYLE_OPTIONS.find((item) => item.preset === data?.preset);
  if (matchedByPreset) {
    return matchedByPreset.id;
  }
  const matchedByParams = VOICE_STYLE_OPTIONS.find((item) =>
    almostEqual(toNumber(data?.speed, item.speed), item.speed)
    && almostEqual(toNumber(data?.temperature, item.temperature), item.temperature)
    && almostEqual(toNumber(data?.topP ?? data?.top_p, item.topP), item.topP)
    && Math.round(toNumber(data?.topK ?? data?.top_k, item.topK)) === item.topK,
  );
  return matchedByParams?.id || 'natural';
}

function resolveSpeedPresetId(data: VoiceData | null | undefined, fallbackValue?: number) {
  if (data?.speedPresetId && SPEED_OPTIONS.some((item) => item.id === data.speedPresetId)) {
    return data.speedPresetId;
  }
  const target = toNumber(data?.speed, fallbackValue || 1);
  const matched = SPEED_OPTIONS.find((item) => almostEqual(target, item.value));
  return matched?.id || 'normal';
}

function resolveChatSpeakerProfileId(data: VoiceData | null | undefined) {
  if (data?.voiceProfileId && CHATTTS_SPEAKER_OPTIONS.some((item) => item.id === data.voiceProfileId)) {
    return data.voiceProfileId;
  }
  const seed = Math.round(toNumber(data?.speakerSeed ?? data?.speaker_seed, 42));
  const matched = CHATTTS_SPEAKER_OPTIONS.find((item) => item.seed === seed);
  return matched?.id || 'seed-42';
}

function resolveMeloVoiceProfileId(data: VoiceData | null | undefined) {
  if (data?.voiceProfileId && MELO_VOICE_OPTIONS.some((item) => item.id === data.voiceProfileId)) {
    return data.voiceProfileId;
  }
  const voice = String(data?.voice || '').trim().toLowerCase();
  const matched = MELO_VOICE_OPTIONS.find((item) => item.voice === voice);
  return matched?.id || 'melo';
}

function resolveOpenVoiceCode(data: VoiceData | null | undefined) {
  const raw = String(data?.voice || data?.language || '').trim().toLowerCase();
  if (raw === 'zh-cn' || raw === 'zh') return 'zh';
  if (raw === 'en-us' || raw === 'en') return 'en';
  if (raw === 'es-es' || raw === 'es') return 'es';
  if (raw === 'fr-fr' || raw === 'fr') return 'fr';
  if (raw === 'ja' || raw === 'jp') return 'jp';
  if (raw === 'ko' || raw === 'kr') return 'kr';
  return 'zh';
}

function getStyleOption(stylePresetId: string) {
  return VOICE_STYLE_OPTIONS.find((item) => item.id === stylePresetId) || VOICE_STYLE_OPTIONS[0];
}

function getSpeedOption(speedPresetId: string, speedValue?: number | string) {
  return SPEED_OPTIONS.find((item) => item.id === speedPresetId)
    || SPEED_OPTIONS.find((item) => almostEqual(item.value, toNumber(speedValue, 1)))
    || SPEED_OPTIONS[1];
}

function getChatSpeakerOption(profileId: string, speakerSeed?: number) {
  return CHATTTS_SPEAKER_OPTIONS.find((item) => item.id === profileId)
    || CHATTTS_SPEAKER_OPTIONS.find((item) => item.seed === Math.round(toNumber(speakerSeed, 42)))
    || CHATTTS_SPEAKER_OPTIONS[0];
}

function getMeloVoiceOption(profileId: string, voice?: string) {
  return MELO_VOICE_OPTIONS.find((item) => item.id === profileId)
    || MELO_VOICE_OPTIONS.find((item) => item.voice === String(voice || '').trim().toLowerCase())
    || MELO_VOICE_OPTIONS[0];
}

function getOpenVoiceOption(data: VoiceData | null | undefined) {
  const code = resolveOpenVoiceCode(data);
  return OPENVOICE_VOICE_OPTIONS.find((item) => item.value === code) || OPENVOICE_VOICE_OPTIONS[0];
}

function buildDraft(data: VoiceData | null, shots: Step6VoiceScriptProps['shots']): VoiceData {
  const byShotId = data?.byShotId && typeof data.byShotId === 'object' ? data.byShotId : {};
  const scriptFromData = Array.isArray(data?.script) ? data?.script : [];
  const normalizedScript = shots.map((shot) => {
    const fromScript = scriptFromData.find((item) => item.shotId === shot.id);
    const fromByShot = byShotId[shot.id];
    return {
      shotId: shot.id,
      text: fromScript?.text || fromByShot?.text || shot.narration || '',
      duration: toNumber(fromScript?.duration ?? fromByShot?.duration ?? fromByShot?.durationSeconds ?? shot.durationSeconds, shot.durationSeconds || 5),
    };
  });

  const nextByShotId = normalizedScript.reduce<Record<string, ShotNarration>>((acc, item) => {
    const current = byShotId[item.shotId] || {};
    acc[item.shotId] = {
      ...current,
      text: item.text,
      duration: item.duration,
      durationSeconds: item.duration,
    };
    return acc;
  }, {});

  const totalDuration = normalizedScript.reduce((sum, item) => sum + toNumber(item.duration, 0), 0);
  const totalChars = normalizedScript.reduce((sum, item) => sum + item.text.length, 0);
  const engine = normalizeEngine(data?.engine);
  const stylePresetId = resolveVoiceStyleId(data);
  const styleOption = getStyleOption(stylePresetId);
  const speedPresetId = resolveSpeedPresetId(data, styleOption.speed);
  const speedOption = getSpeedOption(speedPresetId, data?.speed);
  const chatSpeakerProfile = getChatSpeakerOption(resolveChatSpeakerProfileId(data), data?.speakerSeed ?? data?.speaker_seed);
  const meloVoiceProfile = getMeloVoiceOption(resolveMeloVoiceProfileId(data), data?.voice);
  const openVoiceOption = getOpenVoiceOption(data);

  return {
    ...(data || {}),
    engine,
    language: engine === 'openvoice' ? openVoiceOption.value : 'zh',
    speed: data?.speed ?? speedOption.value,
    pitch: toNumber(data?.pitch, 0),
    emotion: data?.emotion || styleOption.emotion,
    pauses: data?.pauses || styleOption.pauses,
    preset: data?.preset || styleOption.preset,
    referenceUrl: data?.referenceUrl || data?.reference_url || '',
    voice: engine === 'melo'
      ? (data?.voice || meloVoiceProfile.voice)
      : engine === 'openvoice'
        ? openVoiceOption.value
        : data?.voice,
    speakerSeed: toNumber(data?.speakerSeed ?? data?.speaker_seed, chatSpeakerProfile.seed),
    temperature: toNumber(data?.temperature, styleOption.temperature),
    topP: toNumber(data?.topP ?? data?.top_p, styleOption.topP),
    topK: Math.round(toNumber(data?.topK ?? data?.top_k, styleOption.topK)),
    stylePresetId,
    speedPresetId,
    voiceProfileId: engine === 'chattts'
      ? chatSpeakerProfile.id
      : engine === 'melo'
        ? meloVoiceProfile.id
        : openVoiceOption.value,
    byShotId: nextByShotId,
    script: normalizedScript,
    totalDuration,
    totalChars,
  };
}

export const Step6VoiceScript: React.FC<Step6VoiceScriptProps> = ({
  stepId,
  data,
  shots,
  onGenerate,
  onSubmitVoice,
  onUpdate,
  voiceStatus,
  voiceJobId,
  voiceProgress,
  voiceResult,
  voiceManifestUrl,
  voiceAssets,
  onBackfillDurations,
  loading,
  confirmed,
  onConfirm,
}) => {
  const {
    editing,
    setEditing,
    draft,
    setDraft,
    clearEditor,
  } = usePersistentStepEditor<VoiceData>('remotion-step-editor-step6-voice');

  const normalized = useMemo(() => buildDraft(data, shots), [data, shots]);
  const narrationList = normalized.script || [];
  const totalDuration = normalized.totalDuration || narrationList.reduce((sum, item) => sum + toNumber(item.duration, 0), 0);
  const totalChars = normalized.totalChars || narrationList.reduce((sum, item) => sum + item.text.length, 0);

  const current = editing && draft ? draft : normalized;
  const currentScript = current.script || [];
  const currentStyleOption = getStyleOption(resolveVoiceStyleId(current));
  const currentSpeedOption = getSpeedOption(resolveSpeedPresetId(current, currentStyleOption.speed), current.speed);
  const currentChatSpeaker = getChatSpeakerOption(resolveChatSpeakerProfileId(current), current.speakerSeed);
  const currentMeloVoice = getMeloVoiceOption(resolveMeloVoiceProfileId(current), current.voice);
  const currentOpenVoice = getOpenVoiceOption(current);

  const openEditor = () => {
    setDraft(buildDraft(normalized, shots));
    setEditing(true);
  };

  const saveEditor = () => {
    if (!draft) return;
    const nextDraft = buildDraft(draft, shots);
    onUpdate(nextDraft);
    clearEditor();
  };

  const cancelEditor = () => {
    clearEditor();
  };

  const commitDraft = () => {
    if (!editing || !draft) return current;
    const nextDraft = buildDraft(draft, shots);
    onUpdate(nextDraft);
    clearEditor();
    return nextDraft;
  };

  const updateDraft = (patch: Partial<VoiceData>) => {
    setDraft((prev) => buildDraft({...buildDraft(prev || normalized, shots), ...patch}, shots));
  };

  const updateScriptItem = (shotId: string, patch: Partial<VoiceScriptItem>) => {
    setDraft((prev) => {
      const base = buildDraft(prev || normalized, shots);
      const script = (base.script || []).map((item) => item.shotId === shotId ? {...item, ...patch} : item);
      return buildDraft({
        ...base,
        script,
      }, shots);
    });
  };

  const applyStylePreset = (stylePresetId: string) => {
    const option = getStyleOption(stylePresetId);
    updateDraft({
      stylePresetId,
      preset: option.preset,
      emotion: option.emotion,
      pauses: option.pauses,
      speed: option.speed,
      speedPresetId: resolveSpeedPresetId({speed: option.speed}, option.speed),
      temperature: option.temperature,
      topP: option.topP,
      topK: option.topK,
    });
  };

  const applySpeedPreset = (speedPresetId: string) => {
    const option = getSpeedOption(speedPresetId);
    updateDraft({
      speedPresetId,
      speed: option.value,
    });
  };

  const applyChatSpeaker = (voiceProfileId: string) => {
    const option = getChatSpeakerOption(voiceProfileId);
    updateDraft({
      voiceProfileId,
      speakerSeed: option.seed,
      voice: '',
    });
  };

  const applyMeloVoice = (voiceProfileId: string) => {
    const option = getMeloVoiceOption(voiceProfileId);
    updateDraft({
      voiceProfileId,
      voice: option.voice,
      language: 'zh',
    });
  };

  const applyOpenVoice = (languageCode: string) => {
    updateDraft({
      voiceProfileId: languageCode,
      voice: languageCode,
      language: languageCode,
    });
  };

  const handleGenerate = () => {
    if (editing && draft) {
      commitDraft();
    }
    onGenerate();
  };

  const handleSubmitVoice = () => {
    const latest = commitDraft();
    onSubmitVoice(latest);
  };

  const handleConfirm = () => {
    if (editing && draft) {
      commitDraft();
    }
    onConfirm();
  };

  const voiceModeSummary = current.engine === 'chattts'
    ? `${currentChatSpeaker.label} · 采样已按“${currentStyleOption.label}”自动匹配`
    : current.engine === 'melo'
      ? `${currentMeloVoice.label} · 中文快速生成`
      : `${currentOpenVoice.label} · ${current.referenceUrl ? '已接入参考音频' : '未接入参考音频'}`;

  return (
    <div className="wf-step6-root">
      <div className="wf-step5-header">
        <span className="wf-stat-pill">🎙 {narrationList.length} 条配音</span>
        <span className="wf-stat-pill">⏱ {Math.round(totalDuration)}s</span>
        <span className="wf-stat-pill">📝 {totalChars} 字</span>
        {editing ? (
          <>
            <button type="button" className="wf-btn wf-btn-save" onClick={saveEditor}>✓ 保存设置</button>
            <button type="button" className="wf-btn wf-btn-cancel" onClick={cancelEditor}>取消</button>
          </>
        ) : (
          <button type="button" className="wf-btn wf-btn-edit" onClick={openEditor} disabled={loading}>
            调整引擎与脚本
          </button>
        )}
        <button
          type="button"
          className={`wf-btn wf-btn-regenerate ${loading ? 'loading' : ''}`}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? '生成中...' : '重新生成 Step ' + stepId}
        </button>
      </div>

      <div className="wf-voice-engine-section">
        <div className="wf-copy-block-label" style={{marginBottom: 8}}>
          <span>语音引擎</span>
        </div>
        <div className="wf-voice-engine-grid">
          {ENGINE_OPTIONS.map((eng) => (
            <button
              key={eng.value}
              type="button"
              className={`wf-voice-engine-card ${(current.engine || 'chattts') === eng.value ? 'active' : ''}`}
              onClick={() => editing && updateDraft({engine: eng.value})}
              disabled={!editing}
            >
              <div className="wf-engine-name">{eng.label}</div>
              <div className="wf-engine-desc">{eng.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="wf-voice-parameter-grid">
        <div className="wf-copy-block">
          <div className="wf-copy-block-label"><span>中文口播风格</span></div>
          {editing ? (
            <div className="wf-form-stack">
              <div className="wf-voice-option-grid">
                {VOICE_STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`wf-voice-option-card ${resolveVoiceStyleId(current) === option.id ? 'active' : ''}`}
                    onClick={() => applyStylePreset(option.id)}
                  >
                    <div className="wf-engine-name">{option.label}</div>
                    <div className="wf-engine-desc">{option.desc}</div>
                    <div className="wf-copy-keywords">
                      <span className="wf-keyword-tag">{option.emotion}</span>
                      <span className="wf-keyword-tag">{option.pauses}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="wf-copy-block-content">
              <p>{currentStyleOption.label}</p>
              <div className="wf-copy-keywords">
                <span className="wf-keyword-tag">{currentStyleOption.emotion}</span>
                <span className="wf-keyword-tag">{currentStyleOption.pauses}</span>
                <span className="wf-keyword-tag">{currentSpeedOption.label}</span>
              </div>
            </div>
          )}
        </div>

        <div className="wf-copy-block">
          <div className="wf-copy-block-label"><span>中文可选配置</span></div>
          {editing ? (
            <div className="wf-form-stack">
              <div className="wf-control-field">
                <span>语速档位</span>
                <div className="wf-voice-option-grid wf-voice-option-grid-compact">
                  {SPEED_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`wf-voice-option-card ${resolveSpeedPresetId(current, currentStyleOption.speed) === option.id ? 'active' : ''}`}
                      onClick={() => applySpeedPreset(option.id)}
                    >
                      <div className="wf-engine-name">{option.label}</div>
                      <div className="wf-engine-desc">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {(current.engine || 'chattts') === 'chattts' ? (
                <div className="wf-control-field">
                  <span>中文音色</span>
                  <div className="wf-voice-option-grid">
                    {CHATTTS_SPEAKER_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`wf-voice-option-card ${resolveChatSpeakerProfileId(current) === option.id ? 'active' : ''}`}
                        onClick={() => applyChatSpeaker(option.id)}
                      >
                        <div className="wf-engine-name">{option.label}</div>
                        <div className="wf-engine-desc">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {(current.engine || 'chattts') === 'melo' ? (
                <div className="wf-control-field">
                  <span>中文音色</span>
                  <div className="wf-voice-option-grid">
                    {MELO_VOICE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`wf-voice-option-card ${resolveMeloVoiceProfileId(current) === option.id ? 'active' : ''}`}
                        onClick={() => applyMeloVoice(option.id)}
                      >
                        <div className="wf-engine-name">{option.label}</div>
                        <div className="wf-engine-desc">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {(current.engine || 'chattts') === 'openvoice' ? (
                <>
                  <div className="wf-control-field">
                    <span>语言与基础音色</span>
                    <div className="wf-voice-option-grid">
                      {OPENVOICE_VOICE_OPTIONS.map((voice) => (
                        <button
                          key={voice.value}
                          type="button"
                          className={`wf-voice-option-card ${resolveOpenVoiceCode(current) === voice.value ? 'active' : ''}`}
                          onClick={() => applyOpenVoice(voice.value)}
                        >
                          <div className="wf-engine-name">{voice.label}</div>
                          <div className="wf-engine-desc">{voice.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    className="wf-edit-label-input"
                    value={current.referenceUrl || ''}
                    onChange={(event) => updateDraft({referenceUrl: event.target.value})}
                    placeholder="参考音频 URL（用于音色克隆）"
                  />
                </>
              ) : null}

              <div className="wf-voice-config-tip">
                这些中文配置会真实映射到配音引擎参数，不再需要手动调 `Temperature / TopP / TopK`。
              </div>
            </div>
          ) : (
            <div className="wf-copy-block-content">
              <p>当前引擎：{ENGINE_OPTIONS.find((item) => item.value === current.engine)?.label || current.engine || 'ChatTTS'}</p>
              <div className="wf-copy-keywords">
                <span className="wf-keyword-tag">{currentSpeedOption.label}</span>
                <span className="wf-keyword-tag">{voiceModeSummary}</span>
                {current.referenceUrl ? <span className="wf-keyword-tag">参考音频已接入</span> : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {(voiceStatus === 'running' || voiceStatus === 'pending') ? (
        <div className="wf-image-progress-strip">
          <div className="wf-image-progress-head">
            <strong>配音生成中</strong>
            <span>{voiceProgress}%</span>
          </div>
          <div className="wf-image-progress-bar">
            <span style={{width: `${Math.max(4, voiceProgress)}%`}} />
          </div>
          <div className="wf-image-progress-meta">
            <span>正在逐镜生成音频，可继续查看脚本与已完成片段。</span>
          </div>
        </div>
      ) : null}

      <div className="wf-voice-script-list">
        <div className="wf-copy-block-label" style={{marginBottom: 8}}>
          <span>逐镜配音脚本</span>
        </div>
        {currentScript.map((shot, index) => {
          const shotMeta = shots.find((item) => item.id === shot.shotId);
          return (
            <div key={shot.shotId} className="wf-voice-shot-item">
              <div className="wf-voice-shot-header">
                <span className="wf-shot-badge">镜 {index + 1}</span>
                <span className="wf-shot-title">{shotMeta?.title || shot.shotId}</span>
                <span className="wf-shot-duration">~{Math.round(toNumber(shot.duration, shotMeta?.durationSeconds || 5))}s</span>
              </div>
              {editing ? (
                <div className="wf-form-stack">
                  <textarea
                    className="wf-edit-textarea"
                    rows={3}
                    value={shot.text}
                    onChange={(event) => updateScriptItem(shot.shotId, {text: event.target.value})}
                    placeholder="输入这一镜的旁白"
                  />
                  <input
                    type="number"
                    min={1}
                    max={60}
                    step={0.5}
                    className="wf-edit-label-input"
                    value={toNumber(shot.duration, shotMeta?.durationSeconds || 5)}
                    onChange={(event) => updateScriptItem(shot.shotId, {duration: toNumber(event.target.value, shotMeta?.durationSeconds || 5)})}
                  />
                </div>
              ) : (
                <div className="wf-voice-shot-text">
                  {shot.text ? <p>{shot.text}</p> : <p className="wf-empty-narration">— 无配音文本</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="wf-voice-submit-section">
        <button
          type="button"
          className="wf-btn wf-btn-primary"
          onClick={handleSubmitVoice}
          disabled={voiceStatus === 'running' || voiceStatus === 'pending'}
        >
          {voiceStatus === 'running' || voiceStatus === 'pending'
            ? `提交中... ${voiceProgress}%`
            : '提交配音任务'}
        </button>
        {voiceJobId ? <span className="wf-job-id-label">Job ID: {voiceJobId.slice(0, 8)}...</span> : null}
      </div>

      {voiceAssets.length > 0 ? (
        <div className="wf-voice-output-panel">
          <div className="wf-copy-block-label">
            <span>已生成音频资产</span>
            <span className="wf-stat-pill">可直接复用于渲染</span>
          </div>
          <div className="wf-voice-output-summary">
            <div className="wf-summary-item">
              <span className="wf-summary-key">引擎</span>
              <span className="wf-summary-val">{voiceResult?.engineName || current.engine || 'chattts'}</span>
            </div>
            <div className="wf-summary-item">
              <span className="wf-summary-key">音频条数</span>
              <span className="wf-summary-val">{voiceResult?.totalClips || voiceAssets.length}</span>
            </div>
            <div className="wf-summary-item">
              <span className="wf-summary-key">总时长</span>
              <span className="wf-summary-val">{Math.round(voiceResult?.totalDurationSeconds || totalDuration)}s</span>
            </div>
            <div className="wf-summary-item">
              <span className="wf-summary-key">Manifest</span>
              <span className="wf-summary-val">{voiceResult?.manifestFile ? '已生成' : '无'}</span>
            </div>
          </div>
          <div className="wf-inline-actions">
            <button type="button" className="wf-btn" onClick={onBackfillDurations}>
              按配音时长回填镜头
            </button>
            {voiceManifestUrl ? (
              <a className="wf-btn" href={voiceManifestUrl} target="_blank" rel="noreferrer">
                打开 Manifest
              </a>
            ) : null}
          </div>
          <div className="wf-voice-output-list">
            {voiceAssets.map((asset) => (
              <div key={asset.shotId} className="wf-voice-output-item">
                <div className="wf-voice-shot-header">
                  <span className="wf-shot-badge">{asset.title}</span>
                  <span className="wf-shot-duration">{asset.durationSeconds.toFixed(2)}s</span>
                </div>
                <audio controls preload="none" src={asset.url} className="wf-voice-audio" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="wf-inline-actions" style={{marginTop: 12}}>
        <button
          type="button"
          className={`wf-btn wf-btn-confirm ${confirmed ? 'active' : ''}`}
          onClick={handleConfirm}
          disabled={loading}
        >
          {confirmed ? '✓ 已确认配音脚本' : '确认当前配音脚本'}
        </button>
      </div>
    </div>
  );
};
