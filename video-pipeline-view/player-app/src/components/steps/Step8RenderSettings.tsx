/**
 * Step 8 可视化：渲染设置 + 成片结果
 * 支持模板选择、质量参数、在线预览、新窗口打开、导出到本地
 */

import React from 'react';
import type {JobStatus, RenderJobResult} from '../../workflow/types';

interface RenderData {
  template?: 'caption' | 'split' | 'fullscreen' | 'card-draw';
  quality?: 'low' | 'medium' | 'high';
  fps?: number;
  width?: number;
  height?: number;
  format?: 'mp4' | 'webm' | 'gif';
  codec?: 'h264' | 'h265' | 'vp9';
  bitrate?: number;
  estimatedDuration?: number;
  estimatedSize?: string;
  notes?: string;
}

interface Step8RenderSettingsProps {
  stepId: number;
  data: RenderData | null;
  onGenerate: () => void;
  onSubmitRender: () => void;
  onUpdate: (updated: RenderData) => void;
  renderStatus: JobStatus;
  renderJobId: string | null;
  renderProgress: number;
  renderResult: RenderJobResult | null;
  loading: boolean;
}

const TEMPLATE_OPTIONS: Array<{
  value: NonNullable<RenderData['template']>;
  label: string;
  emoji: string;
  desc: string;
  preview: string;
}> = [
  {
    value: 'caption',
    label: '字幕模板',
    emoji: '📝',
    desc: '底部字幕 + 分镜画面，适合口播内容',
    preview: '16:9 横版视频',
  },
  {
    value: 'split',
    label: '分屏模板',
    emoji: '🖼️',
    desc: '左文右图，适合结构化讲解',
    preview: '16:9 横版视频',
  },
  {
    value: 'fullscreen',
    label: '全屏模板',
    emoji: '🎬',
    desc: '全屏画面 + 底部字幕，适合故事类',
    preview: '9:16 竖版视频',
  },
  {
    value: 'card-draw',
    label: '抽卡模板',
    emoji: '🎰',
    desc: '卡片翻转动画展示',
    preview: '16:9 横版视频',
  },
];

const QUALITY_OPTIONS: Array<{
  value: NonNullable<RenderData['quality']>;
  label: string;
  desc: string;
  badge: string;
}> = [
  {value: 'low', label: '低', desc: '480p · 快速预览', badge: '⚡'},
  {value: 'medium', label: '中', desc: '720p · 平衡', badge: '⚖️'},
  {value: 'high', label: '高', desc: '1080p · 最终输出', badge: '✨'},
];

const FORMAT_OPTIONS: Array<{
  value: NonNullable<RenderData['format']>;
  label: string;
  desc: string;
}> = [
  {value: 'mp4', label: 'MP4', desc: 'H.264，通用兼容'},
  {value: 'webm', label: 'WebM', desc: 'VP9，适合网络'},
  {value: 'gif', label: 'GIF', desc: '动画图，适合预览'},
];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '待完成';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isVideoAsset(url: string | null | undefined) {
  return Boolean(url && /\.(mp4|webm)(\?|#|$)/i.test(url));
}

function isImageAsset(url: string | null | undefined) {
  return Boolean(url && /\.(gif|png|jpe?g|webp)(\?|#|$)/i.test(url));
}

export const Step8RenderSettings: React.FC<Step8RenderSettingsProps> = ({
  stepId,
  data,
  onGenerate,
  onSubmitRender,
  onUpdate,
  renderStatus,
  renderJobId,
  renderProgress,
  renderResult,
  loading,
}) => {
  const template = data?.template || 'caption';
  const quality = data?.quality || 'high';
  const format = data?.format || 'mp4';
  const renderOutputUrl = renderResult?.outputUrl || null;
  const renderDownloadUrl = renderResult?.downloadUrl || null;
  const mediaReady = Boolean(renderResult?.mediaReady && renderOutputUrl);
  const queueSettled = renderStatus === 'done' || renderStatus === 'error';

  const patchRender = (patch: Partial<RenderData>) => {
    onUpdate({
      ...(data || {}),
      template,
      quality,
      format,
      ...patch,
    });
  };

  return (
    <div className="wf-step8-root">
      {!data ? (
        <div className="wf-empty-visual" style={{marginBottom: 16}}>
          <div className="wf-empty-title">渲染设置</div>
          <div className="wf-empty-text">
            选择视频模板和质量级别，点击「重新生成设置」可获得 AI 推荐配置
            <br />
            设置完成后直接点击「提交渲染任务」开始生成视频
          </div>
        </div>
      ) : null}

      <div className="wf-render-section">
        <div className="wf-copy-block-label" style={{marginBottom: 8}}>
          <span>视频模板</span>
          <button
            type="button"
            className={`wf-btn wf-btn-regenerate ${loading ? 'loading' : ''}`}
            onClick={onGenerate}
            disabled={loading}
            style={{marginLeft: 'auto'}}
          >
            {loading ? '生成中...' : `重新生成 Step ${stepId}`}
          </button>
        </div>
        <div className="wf-template-grid">
          {TEMPLATE_OPTIONS.map((tmpl) => (
            <button
              key={tmpl.value}
              className={`wf-template-card ${template === tmpl.value ? 'active' : ''}`}
              type="button"
              onClick={() => patchRender({template: tmpl.value})}
            >
              <div className="wf-template-emoji">{tmpl.emoji}</div>
              <div className="wf-template-name">{tmpl.label}</div>
              <div className="wf-template-desc">{tmpl.desc}</div>
              <div className="wf-template-preview">{tmpl.preview}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="wf-render-section">
        <div className="wf-copy-block-label">
          <span>输出质量</span>
        </div>
        <div className="wf-quality-row">
          {QUALITY_OPTIONS.map((item) => (
            <button
              key={item.value}
              className={`wf-quality-card ${quality === item.value ? 'active' : ''}`}
              type="button"
              onClick={() => patchRender({quality: item.value})}
            >
              <div className="wf-quality-badge">{item.badge}</div>
              <div className="wf-quality-name">{item.label}</div>
              <div className="wf-quality-desc">{item.desc}</div>
            </button>
          ))}
        </div>

        <div className="wf-copy-block-label" style={{marginTop: 16, marginBottom: 8}}>
          <span>输出格式</span>
        </div>
        <div className="wf-format-row">
          {FORMAT_OPTIONS.map((item) => (
            <button
              key={item.value}
              className={`wf-format-card ${format === item.value ? 'active' : ''}`}
              type="button"
              onClick={() => patchRender({format: item.value})}
            >
              <div className="wf-format-name">{item.label}</div>
              <div className="wf-format-desc">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {data ? (
        <div className="wf-render-summary">
          <div className="wf-copy-block-label"><span>参数摘要</span></div>
          <div className="wf-summary-grid">
            {data.width && data.height ? (
              <div className="wf-summary-item">
                <span className="wf-summary-key">分辨率</span>
                <span className="wf-summary-val">{data.width} × {data.height}</span>
              </div>
            ) : null}
            {data.fps ? (
              <div className="wf-summary-item">
                <span className="wf-summary-key">帧率</span>
                <span className="wf-summary-val">{data.fps} fps</span>
              </div>
            ) : null}
            {data.bitrate ? (
              <div className="wf-summary-item">
                <span className="wf-summary-key">码率</span>
                <span className="wf-summary-val">{data.bitrate} kbps</span>
              </div>
            ) : null}
            {data.estimatedDuration ? (
              <div className="wf-summary-item">
                <span className="wf-summary-key">预计时长</span>
                <span className="wf-summary-val">{data.estimatedDuration}s</span>
              </div>
            ) : null}
            {data.estimatedSize ? (
              <div className="wf-summary-item">
                <span className="wf-summary-key">预计大小</span>
                <span className="wf-summary-val">{data.estimatedSize}</span>
              </div>
            ) : null}
          </div>
          {data.notes ? <p className="wf-render-notes">💬 {data.notes}</p> : null}
        </div>
      ) : null}

      <div className="wf-voice-submit-section">
        <button
          type="button"
          className="wf-btn wf-btn-primary"
          onClick={onSubmitRender}
          disabled={renderStatus === 'running' || renderStatus === 'pending'}
        >
          {renderStatus === 'running' || renderStatus === 'pending'
            ? `渲染中... ${renderProgress}%`
            : '🎬 提交渲染任务'}
        </button>
        {renderJobId ? (
          <span className="wf-job-id-label">Job ID: {renderJobId.slice(0, 8)}...</span>
        ) : null}
      </div>

      {renderJobId ? (
        <div className="wf-render-output-panel">
          <div className="wf-copy-block-label">
            <span>渲染结果</span>
            <span className={`mac-status-pill ${renderStatus === 'error' ? 'is-error' : mediaReady ? 'is-done' : renderStatus === 'running' || renderStatus === 'pending' ? 'is-running' : 'is-idle'}`}>
              {renderStatus === 'error'
                ? '渲染失败'
                : mediaReady
                  ? queueSettled ? '成片可用' : '成片已生成'
                  : renderStatus === 'running' || renderStatus === 'pending'
                    ? '正在处理中'
                    : '等待结果'}
            </span>
          </div>

          <div className="wf-summary-grid wf-render-output-summary">
            <div className="wf-summary-item">
              <span className="wf-summary-key">当前任务</span>
              <span className="wf-summary-val">{renderResult?.outputFileName || renderJobId}</span>
            </div>
            <div className="wf-summary-item">
              <span className="wf-summary-key">完成时间</span>
              <span className="wf-summary-val">{formatDateTime(renderResult?.completedAt)}</span>
            </div>
            <div className="wf-summary-item">
              <span className="wf-summary-key">文件大小</span>
              <span className="wf-summary-val">{renderResult?.outputSizeLabel || '生成后显示'}</span>
            </div>
            <div className="wf-summary-item">
              <span className="wf-summary-key">队列反馈</span>
              <span className="wf-summary-val">{renderResult?.progressMsg || (renderStatus === 'running' || renderStatus === 'pending' ? `渲染中 ${renderProgress}%` : '待回执')}</span>
            </div>
          </div>

          {mediaReady ? (
            <>
              <div className="wf-render-player-shell">
                {isVideoAsset(renderOutputUrl) ? (
                  <video
                    className="wf-render-player"
                    src={renderOutputUrl || undefined}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : null}
                {!isVideoAsset(renderOutputUrl) && isImageAsset(renderOutputUrl) ? (
                  <img className="wf-render-image" src={renderOutputUrl || undefined} alt="渲染结果预览" />
                ) : null}
              </div>

              <div className="wf-inline-actions">
                {renderOutputUrl ? (
                  <a
                    className="wf-btn wf-btn-primary"
                    href={renderOutputUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    在线观看 / 新窗口打开
                  </a>
                ) : null}
                {renderDownloadUrl ? (
                  <a className="wf-btn wf-btn-save" href={renderDownloadUrl}>
                    导出到本地
                  </a>
                ) : null}
              </div>

              {!queueSettled ? (
                <p className="wf-render-hint">
                  成片文件已经生成，可以先预览和导出；队列状态仍在同步，稍后会自动刷新为完成。
                </p>
              ) : null}
            </>
          ) : null}

          {!mediaReady && (renderStatus === 'running' || renderStatus === 'pending') ? (
            <div className="wf-render-placeholder">
              <div className="wf-render-progress-bar">
                <span style={{width: `${Math.max(4, renderProgress)}%`}} />
              </div>
              <p>渲染完成后，这里会直接出现在线播放器和导出按钮。</p>
            </div>
          ) : null}

          {renderStatus === 'error' ? (
            <div className="wf-render-error">
              <strong>渲染失败</strong>
              <p>{renderResult?.error || '当前任务未返回详细错误信息，请查看后端日志。'}</p>
            </div>
          ) : null}

          {renderResult?.renderMeta ? (
            <div className="wf-summary-grid wf-render-output-meta">
              {renderResult.renderMeta.durationInFrames ? (
                <div className="wf-summary-item">
                  <span className="wf-summary-key">总帧数</span>
                  <span className="wf-summary-val">{renderResult.renderMeta.durationInFrames}</span>
                </div>
              ) : null}
              {typeof renderResult.renderMeta.audioSegmentCount === 'number' ? (
                <div className="wf-summary-item">
                  <span className="wf-summary-key">复用音轨</span>
                  <span className="wf-summary-val">{renderResult.renderMeta.audioSegmentCount} 段</span>
                </div>
              ) : null}
              {typeof renderResult.renderMeta.subtitleCueCount === 'number' ? (
                <div className="wf-summary-item">
                  <span className="wf-summary-key">字幕片段</span>
                  <span className="wf-summary-val">{renderResult.renderMeta.subtitleCueCount} 条</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

    </div>
  );
};
