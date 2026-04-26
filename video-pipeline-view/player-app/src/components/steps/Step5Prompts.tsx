/**
 * Step 5 可视化：视觉提示词与生成进度
 */

import React, {useMemo, useState} from 'react';
import type {JobStatus} from '../../workflow/types';
import {usePersistentStepEditor} from './usePersistentStepEditor';

interface ShotPrompt {
  shotId?: string;
  shotTitle?: string;
  prompt?: string;
  promptZh?: string;
  visualSummaryZh?: string;
  visualFocusZh?: string;
  negativePrompt?: string;
  negativePromptZh?: string;
  style?: string;
  mood?: string;
  visualFocus?: string;
  dataPoints?: string[];
  dataHighlightsZh?: string[];
  comparisonSummaryZh?: string;
  keywords?: string[];
  seed?: number;
  imageUrl?: string;
  status?: 'pending' | 'generating' | 'done' | 'error';
  visual?: {
    description?: string;
    focus?: string;
    [key: string]: any;
  };
}

interface PromptShotMeta {
  id: string;
  title: string;
  durationSeconds?: number;
  level?: string;
  narration?: string;
  visual?: {
    description?: string;
    focus?: string;
  };
}

interface PromptsData {
  byShotId?: Record<string, ShotPrompt>;
  shots?: PromptShotMeta[];
  total?: number;
}

interface ImageData {
  urls?: Array<{shotId: string; url: string}>;
  jobId?: string | null;
  status?: JobStatus | string;
  progress?: number;
  progressMsg?: string | null;
  total?: number;
  completed?: number;
  currentShotId?: string | null;
  currentShotTitle?: string | null;
  byShotStatus?: Record<string, string>;
  error?: string | null;
}

interface Step5PromptsProps {
  stepId: number;
  data: PromptsData | null;
  imageData?: ImageData | null;
  onGenerate?: () => void;
  onGenerateImages?: () => void;
  onUpdate?: (updated: PromptsData) => void;
  imageStatus?: JobStatus | 'generating';
  imageCount?: number;
  loading: boolean;
  confirmed: boolean;
  onConfirm: () => void;
  workbenchMode?: boolean;
}

function looksMostlyEnglish(text?: string) {
  const safe = String(text || '').trim();
  if (!safe) return false;
  const asciiChars = safe.match(/[A-Za-z]/g)?.length || 0;
  return asciiChars >= Math.max(8, Math.floor(safe.length * 0.35));
}

function getPromptSummary(prompt: ShotPrompt, shot: PromptShotMeta) {
  const explicitSummary = prompt.visualSummaryZh || prompt.promptZh || prompt.visual?.description || shot.visual?.description;
  if (explicitSummary) return explicitSummary;
  if (prompt.prompt && !looksMostlyEnglish(prompt.prompt)) return prompt.prompt;
  if (shot.narration) return `围绕这段场景内容生成 16:9 横版画面：${shot.narration}`;
  return '当前场景已生成可用画面提示，可直接继续出图。';
}

function getPromptFocus(prompt: ShotPrompt, shot: PromptShotMeta) {
  return prompt.visualFocusZh || prompt.visualFocus || prompt.visual?.focus || shot.visual?.focus || '';
}

function getPromptAvoid(prompt: ShotPrompt) {
  if (prompt.negativePromptZh) return prompt.negativePromptZh;
  if (!prompt.negativePrompt || looksMostlyEnglish(prompt.negativePrompt)) return '';
  return prompt.negativePrompt;
}

function getPromptStatus(status: string) {
  if (status === 'done') return '已生成';
  if (status === 'generating') return '生成中';
  if (status === 'error') return '生成失败';
  return '待生成';
}

export const Step5Prompts: React.FC<Step5PromptsProps> = ({
  stepId,
  data,
  imageData,
  onGenerate,
  onGenerateImages,
  onUpdate,
  imageStatus = 'idle',
  imageCount = 0,
  loading,
  confirmed,
  onConfirm,
  workbenchMode = false,
}) => {
  const {
    editing,
    setEditing,
    draft,
    setDraft,
    clearEditor,
  } = usePersistentStepEditor<Record<string, ShotPrompt>>('remotion-step-editor-step5-prompts');
  const [lightbox, setLightbox] = useState<{url: string; title: string} | null>(null);

  const shots = useMemo<PromptShotMeta[]>(() => {
    if (!data) return [];
    if (Array.isArray(data.shots) && data.shots.length > 0) return data.shots;
    if (data.byShotId) {
      return Object.entries(data.byShotId).map(([id, prompt]) => ({
        id,
        title: prompt?.shotTitle || prompt?.shotId || id,
      }));
    }
    return [];
  }, [data]);

  const imageMap = useMemo(() => {
    if (!imageData?.urls) return {};
    return Object.fromEntries(imageData.urls.map((entry) => [entry.shotId, entry.url]));
  }, [imageData?.urls]);

  const hasContent = Boolean(data && (shots.length > 0 || (data.byShotId && Object.keys(data.byShotId).length > 0)));
  const currentImageStatus = String(imageData?.status || imageStatus || 'idle');
  const isImageGenerating = currentImageStatus === 'pending' || currentImageStatus === 'running';
  const progress = Math.max(0, Math.min(100, Number(imageData?.progress) || 0));
  const total = Number(imageData?.total) || shots.length;
  const completed = Number(imageData?.completed) || imageCount;

  if (!hasContent) {
    return (
      <div className="wf-empty-visual">
        <div className="wf-empty-title">视觉场景工作台</div>
        <div className="wf-empty-text">
          先生成 Step 5 结果，再批量出图。<br />
          这里会直接显示中文画面内容、图片进度和每个场景的状态。
        </div>
      </div>
    );
  }

  const promptEntries = shots.map((shot) => ({
    shot,
    prompt: data?.byShotId?.[shot.id] || {},
  }));

  return (
    <div className="wf-step5-root">
      <div className="wf-step5-header">
        <span className="wf-stat-pill">🎬 {shots.length} 个镜头</span>
        <span className="wf-stat-pill">🖼 {completed}/{total || shots.length} 张</span>
        {imageData?.currentShotTitle ? (
          <span className="wf-stat-pill is-accent">当前：{imageData.currentShotTitle}</span>
        ) : null}
        {editing ? (
          <button
            type="button"
            className="wf-btn wf-btn-save"
            onClick={() => {
              onUpdate?.({...data, byShotId: draft || {}});
              clearEditor();
            }}
          >
            ✓ 保存修改
          </button>
        ) : (
          <button
            type="button"
            className="wf-btn wf-btn-edit"
            onClick={() => {
              const nextDraft: Record<string, ShotPrompt> = {};
              shots.forEach((shot) => {
                nextDraft[shot.id] = {...(data?.byShotId?.[shot.id] || {})};
              });
              setDraft(nextDraft);
              setEditing(true);
            }}
            disabled={loading || shots.length === 0}
          >
            ✏️ 编辑提示词
          </button>
        )}
        {!editing && !workbenchMode ? (
          <button
            type="button"
            className={`wf-btn wf-btn-regenerate ${loading ? 'loading' : ''}`}
            onClick={onGenerate}
            disabled={loading}
          >
            {loading ? '生成中…' : `重新生成 Step ${stepId}`}
          </button>
        ) : null}
        <button
          type="button"
          className={`wf-btn ${currentImageStatus === 'done' ? 'wf-btn-primary' : ''}`}
          onClick={onGenerateImages}
          disabled={isImageGenerating || loading}
        >
          {isImageGenerating ? '图片生成中…' : currentImageStatus === 'done' ? '重新生成图片' : '生成分镜图'}
        </button>
      </div>

      {(imageData?.jobId || isImageGenerating || imageData?.error) ? (
        <div className={`wf-image-progress-strip ${currentImageStatus === 'error' ? 'is-error' : ''}`}>
          <div className="wf-image-progress-head">
            <strong>{currentImageStatus === 'error' ? '出图失败' : isImageGenerating ? '分镜图生成中' : '分镜图已完成'}</strong>
            <span>{completed}/{total || shots.length}</span>
          </div>
          <div className="wf-image-progress-bar">
            <span style={{width: `${progress}%`}} />
          </div>
          <div className="wf-image-progress-meta">
            <span>{imageData?.progressMsg || (isImageGenerating ? '正在准备图片任务' : '图片已就绪')}</span>
            {imageData?.currentShotTitle ? <span>当前镜头：{imageData.currentShotTitle}</span> : null}
            {imageData?.error ? <span>{imageData.error}</span> : null}
          </div>
        </div>
      ) : null}

      <div className="wf-prompt-grid">
        {promptEntries.map(({shot, prompt}, index) => {
          const imgUrl = imageMap[shot.id] || prompt.imageUrl;
          const status = (imageData?.byShotStatus?.[shot.id] || prompt.status || (imgUrl ? 'done' : 'pending')) as string;
          const summaryText = getPromptSummary(prompt, shot);
          const focusText = getPromptFocus(prompt, shot);
          const avoidText = getPromptAvoid(prompt);

          return (
            <div key={shot.id} className={`wf-prompt-card ${status === 'done' ? 'wf-card-done' : ''}`}>
              <div className="wf-prompt-shot-header">
                <span className="wf-shot-badge">镜 {index + 1}</span>
                <span className="wf-shot-title">{shot.title || shot.id}</span>
                {shot.durationSeconds ? <span className="wf-shot-duration">{shot.durationSeconds}s</span> : null}
              </div>

              <div className="wf-prompt-image-area">
                {imgUrl ? (
                  <button
                    type="button"
                    className="wf-prompt-image-btn"
                    onClick={() => setLightbox({
                      url: imgUrl,
                      title: shot.title || `镜头 ${index + 1}`,
                    })}
                    title="点击放大"
                  >
                    <img src={imgUrl} alt={shot.title} className="wf-prompt-image" />
                    <span className="wf-prompt-zoom-tip">点击放大</span>
                  </button>
                ) : (
                  <div className={`wf-prompt-image-placeholder ${status === 'generating' ? 'is-running' : ''}`}>
                    <span>🖼</span>
                    <small>{getPromptStatus(status)}</small>
                  </div>
                )}
              </div>

              <div className="wf-prompt-text">
                <div className="wf-prompt-label">画面内容</div>
                {editing ? (
                  <textarea
                    className="wf-edit-textarea"
                    value={draft?.[shot.id]?.prompt || ''}
                    onChange={(event) => setDraft((prev) => ({
                      ...(prev || {}),
                      [shot.id]: {
                        ...(prev?.[shot.id] || {}),
                        prompt: event.target.value,
                      },
                    }))}
                    placeholder="输入图片生成 prompt..."
                    rows={4}
                  />
                ) : (
                  <p className="wf-prompt-content">{summaryText || '—'}</p>
                )}
              </div>

              {!editing && focusText ? (
                <div className="wf-prompt-text wf-prompt-subtext">
                  <div className="wf-prompt-label">视觉重点</div>
                  <p>{focusText}</p>
                </div>
              ) : null}

              {editing ? (
                <div className="wf-prompt-text wf-negative">
                  <div className="wf-prompt-label">避错提示</div>
                  <textarea
                    className="wf-edit-textarea"
                    value={draft?.[shot.id]?.negativePrompt || ''}
                    onChange={(event) => setDraft((prev) => ({
                      ...(prev || {}),
                      [shot.id]: {
                        ...(prev?.[shot.id] || {}),
                        negativePrompt: event.target.value,
                      },
                    }))}
                    placeholder="输入避错提示..."
                    rows={2}
                  />
                </div>
              ) : avoidText ? (
                <div className="wf-prompt-text wf-negative">
                  <div className="wf-prompt-label">避错提示</div>
                  <p>{avoidText}</p>
                </div>
              ) : null}

              {prompt.comparisonSummaryZh ? (
                <div className="wf-prompt-text wf-prompt-subtext">
                  <div className="wf-prompt-label">对比关系</div>
                  <p>{prompt.comparisonSummaryZh}</p>
                </div>
              ) : null}

              <div className="wf-prompt-tags">
                {prompt.style ? <span className="wf-keyword-tag">{prompt.style}</span> : null}
                {prompt.mood ? <span className="wf-keyword-tag">{prompt.mood}</span> : null}
                {prompt.seed !== undefined ? <span className="wf-keyword-tag">种子 {prompt.seed}</span> : null}
                {(prompt.keywords || []).slice(0, 3).map((keyword) => (
                  <span key={keyword} className="wf-keyword-tag">{keyword}</span>
                ))}
              </div>

              <div className="wf-prompt-status">
                <span className={`wf-status-dot wf-status-${status}`} />
                <small>{getPromptStatus(status)}</small>
              </div>
            </div>
          );
        })}
      </div>

      <div className="wf-inline-actions" style={{marginTop: 16}}>
        {editing ? (
          <button type="button" className="wf-btn wf-btn-cancel" onClick={clearEditor}>
            ✕ 取消编辑
          </button>
        ) : !workbenchMode ? (
          <button
            type="button"
            className={`wf-btn wf-btn-confirm ${confirmed ? 'active' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmed ? '✓ 已确认提示词' : '确认当前提示词'}
          </button>
        ) : null}
      </div>

      {lightbox ? (
        <div className="wf-lightbox" onClick={() => setLightbox(null)} role="presentation">
          <div className="wf-lightbox-dialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="wf-lightbox-head">
              <strong>{lightbox.title}</strong>
              <button type="button" className="wf-btn wf-lightbox-close" onClick={() => setLightbox(null)}>
                关闭
              </button>
            </div>
            <img src={lightbox.url} alt={lightbox.title} className="wf-lightbox-image" />
          </div>
        </div>
      ) : null}
    </div>
  );
};
