/**
 * RenderAPI — 将 Timeline 状态序列化为渲染任务
 * 参照 designcombo 的 export flow
 *
 * 我们的 pipeline:
 *  1. design.toJSON() → IDesign JSON
 *  2. POST /api/render → renderWorker.js
 *  3. poll /api/render/:jobId → 进度
 *  4. 完成 → 返回 outputFile URL
 */
import type { IDesign } from '../types';

const API_BASE = 'http://localhost:3001';

export type RenderStatus = 'pending' | 'running' | 'done' | 'error';

export interface RenderResult {
  jobId: string;
  status: RenderStatus;
  progress: number;
  outputFile?: string;
  voiceFile?: string;
  subtitleFile?: string;
  audioSegments?: Array<{src: string; startFrame: number; durationInFrames: number}>;
  renderMeta?: {
    frameRange?: [number, number] | null;
    durationInFrames?: number | null;
    usedDesignJson?: boolean;
    audioSegmentCount?: number;
    subtitleCueCount?: number;
  };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RenderOptions {
  design: IDesign;
  template?: 'caption' | 'split' | 'fullscreen';
  quality?: 'low' | 'medium' | 'high';
  webhookUrl?: string;
  signal?: AbortSignal;
  frameRange?: [number, number];
  smokeTest?: boolean;
  smokeDurationFrames?: number;
}

// ── 提交渲染任务 ──
export async function submitRender(opts: RenderOptions): Promise<{ jobId: string }> {
  const { design, template = 'caption', quality = 'high' } = opts;

  // 提取配音数据
  const voiceTrack = design.tracks.find((t) => t.type === 'voiceover');
  const narrationParts: string[] = [];
  if (voiceTrack) {
    for (const itemId of voiceTrack.items) {
      const item = design.trackItemsMap[itemId];
      if (item?.details.type === 'voiceover' || item?.details.type === 'audio') {
        if ((item.details as any).scriptText) {
          narrationParts.push((item.details as any).scriptText as string);
        }
      }
    }
  }

  // 提取字幕数据
  const captionTrack = design.tracks.find((t) => t.type === 'caption');
  const subtitleText = captionTrack?.items
    .map((id) => design.trackItemsMap[id]?.details)
    .filter((d) => d?.type === 'caption')
    .map((d) => (d as any).text as string)
    .join(' ');

  const payload = {
    script: narrationParts.join('\n') || 'OpenClaw video',
    template,
    quality,
    projectId: design.id,
    subtitleText,
    // 透传 design JSON（供 renderWorker 使用）
    designJson: design,
    options: {
      frameRange: opts.frameRange,
      smokeTest: opts.smokeTest ?? false,
      smokeDurationFrames: opts.smokeDurationFrames,
    },
  };

  const res = await fetch(`${API_BASE}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: opts.signal,
  });

  if (!res.ok) {
    throw new Error(`Render submission failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return { jobId: data.jobId };
}

// ── 查询渲染状态 ──
export async function queryRenderStatus(jobId: string): Promise<RenderResult> {
  const res = await fetch(`${API_BASE}/api/render/${jobId}`);
  if (!res.ok) {
    throw new Error(`Status query failed: ${res.status}`);
  }
  return res.json();
}

// ── 轮询渲染进度 ──
export async function waitForRender(
  jobId: string,
  onProgress?: (result: RenderResult) => void,
  opts: { signal?: AbortSignal; intervalMs?: number } = {}
): Promise<RenderResult> {
  const { intervalMs = 2000, signal } = opts;

  while (!signal?.aborted) {
    const result = await queryRenderStatus(jobId);
    onProgress?.(result);

    if (result.status === 'done') return result;
    if (result.status === 'error') {
      throw new Error(`Render failed: ${result.error}`);
    }

    await sleep(intervalMs);
  }

  throw new Error('Render polling aborted');
}

// ── 完整渲染流程 ──
export async function renderVideo(
  opts: RenderOptions
): Promise<RenderResult> {
  const { jobId } = await submitRender(opts);
  return waitForRender(jobId, undefined, { signal: opts.signal });
}

// ── 导出 Design 为 JSON（下载）──
export function exportDesignJSON(design: IDesign): void {
  const json = JSON.stringify(design, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${design.name || 'video-design'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 从 JSON 加载 Design ──
export function importDesignJSON(file: File): Promise<IDesign> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data as IDesign);
      } catch (err) {
        reject(new Error('Invalid design JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ── 从 API health 判断服务是否可用 ──
export async function checkAPIStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Helpers ──
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
