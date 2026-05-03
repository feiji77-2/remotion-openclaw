import React from 'react';
import type {ProjectBuildState, StepEvaluation} from '../../app/pipelineTypes';

interface Step7ProjectBuildProps {
  stepId: number;
  data: ProjectBuildState | null;
  evaluation: StepEvaluation | null;
  loading: boolean;
  confirmed: boolean;
  onGenerate: () => void;
  onConfirm: () => void;
  workbenchMode?: boolean;
}

function getBuildTone(buildStatus: string | null | undefined) {
  if (buildStatus === 'ready') return 'is-done';
  if (buildStatus === 'missing' || buildStatus === 'error') return 'is-error';
  return 'is-idle';
}

function getEvalTone(status: string | null | undefined) {
  if (status === 'PASS') return 'is-done';
  if (status === 'PASS_WARN') return 'is-warning';
  if (status === 'RETRY' || status === 'FAIL') return 'is-error';
  return 'is-idle';
}

export const Step7ProjectBuild: React.FC<Step7ProjectBuildProps> = ({
  stepId,
  data,
  evaluation,
  loading,
  confirmed,
  onGenerate,
  onConfirm,
}) => {
  const files = Array.isArray(data?.files) ? data.files : [];

  return (
    <div className="wf-step7-root">
      <div className="wf-step5-header">
        <span className={`mac-status-pill ${getBuildTone(data?.buildStatus)}`}>
          {data?.buildStatus === 'ready' ? '构建就绪' : data?.buildStatus === 'missing' ? '构建缺失' : '待生成'}
        </span>
        {evaluation?.score ? (
          <span className={`mac-status-pill ${getEvalTone(evaluation.status)}`}>
            Eval {evaluation.score}
          </span>
        ) : null}
        <button
          type="button"
          className={`wf-btn wf-btn-regenerate ${loading ? 'loading' : ''}`}
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? '生成中...' : `重新生成 Step ${stepId}`}
        </button>
      </div>

      <div className="wf-summary-grid wf-project-summary-grid">
        <div className="wf-summary-item">
          <span className="wf-summary-key">项目路径</span>
          <span className="wf-summary-val wf-summary-val-path">{data?.projectPath || '待生成'}</span>
        </div>
        <div className="wf-summary-item">
          <span className="wf-summary-key">Composition</span>
          <span className="wf-summary-val">{data?.compositionId || '待生成'}</span>
        </div>
        <div className="wf-summary-item">
          <span className="wf-summary-key">风格预设</span>
          <span className="wf-summary-val">{data?.stylePreset || 'tech-dark'}</span>
        </div>
        <div className="wf-summary-item">
          <span className="wf-summary-key">核心文件</span>
          <span className="wf-summary-val">{files.length} 项</span>
        </div>
      </div>

      <div className="wf-voice-parameter-grid wf-project-grid">
        <div className="wf-copy-block">
          <div className="wf-copy-block-label"><span>项目载体</span></div>
          <div className="wf-copy-block-content">
            <p>{data?.summary || '当前 Step 会复用 remotion-video 工程作为项目载体。'}</p>
            {data?.notes ? <p>{data.notes}</p> : null}
            {files.length > 0 ? (
              <div className="wf-copy-keywords">
                {files.map((file) => (
                  <span key={file} className="wf-keyword-tag">{file.split('/').slice(-2).join('/')}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="wf-copy-block">
          <div className="wf-copy-block-label"><span>构建评估</span></div>
          <div className="wf-copy-block-content">
            <p>状态：{evaluation?.status || '待生成'}</p>
            {evaluation?.issues?.length ? (
              <div className="wf-copy-keywords">
                {evaluation.issues.map((item) => (
                  <span key={item} className="wf-keyword-tag wf-keyword-tag-warn">{item}</span>
                ))}
              </div>
            ) : (
              <p>当前 eval 只做提示，不阻断你继续确认和推进。</p>
            )}
            {evaluation?.suggestions?.length ? (
              <ul className="wf-project-list">
                {evaluation.suggestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <div className="wf-copy-block wf-project-command-block">
        <div className="wf-copy-block-label"><span>渲染命令</span></div>
        <pre className="wf-project-command">{data?.renderCommand || '待生成 render command'}</pre>
      </div>

      <div className="wf-confirm-row">
        <div className="wf-confirm-note">
          {confirmed
            ? '当前 Remotion 项目构建结果已确认。'
            : '确认当前项目构建后，再进入 Step 8 做最终渲染设置。'}
        </div>
        <button
          type="button"
          className={`wf-btn wf-btn-confirm ${confirmed ? 'confirmed' : ''}`}
          onClick={onConfirm}
          disabled={loading || !data?.compositionId}
        >
          {confirmed ? '✓ 已确认项目构建' : '确认当前项目构建'}
        </button>
      </div>
    </div>
  );
};
