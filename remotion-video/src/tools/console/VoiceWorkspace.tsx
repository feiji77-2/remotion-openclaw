import React, {useEffect, useMemo, useRef, useState} from 'react';
import {artifactUrl} from './api';
import {RunProgressTrace} from './RenderWorkspace';
import type {DraftScript, RunnerJob} from './types';

export interface VoiceWorkspaceAudio {
  src: string;
  path?: string;
  fileName?: string;
  size?: number;
  contentType?: string;
  source?: 'tts' | 'upload' | 'project';
  updatedAt?: string;
}

interface VoiceWorkspaceProps {
  draft: DraftScript;
  dirty: boolean;
  writable: boolean;
  runnerOnline: boolean;
  saving: boolean;
  currentAudio: VoiceWorkspaceAudio | null;
  activeJob: RunnerJob | null;
  recentJob?: RunnerJob | null;
  onSynthesize: () => void | Promise<void>;
  onUploadAudio: (file: File) => boolean | Promise<boolean>;
  onDeleteAudio: () => void | Promise<void>;
}

const voiceCommandIds = new Set(['build-check', 'build-check-audio']);

const formatBytes = (value: number | undefined) => {
  if (!value || value <= 0) return '未知大小';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
};

const audioUrlFor = (audio: VoiceWorkspaceAudio | null) => {
  if (!audio?.src) return null;
  if (/^https?:\/\//i.test(audio.src)) return audio.src;
  return artifactUrl(audio.src.startsWith('public/') ? audio.src : `public/${audio.src}`);
};

const sourceLabel = (source: VoiceWorkspaceAudio['source']) => {
  if (source === 'upload') return '上传音频';
  if (source === 'tts') return '语音合成';
  return '项目音轨';
};

const voicePartialFailureCopy = (job: RunnerJob | null) => {
  if (!job || job.status !== 'failed') return null;
  const failedStep = job.steps.find((step) => step.status === 'failed');
  if (failedStep?.id !== 'check') return null;
  const audioReady = job.commandId === 'build-check-audio' || job.steps.some((step) => step.id === 'tts' && step.status === 'done');
  if (!audioReady) return null;
  return '配音文件已经生成并接入当前项目；后续分镜合同检查失败，所以暂时不能继续渲染关键帧或成片。';
};

const voiceRunningCopy = (job: RunnerJob | null, fallback: string) => {
  if (!job || job.status !== 'running') return fallback;
  if (job.currentStep === 'tts') return '正在合成语音';
  if (job.currentStep === 'align-captions') return '正在对齐字幕';
  if (job.currentStep === 'rebuild') return '正在生成分镜';
  if (job.currentStep === 'check') return '正在检查合同';
  return fallback;
};

export const VoiceWorkspace: React.FC<VoiceWorkspaceProps> = ({
  draft,
  dirty,
  writable,
  runnerOnline,
  saving,
  currentAudio,
  activeJob,
  recentJob = null,
  onSynthesize,
  onUploadAudio,
  onDeleteAudio,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const scriptReady = draft.script.trim().length >= 20;
  const canRun = writable && runnerOnline && !saving && scriptReady && !dirty;
  const currentAudioUrl = audioUrlFor(currentAudio);
  const traceJob = activeJob && voiceCommandIds.has(activeJob.commandId)
    ? activeJob
    : recentJob && voiceCommandIds.has(recentJob.commandId)
      ? recentJob
      : null;
  const partialFailureCopy = voicePartialFailureCopy(traceJob);

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const chooseFile = (file: File | null | undefined) => {
    if (!file) return;
    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile) return;
    if (await onUploadAudio(selectedFile)) clearSelectedFile();
  };

  const dropFile = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (saving) return;
    chooseFile(event.dataTransfer.files.item(0));
  };

  return <div className="workspace-panel voice-workspace">
    <div className="workspace-heading">
      <div><span className="workspace-kicker">02 / 语音生产</span><h1>语音</h1></div>
      <span className={`state-chip ${currentAudio ? 'is-current' : dirty ? 'is-stale' : 'is-missing'}`}>{currentAudio ? '已有音轨' : dirty ? '口播未保存' : '未生成'}</span>
    </div>
    <p className="workspace-copy">手动选择合成配音或上传现成音频；未点击前不会启动语音任务。</p>
    {!writable && <div className="notice notice--neutral">样例项目为只读输入。新建视频后可以合成或上传音频。</div>}
    {!scriptReady && <div className="notice notice--neutral">口播稿至少需要 20 个字符，语音页才能开始生产。</div>}
    {dirty && <div className="notice notice--neutral">请先返回口播文案页保存内容。</div>}
    {!runnerOnline && <div className="notice notice--error">本地执行器离线，暂时不能启动语音任务。</div>}
    {partialFailureCopy && <div className="notice notice--neutral">{partialFailureCopy}</div>}

    <section className="voice-status">
      <div className="voice-status__copy">
        <small>当前音轨</small>
        <strong>{currentAudio?.fileName || (currentAudio ? 'voiceover' : '等待语音')}</strong>
        <span>{currentAudio ? `${sourceLabel(currentAudio.source)} · ${formatBytes(currentAudio.size)}${currentAudio.contentType ? ` · ${currentAudio.contentType}` : ''}` : '合成或上传后，这里会显示可试听音频。'}</span>
      </div>
      <div className="voice-status__media">
        {currentAudioUrl ? <audio controls src={currentAudioUrl} /> : <div className="voice-status__empty">暂无可试听音频</div>}
        {currentAudio && <button className="secondary-action voice-delete-action" type="button" disabled={!writable || saving} onClick={() => void onDeleteAudio()}>删除音频</button>}
      </div>
    </section>

    <div className="voice-actions-grid">
      <section className="voice-action-panel">
        <div>
          <span className="voice-action-panel__icon is-synth" aria-hidden="true"><i /><i /><i /></span>
          <strong>自动语音合成</strong>
          <p>使用后端默认音色合成口播，并按音频对齐字幕时间。</p>
        </div>
        <button className="primary-action" type="button" disabled={!canRun} onClick={() => void onSynthesize()}>
          {saving && activeJob?.commandId === 'build-check' ? <><i className="action-spinner" aria-hidden="true" />{voiceRunningCopy(activeJob, '正在合成语音')}</> : '合成语音'}
        </button>
      </section>

      <section className="voice-action-panel">
        <div>
          <span className="voice-action-panel__icon is-upload" aria-hidden="true"><i /><i /></span>
          <strong>上传已有音频</strong>
          <p>支持 m4a、mp3、wav、aac、ogg、webm。上传后按音频重新对齐字幕。</p>
        </div>
        <label
          className={`voice-upload__drop ${dragging ? 'is-dragging' : ''} ${saving ? 'is-disabled' : ''}`}
          onDragOver={(event) => { event.preventDefault(); if (!saving) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={dropFile}
        >
          <input
            accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg,.webm"
            className="voice-upload__input"
            disabled={saving}
            onChange={(event) => chooseFile(event.currentTarget.files?.item(0))}
            ref={inputRef}
            type="file"
          />
          <strong>{selectedFile ? selectedFile.name : '点击或拖入音频'}</strong>
          <span>{selectedFile ? `${formatBytes(selectedFile.size)} · ${selectedFile.type || 'audio'}` : '文件会保存到当前项目素材目录'}</span>
        </label>
        {localPreviewUrl && <div className="voice-upload__preview"><audio controls src={localPreviewUrl} /></div>}
        <div className="voice-upload__controls">
          <button className="secondary-action voice-delete-action" type="button" disabled={!selectedFile || saving} onClick={clearSelectedFile}>删除音频</button>
          <button className="primary-action" type="button" disabled={!canRun || !selectedFile} onClick={() => void uploadSelectedFile()}>
            {saving && activeJob?.commandId === 'build-check-audio' ? <><i className="action-spinner" aria-hidden="true" />{voiceRunningCopy(activeJob, '正在处理音频')}</> : '上传并处理音频'}
          </button>
        </div>
      </section>
    </div>

    {traceJob && <RunProgressTrace job={traceJob} title={traceJob.commandId === 'build-check-audio' ? '上传音频生产' : '语音合成生产'} />}
  </div>;
};
