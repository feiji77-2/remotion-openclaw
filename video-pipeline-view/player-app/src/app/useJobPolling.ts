import {useEffect, useRef} from 'react';
import {callJson} from './pipelineApi';
import {startPollingLoop} from './jobPolling';
import {usePipelineSessionStore} from './pipelineStore';

interface JobStatusResponse {
  status?: string;
  progress?: number;
  progressMsg?: string | null;
  completedAt?: string | null;
  error?: string | null;
  result?: unknown;
}

function resolveJobStatus(raw: string | undefined) {
  if (raw === 'done') return 'done';
  if (raw === 'error') return 'error';
  if (raw === 'running' || raw === 'pending') return raw;
  return 'idle';
}

/** Polls voice job, updates voiceJobResult / voiceJobStatus / voiceProgress. */
export function useVoiceJobPolling(voiceJobId: string | null) {
  const apiBase = usePipelineSessionStore((s) => s.apiBase);
  const apiKey = usePipelineSessionStore((s) => s.apiKey);
  const setVoiceJobResult = usePipelineSessionStore((s) => s.setVoiceJobResult);
  const setVoiceJobStatus = usePipelineSessionStore((s) => s.setVoiceJobStatus);
  const setVoiceProgress = usePipelineSessionStore((s) => s.setVoiceProgress);
  const setErrorMsg = usePipelineSessionStore((s) => s.setErrorMsg);

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!voiceJobId) return;

    cleanupRef.current = startPollingLoop<JobStatusResponse>({
      load: () =>
        callJson(`${apiBase}/api/voice/${voiceJobId}`, {method: 'GET'}, apiKey),
      onData: (data) => {
        const status = resolveJobStatus(data.status);
        setVoiceJobStatus(status);
        setVoiceProgress(Math.min(100, Math.round(Number(data.progress ?? 0) * 100)));
        if (data.result) {
          setVoiceJobResult(data.result as Parameters<typeof setVoiceJobResult>[0]);
        }
        if (status === 'error') {
          setErrorMsg(data.error || '配音任务失败');
        }
      },
      shouldStop: (data) =>
        data.status === 'done' || data.status === 'error',
      intervalMs: 1500,
      maxIntervalMs: 6000,
    });

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [apiBase, apiKey, voiceJobId, setVoiceJobResult, setVoiceJobStatus, setVoiceProgress, setErrorMsg]);
}

/** Polls render job, updates renderJobResult / renderJobStatus / renderProgress. */
export function useRenderJobPolling(renderJobId: string | null) {
  const apiBase = usePipelineSessionStore((s) => s.apiBase);
  const apiKey = usePipelineSessionStore((s) => s.apiKey);
  const setRenderJobResult = usePipelineSessionStore((s) => s.setRenderJobResult);
  const setRenderJobStatus = usePipelineSessionStore((s) => s.setRenderJobStatus);
  const setRenderProgress = usePipelineSessionStore((s) => s.setRenderProgress);
  const setPlaybackResetKey = usePipelineSessionStore((s) => s.setPlaybackResetKey);
  const setErrorMsg = usePipelineSessionStore((s) => s.setErrorMsg);

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!renderJobId) return;

    cleanupRef.current = startPollingLoop<JobStatusResponse>({
      load: () =>
        callJson(`${apiBase}/api/render/${renderJobId}`, {method: 'GET'}, apiKey),
      onData: (data) => {
        const status = resolveJobStatus(data.status);
        setRenderJobStatus(status);
        setRenderProgress(Math.min(100, Math.round(Number(data.progress ?? 0) * 100)));
        if (data.result) {
          setRenderJobResult(data.result as Parameters<typeof setRenderJobResult>[0]);
          // When render finishes, bump playback reset key so preview refreshes
          if (status === 'done') {
            setPlaybackResetKey((k) => k + 1);
          }
        }
        if (status === 'error') {
          setErrorMsg(data.error || '渲染任务失败');
        }
      },
      shouldStop: (data) =>
        data.status === 'done' || data.status === 'error',
      intervalMs: 2000,
      maxIntervalMs: 8000,
    });

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [apiBase, apiKey, renderJobId, setRenderJobResult, setRenderJobStatus, setRenderProgress, setPlaybackResetKey, setErrorMsg]);
}
